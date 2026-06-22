# build_installer.ps1
# Gera um .exe instalador do plugin UFPR Map Composer usando ps2exe.
# Execute uma vez para gerar o instalador: .\build_installer.ps1

$scriptDir = $PSScriptRoot
$inputScript = Join-Path $scriptDir "install_plugin.ps1"
$outputExe   = Join-Path $scriptDir "dist\install_plugin.exe"

Write-Host ""
Write-Host "=== UFPR Map Composer - Build do Instalador ===" -ForegroundColor Cyan
Write-Host ""

# Instala ps2exe se ainda nao estiver disponivel
if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host "Instalando ps2exe..." -ForegroundColor Yellow
    Install-Module -Name ps2exe -Scope CurrentUser -Force
}

Import-Module ps2exe

# Cria a pasta de saida
$distDir = Join-Path $scriptDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

Write-Host "Gerando $outputExe ..." -ForegroundColor Gray

Invoke-ps2exe `
    -InputFile  $inputScript `
    -OutputFile $outputExe `
    -NoConsole:$false `
    -Title      "UFPR Map Composer Installer" `
    -Description "Instala o plugin UFPR Map Composer no QGIS" `
    -Version    "1.0.0"

if (Test-Path $outputExe) {
    Write-Host ""
    Write-Host "Instalador gerado com sucesso!" -ForegroundColor Green
    Write-Host "Arquivo: $outputExe" -ForegroundColor White
    Write-Host ""
    Write-Host "Para distribuir: copie a pasta dist\ junto com os arquivos do plugin." -ForegroundColor Gray
    Write-Host "O .exe precisa estar na raiz do projeto para encontrar os arquivos." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Falha ao gerar o instalador." -ForegroundColor Red
}
