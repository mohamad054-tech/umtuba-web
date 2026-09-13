# Android device-test toolchain — env (repo-local)
# Usage: . C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain\env.ps1
$ErrorActionPreference = "Stop"
$ToolchainTools = "C:\Users\1\Desktop\umtuba\umtuba-web\tools\android-device-toolchain"
$ToolchainDocs = "C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\android-device-toolchain"
$env:JAVA_HOME = Join-Path $ToolchainTools "jdk-17.0.20+8"
$env:ANDROID_PLATFORM_TOOLS = Join-Path $ToolchainTools "platform-tools"
$env:BUNDLETOOL_JAR = Join-Path $ToolchainDocs "bundletool-all-1.18.1.jar"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_PLATFORM_TOOLS;$env:PATH"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_PLATFORM_TOOLS=$env:ANDROID_PLATFORM_TOOLS"
Write-Host "BUNDLETOOL_JAR=$env:BUNDLETOOL_JAR"
& "$env:JAVA_HOME\bin\java.exe" -version
& "$env:ANDROID_PLATFORM_TOOLS\adb.exe" version
& "$env:JAVA_HOME\bin\java.exe" -jar $env:BUNDLETOOL_JAR version
