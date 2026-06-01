# install_plugin.ps1
# Instala o plugin UFPR Map Composer no QGIS copiando a pasta para o diretório de plugins.
# Execute: clique duplo no arquivo ou rode no PowerShell: .\install_plugin.ps1

$pluginSrc = $PSScriptRoot
$pluginName = "ufpr_map_composer"
$pluginDst = "$env:APPDATA\QGIS\QGIS3\profiles\default\python\plugins\$pluginName"

Write-Host ""
Write-Host "=== UFPR Map Composer — Instalador ===" -ForegroundColor Cyan
Write-Host "Origem : $pluginSrc"
Write-Host "Destino: $pluginDst"
Write-Host ""

# Fecha o QGIS se estiver aberto (para não travar arquivos)
$qgisProc = Get-Process -Name "qgis*" -ErrorAction SilentlyContinue
if ($qgisProc) {
    Write-Host "QGIS está aberto. Feche o QGIS antes de continuar." -ForegroundColor Yellow
    Read-Host "Pressione Enter após fechar o QGIS"
}

# Cria a pasta de plugins se não existir
$parentDir = Split-Path $pluginDst
if (-not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

# Remove versão anterior
if (Test-Path $pluginDst) {
    Write-Host "Removendo versão anterior..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $pluginDst
}

# Copia os arquivos do plugin (exclui pastas desnecessárias)
Write-Host "Copiando arquivos..." -ForegroundColor Gray
$exclude = @('.git', '__pycache__', '*.pyc', 'node_modules', '.vscode')

robocopy $pluginSrc $pluginDst /E /XD ".git" "__pycache__" "node_modules" ".vscode" /XF "*.pyc" /NFL /NDL /NJH /NJS | Out-Null

Write-Host ""
Write-Host "Instalado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo:" -ForegroundColor White
Write-Host "  1. Abra o QGIS"
Write-Host "  2. Menu Plugins > Gerenciar e Instalar Plugins"
Write-Host "  3. Aba 'Instalados' > marque 'UFPR Map Composer'"
Write-Host "  4. O icone aparece na barra de ferramentas"
Write-Host ""
Write-Host "Para reinstalar apos mudancas no codigo: rode este script novamente." -ForegroundColor Gray
Write-Host ""
pause
