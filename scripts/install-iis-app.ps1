<#
.SYNOPSIS
  Installs or updates VOC Artificial Lift as an IIS application. Run as Administrator
  ON THE IIS SERVER.

.DESCRIPTION
  1. Checks prerequisites: IIS, URL Rewrite, iisnode, Node.js on PATH, Windows Authentication.
  2. Copies the package (the contents of .next/standalone) to the target folder.
  3. Creates an app pool (no managed code) and the /als application under the site.
  4. Turns on Windows Authentication and turns off Anonymous for the application.
  5. Gives the app pool identity read access, and modify access to the iisnode log folder.
  6. Requests the API health URL and prints the result.

  Re-running it updates the files in place and recycles the app pool.

.EXAMPLE
  .\install-iis-app.ps1 -PackagePath C:\deploy\als -SiteName "Default Web Site"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $PackagePath,
  [string] $SiteName = "Default Web Site",
  [string] $AppPath = "/als",
  [string] $TargetPath = "C:\inetpub\apps\als",
  [string] $AppPoolName = "als"
)

$ErrorActionPreference = "Stop"

function Fail($msg) { Write-Host "FAILED: $msg" -ForegroundColor Red; exit 1 }
function Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }

# --- Prerequisites -------------------------------------------------------------------------
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { Fail "Run this script as Administrator." }

if (-not (Get-Service W3SVC -ErrorAction SilentlyContinue)) { Fail "IIS (W3SVC) is not installed." }
Ok "IIS installed"

$inetsrv = Join-Path $env:SystemRoot "System32\inetsrv"
if (-not (Test-Path (Join-Path $inetsrv "rewrite.dll"))) { Fail "IIS URL Rewrite module is not installed (https://www.iis.net/downloads/microsoft/url-rewrite)." }
Ok "URL Rewrite installed"

$iisnodeDll = @("$env:ProgramFiles\iisnode\iisnode.dll", "${env:ProgramFiles(x86)}\iisnode\iisnode.dll") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iisnodeDll) { Fail "iisnode is not installed (https://github.com/Azure/iisnode/releases)." }
Ok "iisnode installed ($iisnodeDll)"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail "Node.js is not on the system PATH. Install Node 20+ for all users." }
$nodeVersion = (& node --version)
Ok "Node $nodeVersion at $($node.Source)"

$winAuth = Get-WindowsFeature -Name Web-Windows-Auth -ErrorAction SilentlyContinue
if ($winAuth -and -not $winAuth.Installed) { Fail "IIS Windows Authentication feature is not installed (Install-WindowsFeature Web-Windows-Auth)." }

foreach ($f in @("iisnode.js", "server.js", "web.config", ".next", "node_modules", "db")) {
  if (-not (Test-Path (Join-Path $PackagePath $f))) { Fail "Package is missing '$f'. Point -PackagePath at the contents of .next/standalone." }
}
Ok "Package looks complete"

Import-Module WebAdministration

if (-not (Test-Path "IIS:\Sites\$SiteName")) { Fail "IIS site '$SiteName' not found." }

# --- Files ---------------------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
# Keep a server-side .env (production settings) if one already exists.
robocopy $PackagePath $TargetPath /MIR /XF .env /XD iisnode /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy failed with exit code $LASTEXITCODE." }
New-Item -ItemType Directory -Force -Path (Join-Path $TargetPath "iisnode") | Out-Null
Ok "Files copied to $TargetPath"

# --- App pool ------------------------------------------------------------------------------
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
  New-WebAppPool -Name $AppPoolName | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"
Ok "App pool '$AppPoolName'"

# --- Application ---------------------------------------------------------------------------
$appName = $AppPath.TrimStart("/")
if (Get-WebApplication -Site $SiteName -Name $appName) {
  Set-ItemProperty "IIS:\Sites\$SiteName\$appName" -Name physicalPath -Value $TargetPath
  Set-ItemProperty "IIS:\Sites\$SiteName\$appName" -Name applicationPool -Value $AppPoolName
} else {
  New-WebApplication -Site $SiteName -Name $appName -PhysicalPath $TargetPath -ApplicationPool $AppPoolName | Out-Null
}
Ok "Application $SiteName$AppPath"

# --- Authentication (these sections are locked at server level, so set them here) ---------
$location = "$SiteName$AppPath"
Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Location $location `
  -Filter "system.webServer/security/authentication/anonymousAuthentication" -Name enabled -Value $false
Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Location $location `
  -Filter "system.webServer/security/authentication/windowsAuthentication" -Name enabled -Value $true
Ok "Windows Authentication on, Anonymous off"

# --- Permissions ---------------------------------------------------------------------------
$identity = "IIS AppPool\$AppPoolName"
icacls $TargetPath /grant "${identity}:(OI)(CI)RX" /T /Q | Out-Null
icacls (Join-Path $TargetPath "iisnode") /grant "${identity}:(OI)(CI)M" /T /Q | Out-Null
Ok "Permissions for $identity"

# --- Start + smoke test --------------------------------------------------------------------
Restart-WebAppPool -Name $AppPoolName -ErrorAction SilentlyContinue
$url = "http://localhost$AppPath/api/user"
try {
  $res = Invoke-WebRequest -Uri $url -UseDefaultCredentials -UseBasicParsing -TimeoutSec 90
  Ok "GET $url -> $($res.StatusCode) $($res.Content)"
} catch {
  Write-Host "Smoke test failed: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "Check the iisnode logs in $(Join-Path $TargetPath 'iisnode')" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Deployed. Open: http://$($env:COMPUTERNAME)$AppPath" -ForegroundColor Cyan
