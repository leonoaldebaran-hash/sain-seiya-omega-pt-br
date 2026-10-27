# Renders glyphs for the game font.
#   powershell -File tools/glifos.ps1 <chars.txt (UTF-8)> <out.json> [font] [size] [bold]
# Output: [{ c: code, w, h, left, top, adv (in 1/64 px), a: [alpha 0..15 row-major w*h] }]
# Each glyph is drawn on a big canvas with the baseline at y=BASE, then cropped to its ink box.
param([string]$charsFile, [string]$outFile, [string]$fontName = 'Arial', [single]$size = 17, [int]$bold = 0)
Add-Type -AssemblyName System.Drawing

$chars = (Get-Content -Raw -Encoding UTF8 $charsFile).TrimEnd("`r", "`n")
$style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
$font = New-Object System.Drawing.Font $fontName, $size, $style, ([System.Drawing.GraphicsUnit]::Pixel)
$family = $font.FontFamily
$ascent = $size * $family.GetCellAscent($style) / $family.GetEmHeight($style)
$BASE = 24
$fmt = [System.Drawing.StringFormat]::GenericTypographic
$fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces

$probe = New-Object System.Drawing.Bitmap 8, 8
$pg = [System.Drawing.Graphics]::FromImage($probe)
$pg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
function Advance([string]$ch) {
  $a = $pg.MeasureString("|" + $ch + "|", $font, 1000, $fmt).Width
  $b = $pg.MeasureString("||", $font, 1000, $fmt).Width
  return $a - $b
}

$out = New-Object System.Collections.ArrayList
foreach ($ch in $chars.ToCharArray()) {
  $bmp = New-Object System.Drawing.Bitmap 48, 40
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Black)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $ox = 8
  $g.DrawString([string]$ch, $font, [System.Drawing.Brushes]::White, $ox, ($BASE - $ascent), $fmt)
  $g.Dispose()
  # ink box
  $x0 = 99; $y0 = 99; $x1 = -1; $y1 = -1
  for ($y = 0; $y -lt 40; $y++) { for ($x = 0; $x -lt 48; $x++) {
    if ($bmp.GetPixel($x, $y).R -gt 24) { if ($x -lt $x0) { $x0 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($x -gt $x1) { $x1 = $x }; if ($y -gt $y1) { $y1 = $y } }
  } }
  $adv = [Math]::Round((Advance ([string]$ch)) * 64)
  if ($x1 -lt 0) {
    [void]$out.Add(@{ c = [int]$ch; w = 0; h = 0; left = 0; top = 0; adv = $adv; a = @() })
  } else {
    $w = [Math]::Min($x1 - $x0 + 1, 16); $h = [Math]::Min($y1 - $y0 + 1, 16)
    $alpha = New-Object System.Collections.ArrayList
    for ($y = 0; $y -lt $h; $y++) { for ($x = 0; $x -lt $w; $x++) { [void]$alpha.Add([int][Math]::Round($bmp.GetPixel($x0 + $x, $y0 + $y).R / 17)) } }
    [void]$out.Add(@{ c = [int]$ch; w = $w; h = $h; left = $x0 - $ox; top = $BASE - $y0; adv = $adv; a = $alpha })
  }
  $bmp.Dispose()
}
$out | ConvertTo-Json -Depth 4 -Compress | Out-File -Encoding utf8 $outFile
Write-Output ("glifos: " + $out.Count)
