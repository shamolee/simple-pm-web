<#
Copies the web app (src\) into the folder the API serves at /app/. There is no build step: the files are
deployed as they are. The target is mirrored, so files removed from src\ are removed there too.
Grants the API's service account read access to the target, as install-service.ps1 does for the API folder.
The API serves the folder named by its WebApp:Path setting; no API restart is needed after a deploy, except
the first time (the API checks that the folder exists at startup).

Parameters:
  -Target      folder to deploy into (required)
  -ServiceSid  account that needs read access (default: S-1-5-19 = LocalService, the API service account)

Example:
  powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -Target C:\path\to\web-app
#>
param(
    [Parameter(Mandatory)][string]$Target,
    [string]$ServiceSid = 'S-1-5-19'
)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..\src')).Path

robocopy $source $Target /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
# robocopy: 0-7 are success codes (files copied, extras removed, ...), 8+ are failures
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

icacls $Target /grant "*${ServiceSid}:(OI)(CI)RX" /T /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw "icacls failed ($LASTEXITCODE)" }

Write-Host "Deployed web app to $Target"
