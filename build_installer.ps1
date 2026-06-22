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

# ── Gera .zip manual (para quem preferir instalar pelo QGIS) ──
Show-Progress "Gerando .zip..." 92
$zipName = "ufpr_map_composer-$metaVersion.zip"
$outputZip = Join-Path $distDir $zipName

$tempStage2 = Join-Path $env:TEMP "ufpr_plugin_zip_stage"
if (Test-Path $tempStage2) { Remove-Item -Recurse -Force $tempStage2 }
$zipPluginDir = Join-Path $tempStage2 "ufpr_map_composer"
New-Item -ItemType Directory -Path $zipPluginDir | Out-Null

foreach ($file in $pluginFiles) {
    $src = Join-Path $scriptDir $file
    if (Test-Path $src) { Copy-Item -Force $src $zipPluginDir }
}
foreach ($folder in @("assets", "core", "ui")) {
    $src = Join-Path $scriptDir $folder
    if (Test-Path $src) { Copy-Item -Recurse -Force $src (Join-Path $zipPluginDir $folder) }
}
$templatesDst2 = Join-Path $zipPluginDir "templates"
robocopy (Join-Path $scriptDir "templates") $templatesDst2 /E /XD "node_modules" ".git" /XF "*.log" /NFL /NDL /NJH /NJS | Out-Null

if (Test-Path $outputZip) { Remove-Item $outputZip }
Compress-Archive -Path "$tempStage2\*" -DestinationPath $outputZip
Remove-Item -Recurse -Force $tempStage2

# ── Gera README_INSTALACAO.txt ──
Show-Progress "Gerando README..." 97
$readmePath = Join-Path $distDir "README_INSTALACAO.txt"
$readmeContent = @"
UFPR Map Composer v$metaVersion

OPÇÃO 1 — Instalador automático
  Arquivo: $exeName.exe
  Execute o .exe e siga as instruções. Reinicie o QGIS após instalar.
  Se o Windows bloquear, clique em "Mais informações" > "Executar assim mesmo".

OPÇÃO 2 — Instalação manual pelo QGIS
  Arquivo: $zipName
  No QGIS: Complementos > Gerenciar e Instalar Complementos > Instalar a partir do ZIP

REQUISITOS
  - QGIS 3.16 ou superior
  - Node.js 18 ou superior (nodejs.org)
"@
[System.IO.File]::WriteAllText($readmePath, $readmeContent, [System.Text.Encoding]::UTF8)

Show-Progress "Concluido!" 100
Write-Host ""
Write-Host ""

if (Test-Path $outputExe) {
    $kb = [math]::Round((Get-Item $outputExe).Length / 1KB)
    Write-Host " Instalador .exe gerado! ($kb KB)" -ForegroundColor Green
    Write-Host " $outputExe" -ForegroundColor DarkGray
}
if (Test-Path $outputZip) {
    $kb = [math]::Round((Get-Item $outputZip).Length / 1KB)
    Write-Host " Pacote .zip gerado! ($kb KB)" -ForegroundColor Green
    Write-Host " $outputZip" -ForegroundColor DarkGray
}
if (Test-Path $readmePath) {
    Write-Host " README gerado!" -ForegroundColor Green
    Write-Host " $readmePath" -ForegroundColor DarkGray
}
Write-Host ""
if (-not (Test-Path $outputExe)) {
    Write-Host " Falha ao gerar o instalador .exe." -ForegroundColor Red
}
