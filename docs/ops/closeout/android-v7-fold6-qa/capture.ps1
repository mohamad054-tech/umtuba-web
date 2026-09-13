# Fold6 v7 QA capture helper. Load toolchain first.
$ErrorActionPreference = "Continue"
$Out = "C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-v7-fold6-qa"
$Serial = "RFCX718LVHK"
function Capture-Qa([string]$Name) {
  $png = Join-Path $Out "$Name.png"
  $xml = Join-Path $Out "$Name-ui.xml"
  adb -s $Serial shell screencap -p /sdcard/umtuba_qa.png | Out-Null
  adb -s $Serial pull /sdcard/umtuba_qa.png $png | Out-Null
  adb -s $Serial shell uiautomator dump /sdcard/window_dump.xml | Out-Null
  adb -s $Serial pull /sdcard/window_dump.xml $xml | Out-Null
  Write-Host "CAPTURE $Name size=$((Get-Item $png).Length)"
}
function Get-UiXml {
  $xml = Join-Path $Out "_live.xml"
  adb -s $Serial shell uiautomator dump /sdcard/window_dump.xml | Out-Null
  adb -s $Serial pull /sdcard/window_dump.xml $xml | Out-Null
  return Get-Content -Raw $xml
}
function Get-BoundsCenter([string]$Bounds) {
  if ($Bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
    $x = [int]((([int]$Matches[1]) + ([int]$Matches[3])) / 2)
    $y = [int]((([int]$Matches[2]) + ([int]$Matches[4])) / 2)
    return @{ X = $x; Y = $y; Bounds = $Bounds }
  }
  return $null
}
function Find-Node([string]$Xml, [string]$Needle) {
  $esc = [regex]::Escape($Needle)
  $m = [regex]::Match($Xml, "(<node[^>]*((content-desc|text)=`"$esc`")[^>]*>)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $m.Success) { return $null }
  $bounds = [regex]::Match($m.Value, 'bounds="(\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\])"')
  if (-not $bounds.Success) { return $null }
  return Get-BoundsCenter $bounds.Groups[1].Value
}
function Tap-Desc([string]$Desc) {
  $xml = Get-UiXml
  $hit = Find-Node $xml $Desc
  if (-not $hit) { Write-Host "TAP_MISS $Desc"; return $false }
  adb -s $Serial shell input tap $hit.X $hit.Y
  Write-Host "TAP $Desc $($hit.X),$($hit.Y) $($hit.Bounds)"
  return $true
}
function Tap-XY([int]$X, [int]$Y) {
  adb -s $Serial shell input tap $X $Y
  Write-Host "TAP_XY $X,$Y"
}
