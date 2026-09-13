# Fold6 17cbfef follow-list stack retest capture helper. Do not write to Desktop.
$ErrorActionPreference = "Continue"
$Out = "C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-ANDROID-17CBFEF-FOLLOW-LIST\docs\ops\android-17cbfef-follow-list-stack-retest\evidence\qa"
$Serial = "RFCX718LVHK"
$DisplayFolded = "4630947194243491972"
$DisplayUnfolded = "4630946165277524611"
$AdbExe = "C:\Users\1\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
function Adb { & $AdbExe -s $Serial @args }
function Get-ActiveDisplayId {
  $wm = Adb shell wm size | Out-String
  if ($wm -match "1856x2160" -or $wm -match "2160x1856") { return $DisplayUnfolded }
  return $DisplayFolded
}
function Capture-Qa([string]$Name) {
  Start-Sleep -Milliseconds 700
  $png = Join-Path $Out "$Name.png"
  $xml = Join-Path $Out "$Name-ui.xml"
  $txt = Join-Path $Out "$Name-nodes.txt"
  $disp = Get-ActiveDisplayId
  Adb shell screencap -d $disp -p /sdcard/umtuba_qa.png | Out-Null
  Adb pull /sdcard/umtuba_qa.png $png | Out-Null
  $dump = Adb shell uiautomator dump /sdcard/window_dump.xml 2>&1 | Out-String
  if ($dump -notmatch "ERROR") {
    Adb pull /sdcard/window_dump.xml $xml | Out-Null
  }
  if (Test-Path $xml) {
    $raw = Get-Content -Raw -Encoding UTF8 $xml
    $nodes = [regex]::Matches($raw, '<node [^>]+>')
    $list = foreach ($n in $nodes) {
      $t = if ($n.Value -match 'text="([^"]*)"') { $Matches[1] } else { "" }
      $d = if ($n.Value -match 'content-desc="([^"]*)"') { $Matches[1] } else { "" }
      $b = if ($n.Value -match 'bounds="([^"]+)"') { $Matches[1] } else { "" }
      $c = if ($n.Value -match 'clickable="(true|false)"') { $Matches[1] } else { "" }
      if ($t -or $d) { "$c | $t | $d | $b" }
    }
    $list | Set-Content -Encoding utf8 $txt
  }
  $size = if (Test-Path $png) { (Get-Item $png).Length } else { 0 }
  Write-Host "CAPTURE $Name size=$size display=$disp"
}
function Tap-XY([int]$X, [int]$Y) {
  Adb shell input tap $X $Y | Out-Null
}
function Swipe([int]$X1, [int]$Y1, [int]$X2, [int]$Y2, [int]$Ms = 400) {
  Adb shell input swipe $X1 $Y1 $X2 $Y2 $Ms | Out-Null
}
function Find-NodeCenter([string]$Needle, [string]$DumpName = $null) {
  $xmlPath = $null
  if ($DumpName) {
    $xmlPath = Join-Path $Out "$DumpName-ui.xml"
  }
  if (-not $xmlPath -or -not (Test-Path $xmlPath)) {
    $latest = Get-ChildItem $Out -Filter "*-ui.xml" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) { $xmlPath = $latest.FullName }
  }
  if (-not $xmlPath -or -not (Test-Path $xmlPath)) { return $null }
  $raw = Get-Content -Raw -Encoding UTF8 $xmlPath
  $nodes = [regex]::Matches($raw, '<node [^>]+>')
  foreach ($n in $nodes) {
    $t = if ($n.Value -match 'text="([^"]*)"') { $Matches[1] } else { "" }
    $d = if ($n.Value -match 'content-desc="([^"]*)"') { $Matches[1] } else { "" }
    $b = if ($n.Value -match 'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"') {
      @{ x1 = [int]$Matches[1]; y1 = [int]$Matches[2]; x2 = [int]$Matches[3]; y2 = [int]$Matches[4] }
    } else { $null }
    if ($b -and (($t -and $t -like "*$Needle*") -or ($d -and $d -like "*$Needle*"))) {
      return @{
        x = [int](($b.x1 + $b.x2) / 2)
        y = [int](($b.y1 + $b.y2) / 2)
        text = $t
        desc = $d
        bounds = "$($b.x1),$($b.y1),$($b.x2),$($b.y2)"
      }
    }
  }
  return $null
}
function Dump-Media([string]$Name) {
  $path = Join-Path $Out "$Name-media_session.txt"
  Adb shell dumpsys media_session | Set-Content -Encoding utf8 $path
  $raw = Get-Content -Raw -Encoding utf8 $path
  $states = [regex]::Matches($raw, 'state=PlaybackState \{state=(\w+)') | ForEach-Object { $_.Groups[1].Value }
  Write-Host ("MEDIA {0} {1}" -f $Name, (($states | Select-Object -First 4) -join ","))
}
