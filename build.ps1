# Builds dist/omnibar.zip containing only the files the extension needs (for Chrome Web Store upload).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$files = 'manifest.json', 'background.js', 'frame-bridge.js', 'sidebar.html', 'sidebar.css', 'sidebar.js', 'theme.js', 'icons', 'fonts'
$stage = Join-Path 'dist' 'omnibar'
$zip = Join-Path 'dist' 'omnibar.zip'

if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($f in $files) { Copy-Item $f -Destination $stage -Recurse }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path $stage), (Join-Path (Resolve-Path 'dist') 'omnibar.zip'))

$version = (Get-Content 'manifest.json' -Raw | ConvertFrom-Json).version
Write-Output "Built $zip (version $version, $([math]::Round((Get-Item $zip).Length / 1KB)) KB)"
