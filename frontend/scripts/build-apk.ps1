# Builds the release APK and copies it to <project>\releases\virtualtryon-<date>.apk.
#
# Run from anywhere, in PowerShell:
#   powershell -ExecutionPolicy Bypass -File D:\reactapps\virtualtryon\frontend\scripts\build-apk.ps1
# Add -Prebuild after changing app.json or a native package (regenerates
# frontend\android first; slower, 20-30 min instead of about 5).
#
# The APK is signed with the debug key: fine to install on your own phone,
# not for the Play Store (that needs an upload key and an .aab).

param([switch]$Prebuild)

$ErrorActionPreference = 'Stop'
$frontend = Split-Path -Parent $PSScriptRoot
$project = Split-Path -Parent $frontend
$android = Join-Path $frontend 'android'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

if ($Prebuild -or -not (Test-Path $android)) {
    Push-Location $frontend
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'expo prebuild failed' }
    Pop-Location
}

# Where the Android SDK is (prebuild deletes this file).
Set-Content -Path (Join-Path $android 'local.properties') -Value "sdk.dir=$($sdk -replace '\\', '/')" -Encoding ascii
$env:ANDROID_HOME = $sdk
$env:NODE_ENV = 'production'

Push-Location $android
.\gradlew.bat assembleRelease
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { throw "Gradle build failed (exit $code)" }

$apk = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
$releases = Join-Path $project 'releases'
New-Item -ItemType Directory -Force -Path $releases | Out-Null
$target = Join-Path $releases ("virtualtryon-{0}.apk" -f (Get-Date -Format 'yyyy-MM-dd-HHmm'))
Copy-Item $apk $target
Write-Host ''
Write-Host "APK ready: $target"
