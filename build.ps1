# Package both browser editions by default.
param(
    [ValidateSet('all', 'firefox', 'chromium')]
    [string] $Browser = 'all'
)

$ErrorActionPreference = 'Stop'
$python = Get-Command python3, python, py -ErrorAction SilentlyContinue | Select-Object -First 1
if (!$python) { throw 'Python 3 is required to build OmniBar.' }
& $python.Source (Join-Path $PSScriptRoot 'build.py') --browser $Browser
exit $LASTEXITCODE
