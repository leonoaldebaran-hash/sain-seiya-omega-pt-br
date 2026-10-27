# Renders Portuguese labels onto texture PNGs.
#   powershell -File tools/render.ps1 <jobs.json>
# jobs.json: array of
#   { "out": "...png", "w": 128, "h": 32, "base": "...png" (optional, original texture),
#     "clear": [[x,y,w,h], ...]   (made transparent)
#     "fill":  [[x,y,w,h,"#RRGGBBAA"], ...],
#     "texts": [{ "t": "Texto", "x":0, "y":0, "w":128, "h":16, "font":"Arial", "size":12,
#                 "bold":true, "align":"center|left|right", "fill":["#top","#bottom"],
#                 "outline":"#RRGGBB", "ow":2, "outline2":"#RRGGBB", "ow2":4 }] }
# Text that does not fit is shrunk (down to 70%) and then squeezed horizontally.
param([string]$jobs)
Add-Type -AssemblyName System.Drawing

function Col([string]$h) {
  $h = $h.TrimStart('#')
  $a = 255
  if ($h.Length -eq 8) { $a = [Convert]::ToInt32($h.Substring(6, 2), 16) }
  return [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($h.Substring(0, 2), 16), [Convert]::ToInt32($h.Substring(2, 2), 16), [Convert]::ToInt32($h.Substring(4, 2), 16))
}

