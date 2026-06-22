$scriptDir = $PSScriptRoot
$metadataFile = Join-Path $scriptDir "metadata.txt"
$meta = Get-Content $metadataFile
$pluginName = ($meta | Where-Object { $_ -match "^name=" }        | Select-Object -First 1) -replace "^name=", ""
$metaVersion = ($meta | Where-Object { $_ -match "^version=" }     | Select-Object -First 1) -replace "^version=", ""
$metaDesc = ($meta | Where-Object { $_ -match "^description=" } | Select-Object -First 1) -replace "^description=", ""
$metaAuthor = ($meta | Where-Object { $_ -match "^author=" }      | Select-Object -First 1) -replace "^author=", ""
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

$pluginFiles = @("__init__.py", "metadata.txt")

Show-Progress "Copiando arquivos..." 10

if (Test-Path $tempStage) { Remove-Item -Recurse -Force $tempStage }
New-Item -ItemType Directory -Path $tempStage | Out-Null

foreach ($file in $pluginFiles) {
    $src = Join-Path $scriptDir $file
    if (Test-Path $src) { Copy-Item -Force $src $tempStage }
}

# Copia pasta assets/ (ícones e recursos estáticos)
$assetsSrc = Join-Path $scriptDir "assets"
if (Test-Path $assetsSrc) {
    Copy-Item -Recurse -Force $assetsSrc (Join-Path $tempStage "assets")
}

# Copia pasta core/ (dialog, exporter, generator, plugin)
$coreSrc = Join-Path $scriptDir "core"
if (Test-Path $coreSrc) {
    Copy-Item -Recurse -Force $coreSrc (Join-Path $tempStage "core")
}

# Copia pasta ui/ (layouts Qt Designer)
$uiSrc = Join-Path $scriptDir "ui"
if (Test-Path $uiSrc) {
    Copy-Item -Recurse -Force $uiSrc (Join-Path $tempStage "ui")
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
# Forca cultura pt-BR para exibir acentos corretamente
[System.Threading.Thread]::CurrentThread.CurrentUICulture = 'pt-BR'
[System.Threading.Thread]::CurrentThread.CurrentCulture = 'pt-BR'

`$collapsedH = 244
`$expandedH  = 444
`$panelH     = 180
`$pluginDst  = "`$env:APPDATA\QGIS\QGIS3\profiles\default\python\plugins\ufpr_map_composer"
`$base64Data = "$base64"

$(Get-Content (Join-Path $scriptDir "installer\gui.ps1") -Raw -Encoding UTF8)

$(Get-Content (Join-Path $scriptDir "installer\logic.ps1") -Raw -Encoding UTF8)

[System.Windows.Forms.Application]::Run(`$form)
"@
Set-Content -Path $tempPs1 -Value $installerContent -Encoding UTF8
$iconFile = Join-Path $scriptDir "assets\icon.ico"
$ps2exeParams = @{
    InputFile    = $tempPs1
    OutputFile   = $outputExe
    NoConsole    = $true
    Title        = $pluginName
    Description  = $metaDesc
    Company      = $metaAuthor
    Product      = $pluginName
    Version      = "$metaVersion.0"
    Copyright    = $metaAuthor
    RequireAdmin = $false
}
if (Test-Path $iconFile) { $ps2exeParams['IconFile'] = $iconFile }
Invoke-ps2exe @ps2exeParams *>$null
Remove-Item $tempPs1 -ErrorAction SilentlyContinue

if (Test-Path $outputExe) {
    # Remove Zone.Identifier ADS para evitar bloqueio do Windows
    Unblock-File -Path $outputExe -ErrorAction SilentlyContinue
    try { Remove-Item -Path "${outputExe}:Zone.Identifier" -Force -ErrorAction SilentlyContinue } catch {}
}

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
