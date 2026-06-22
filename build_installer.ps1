$scriptDir = $PSScriptRoot
$metadataFile = Join-Path $scriptDir "metadata.txt"
$pluginName = (Get-Content $metadataFile | Where-Object { $_ -match "^name=" } | Select-Object -First 1) -replace "^name=", ""
$exeName = "InstaladorPlugin-" + ($pluginName -replace "[^\w]", "")
$outputExe = Join-Path $scriptDir "dist\$exeName.exe"
$tempStage = Join-Path $env:TEMP "ufpr_plugin_stage"
$tempZip = Join-Path $env:TEMP "ufpr_plugin_build.zip"
$tempPs1 = Join-Path $env:TEMP "ufpr_installer_gen.ps1"

function Show-Progress {
    param([string]$Status, [int]$Percent)
    $width = 40
    $filled = [math]::Round($width * $Percent / 100)
    $bar = ("█" * $filled).PadRight($width, "░")
    $line = "  [$bar] $Percent%  $Status"
    $clear = "`r" + " " * 80 + "`r"
    Write-Host ($clear + $line) -NoNewline -ForegroundColor Cyan
}

$ProgressPreference = 'SilentlyContinue'

Write-Host ""
Write-Host " UFPR Map Composer — Build do Instalador" -ForegroundColor White
Write-Host ""

if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Show-Progress "Instalando ps2exe..." 0
    Install-Module -Name ps2exe -Scope CurrentUser -Force *>$null
}
Import-Module ps2exe *>$null

$distDir = Join-Path $scriptDir "dist"
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$pluginFiles = @("__init__.py", "dialog.py", "exporter.py", "generator.py", "metadata.txt", "ufpr_map_composer.py")
if (Test-Path (Join-Path $scriptDir "icon.svg")) { $pluginFiles += "icon.svg" }
if (Test-Path (Join-Path $scriptDir "icon.png")) { $pluginFiles += "icon.png" }

Show-Progress "Copiando arquivos..." 10

if (Test-Path $tempStage) { Remove-Item -Recurse -Force $tempStage }
New-Item -ItemType Directory -Path $tempStage | Out-Null

foreach ($file in $pluginFiles) {
    $src = Join-Path $scriptDir $file
    if (Test-Path $src) { Copy-Item -Force $src $tempStage }
}

Show-Progress "Copiando templates..." 30

$templatesSrc = Join-Path $scriptDir "templates"
$templatesDst = Join-Path $tempStage "templates"
if (Test-Path $templatesSrc) {
    robocopy $templatesSrc $templatesDst /E /XD "node_modules" ".git" /XF "*.log" /NFL /NDL /NJH /NJS | Out-Null
}

Show-Progress "Comprimindo..." 55

if (Test-Path $tempZip) { Remove-Item $tempZip }
Compress-Archive -Path "$tempStage\*" -DestinationPath $tempZip
Remove-Item -Recurse -Force $tempStage

Show-Progress "Codificando..." 70

$bytes = [System.IO.File]::ReadAllBytes($tempZip)
$base64 = [Convert]::ToBase64String($bytes)
Remove-Item $tempZip

Show-Progress "Gerando .exe..." 85

$installerContent = @"
`$pluginDst = "`$env:APPDATA\QGIS\QGIS3\profiles\default\python\plugins\ufpr_map_composer"

Write-Host "Instalando UFPR Map Composer..." -ForegroundColor Cyan

`$qgisProc = Get-Process -Name "qgis*" -ErrorAction SilentlyContinue
if (`$qgisProc) {
    Write-Host "Feche o QGIS antes de continuar." -ForegroundColor Yellow
    Read-Host "Pressione Enter para continuar"
}

`$tempZip = Join-Path `$env:TEMP "ufpr_plugin_install.zip"
[System.IO.File]::WriteAllBytes(`$tempZip, [Convert]::FromBase64String("$base64"))
if (Test-Path `$pluginDst) { Remove-Item -Recurse -Force `$pluginDst }
New-Item -ItemType Directory -Path `$pluginDst -Force | Out-Null
Expand-Archive -Path `$tempZip -DestinationPath `$pluginDst -Force
Remove-Item `$tempZip

Write-Host "Pronto! Ative o plugin em: Plugins > Gerenciar e Instalar Plugins" -ForegroundColor Green
Read-Host "Pressione Enter para fechar"
"@

Set-Content -Path $tempPs1 -Value $installerContent -Encoding UTF8
Invoke-ps2exe -InputFile $tempPs1 -OutputFile $outputExe -NoConsole:$false -Title "UFPR Map Composer" -Version "1.0.0" *>$null
Remove-Item $tempPs1 -ErrorAction SilentlyContinue

Show-Progress "Concluido!" 100
Write-Host ""
Write-Host ""

if (Test-Path $outputExe) {
    $kb = [math]::Round((Get-Item $outputExe).Length / 1KB)
    Write-Host " Instalador gerado com sucesso! ($kb KB)" -ForegroundColor Green
    Write-Host " $outputExe" -ForegroundColor DarkGray
    Write-Host ""
}
else {
    Write-Host " Falha ao gerar o instalador." -ForegroundColor Red
}