$list = Get-Content -Raw -Encoding UTF8 $jobs | ConvertFrom-Json
foreach ($j in $list) {
  $bmp = New-Object System.Drawing.Bitmap ([int]$j.w), ([int]$j.h), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($j.base) {
    $src = [System.Drawing.Image]::FromFile($j.base)
    $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
    $src.Dispose()
  }
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  foreach ($c in @($j.clear)) { if ($c) { $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Transparent)), $c[0], $c[1], $c[2], $c[3]) } }
  foreach ($c in @($j.fill)) { if ($c) { $g.FillRectangle((New-Object System.Drawing.SolidBrush (Col $c[4])), $c[0], $c[1], $c[2], $c[3]) } }
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

  # "lerp": [[x0,y0,x1,y1], ...] erase old text inside the box by interpolating each row
  # between the pixels just outside its left and right edges (keeps gradients)
  if ($j.lerp) {
    $g.Flush()
    foreach ($r in @($j.lerp)) {
      $x0 = [Math]::Max([int]$r[0], 0); $y0 = [Math]::Max([int]$r[1], 0)
      $x1 = [Math]::Min([int]$r[2], $bmp.Width - 1); $y1 = [Math]::Min([int]$r[3], $bmp.Height - 1)
      for ($y = $y0; $y -le $y1; $y++) {
        $L = $bmp.GetPixel([Math]::Max($x0 - 1, 0), $y)
        $R = $bmp.GetPixel([Math]::Min($x1 + 1, $bmp.Width - 1), $y)
        for ($x = $x0; $x -le $x1; $x++) {
          $f = ($x - $x0 + 1) / ($x1 - $x0 + 2)
          $c = [System.Drawing.Color]::FromArgb([int]($L.A + ($R.A - $L.A) * $f), [int]($L.R + ($R.R - $L.R) * $f), [int]($L.G + ($R.G - $L.G) * $f), [int]($L.B + ($R.B - $L.B) * $f))
          $bmp.SetPixel($x, $y, $c)
        }
      }
    }
  }

  # "darken": [[x0,y0,x1,y1], ...] paint every light pixel black, keeping alpha (white ink on black brush)
  if ($j.darken) {
    $g.Flush()
    foreach ($r in @($j.darken)) {
      for ($y = [int]$r[1]; $y -le [int]$r[3]; $y++) {
        for ($x = [int]$r[0]; $x -le [int]$r[2]; $x++) {
          $c = $bmp.GetPixel($x, $y)
          if ($c.A -gt 0 -and ($c.R + $c.G + $c.B) -gt 60) { $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, 0, 0, 0)) }
        }
      }
    }
  }

  # Button guide bar: keep the original icons, re-lay the words right-aligned.
  # guide: { items: [[iconX0, iconX1, "word"], ...], size, y (text box y), h (text box h) }
  if ($j.guide) {
    $src = [System.Drawing.Bitmap]::FromFile($j.base)
    $gd = $j.guide
    $items = @($gd.items)
    $firstIcon = [int]$items[0][0]
    # leftmost opaque column = start of the bar's slanted end
    $barStart = 0
    :find for ($x = 0; $x -lt $src.Width; $x++) { for ($y = 0; $y -lt $src.Height; $y++) { if ($src.GetPixel($x, $y).A -gt 40) { $barStart = $x; break find } } }
    $cleanX = [Math]::Max($barStart + 1, $firstIcon - 2)
    $family = New-Object System.Drawing.FontFamily 'Arial Narrow'
    $fmt = [System.Drawing.StringFormat]::GenericTypographic
    $size = [single]$gd.size
    $gapIT = 2; $gapTI = 5; $right = $src.Width - 3
    for ($k = 0; $k -lt 10; $k++) {
      $total = 0
      $paths = @()
      foreach ($it in $items) {
        $p = New-Object System.Drawing.Drawing2D.GraphicsPath
        $p.AddString([string]$it[2], $family, [int][System.Drawing.FontStyle]::Bold, $size, (New-Object System.Drawing.PointF 0, 0), $fmt)
        $paths += $p
        $total += ($it[1] - $it[0] + 1) + $gapIT + $p.GetBounds().Width + $gapTI
      }
      $total -= $gapTI
      if ($right - $total -ge 2) { break }
      $size *= 0.93
    }
    $start = [int]($right - $total)
    $g.Clear([System.Drawing.Color]::Transparent)
    $outlineCol = [System.Drawing.Color]::FromArgb(200, 0, 0, 0)
    if ($gd.nobar) {
      # floating icon + text (story guides): left aligned, navy outline
      $start = $firstIcon
      $outlineCol = [System.Drawing.Color]::FromArgb(255, 28, 36, 72)
    } else {
      $capW = $cleanX - $barStart
      $newStart = [Math]::Min($barStart, $start - 4 - $capW)
      if ($newStart -lt 0) { $newStart = 0 }
      # bar: slanted cap, then the clean column stretched to the right edge
      $g.DrawImage($src, (New-Object System.Drawing.Rectangle $newStart, 0, $capW, $src.Height), (New-Object System.Drawing.Rectangle $barStart, 0, $capW, $src.Height), [System.Drawing.GraphicsUnit]::Pixel)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $g.DrawImage($src, (New-Object System.Drawing.Rectangle ($newStart + $capW), 0, ($src.Width - $newStart - $capW), $src.Height), (New-Object System.Drawing.Rectangle $cleanX, 0, 1, $src.Height), [System.Drawing.GraphicsUnit]::Pixel)
    }
    $x = $start
    $ty = if ($gd.y) { [single]$gd.y } else { 0 }
    $th = if ($gd.h) { [single]$gd.h } else { $src.Height }
    for ($k = 0; $k -lt $items.Count; $k++) {
      $it = $items[$k]
      $iw = $it[1] - $it[0] + 1
      $g.DrawImage($src, (New-Object System.Drawing.Rectangle $x, 0, $iw, $src.Height), (New-Object System.Drawing.Rectangle $it[0], 0, $iw, $src.Height), [System.Drawing.GraphicsUnit]::Pixel)
      $x += $iw + $gapIT
      $p = $paths[$k]
      $b = $p.GetBounds()
      $m = New-Object System.Drawing.Drawing2D.Matrix
      $m.Translate($x - $b.X, $ty + ($th - $b.Height) / 2 - $b.Y)
      $p.Transform($m)
      $pen = New-Object System.Drawing.Pen $outlineCol, 2
      $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
      $g.DrawPath($pen, $p)
      $g.FillPath([System.Drawing.Brushes]::White, $p)
      $x += $b.Width + $gapTI
    }
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $src.Dispose()
  }

  foreach ($t in @($j.texts)) {
    if (-not $t) { continue }
    $fontName = if ($t.font) { $t.font } else { 'Arial' }
    $style = if ($t.bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    if ($t.italic) { $style = $style -bor [System.Drawing.FontStyle]::Italic }
    $family = New-Object System.Drawing.FontFamily $fontName
    $size = [single]$t.size
    $ow = if ($t.ow) { [single]$t.ow } else { 0 }
    $ow2 = if ($t.ow2) { [single]$t.ow2 } else { 0 }
    $pad = [Math]::Max($ow, $ow2)
    $fmt = [System.Drawing.StringFormat]::GenericTypographic
    $fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
    # shrink until it fits the box (keeping room for the outline)
    for ($i = 0; $i -lt 12; $i++) {
      $path = New-Object System.Drawing.Drawing2D.GraphicsPath
      $path.AddString([string]$t.t, $family, [int]$style, $size, (New-Object System.Drawing.PointF 0, 0), $fmt)
      $b = $path.GetBounds()
      if (($b.Width + 2 * $pad) -le $t.w -and ($b.Height + 2 * $pad) -le $t.h) { break }
      if ($size -le [single]$t.size * 0.7) { break }
      $size = $size * 0.95
      $path.Dispose()
    }
    $b = $path.GetBounds()
    $sx = 1.0
    if (($b.Width + 2 * $pad) -gt $t.w) { $sx = ($t.w - 2 * $pad) / $b.Width }
    $sy = 1.0
    if (($b.Height + 2 * $pad) -gt $t.h) { $sy = ($t.h - 2 * $pad) / $b.Height }
    $w = $b.Width * $sx
    $x = switch ($t.align) { 'left' { $t.x + $pad } 'right' { $t.x + $t.w - $pad - $w } default { $t.x + ($t.w - $w) / 2 } }
    $y = $t.y + ($t.h - $b.Height * $sy) / 2
    $m = New-Object System.Drawing.Drawing2D.Matrix
    $m.Translate($x, $y)
    $m.Scale($sx, $sy)
    $m.Translate(-$b.X, -$b.Y)
    $path.Transform($m)
    $nb = $path.GetBounds()
    if ($t.shadow) {
      $sp = $path.Clone()
      $sm = New-Object System.Drawing.Drawing2D.Matrix
      $sm.Translate([single]$t.sdx, [single]$t.sdy)
      $sp.Transform($sm)
      $pen = New-Object System.Drawing.Pen (Col $t.shadow), ([Math]::Max($ow, 1) * 2)
      $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
      $g.DrawPath($pen, $sp)
      $g.FillPath((New-Object System.Drawing.SolidBrush (Col $t.shadow)), $sp)
      $sp.Dispose()
    }
    if ($t.outline2) {
      $pen = New-Object System.Drawing.Pen (Col $t.outline2), ($ow2 * 2)
      $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
      $g.DrawPath($pen, $path)
    }
    if ($t.outline) {
      $pen = New-Object System.Drawing.Pen (Col $t.outline), ($ow * 2)
      $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
      $g.DrawPath($pen, $path)
    }
    $fills = @($t.fill)
    if ($fills.Count -ge 2) {
      $rect = New-Object System.Drawing.RectangleF $nb.X, ($nb.Y - 0.5), ([Math]::Max($nb.Width, 1)), ($nb.Height + 1)
      $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (Col $fills[0]), (Col $fills[1]), ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    } else {
      $brush = New-Object System.Drawing.SolidBrush (Col $fills[0])
    }
    $g.FillPath($brush, $path)
    $path.Dispose()
  }
  $g.Dispose()
  New-Item -ItemType Directory -Force (Split-Path $j.out) | Out-Null
  $bmp.Save($j.out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Write-Output ("renderizadas: " + @($list).Count)
