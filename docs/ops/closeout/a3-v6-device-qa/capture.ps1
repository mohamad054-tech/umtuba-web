# Fold6 v6 QA capture helper. Load toolchain first.
# . docs/ops/closeout/android-device-toolchain/env.ps1
$ErrorActionPreference = "Stop"
$Out = "C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\a3-v6-device-qa"
$Serial = "RFCX718LVHK"
function Capture-Qa([string]$Name) {
  $png = Join-Path $Out "$Name.png"
  $xml = Join-Path $Out "$Name-ui.xml"
  adb -s $Serial exec-out screencap -p > $png
  adb -s $Serial shell uiautomator dump /sdcard/window_dump.xml | Out-Null
  adb -s $Serial pull /sdcard/window_dump.xml $xml | Out-Null
  Write-Host "CAPTURE $Name"
}
function Dump-Installed {
  adb -s $Serial shell dumpsys package com.umtuba.app | Out-File (Join-Path $Out "dumpsys-package.txt") -Encoding utf8
  adb -s $Serial devices -l | Out-File (Join-Path $Out "adb-devices.txt") -Encoding utf8
}
