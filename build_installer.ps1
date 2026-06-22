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
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

`$ProgressPreference = 'SilentlyContinue'

`$collapsedH = 244
`$expandedH  = 444
`$panelH     = 180

`$form = New-Object System.Windows.Forms.Form
`$form.Text = "UFPR Map Composer"
`$form.ClientSize = New-Object System.Drawing.Size(400, `$collapsedH)
`$form.StartPosition = "CenterScreen"
`$form.FormBorderStyle = "FixedSingle"
`$form.MaximizeBox = `$false
`$form.MinimizeBox = `$false
`$form.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)

`$lblTitle = New-Object System.Windows.Forms.Label
`$lblTitle.Text = "UFPR Map Composer"
`$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 15)
`$lblTitle.ForeColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
`$lblTitle.AutoSize = `$true
`$lblTitle.Location = New-Object System.Drawing.Point(32, 28)
`$form.Controls.Add(`$lblTitle)

`$lblSub = New-Object System.Windows.Forms.Label
`$lblSub.Text = "Instalador do plugin para QGIS"
`$lblSub.Font = New-Object System.Drawing.Font("Segoe UI", 9)
`$lblSub.ForeColor = [System.Drawing.Color]::FromArgb(140, 140, 140)
`$lblSub.AutoSize = `$true
`$lblSub.Location = New-Object System.Drawing.Point(33, 60)
`$form.Controls.Add(`$lblSub)

`$sep = New-Object System.Windows.Forms.Panel
`$sep.BackColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
`$sep.Location = New-Object System.Drawing.Point(32, 88)
`$sep.Size = New-Object System.Drawing.Size(336, 1)
`$form.Controls.Add(`$sep)

`$lblStatus = New-Object System.Windows.Forms.Label
`$lblStatus.Text = "Pronto para instalar."
`$lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 9)
`$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
`$lblStatus.AutoSize = `$true
`$lblStatus.Location = New-Object System.Drawing.Point(33, 102)
`$form.Controls.Add(`$lblStatus)

`$progressBar = New-Object System.Windows.Forms.ProgressBar
`$progressBar.Location = New-Object System.Drawing.Point(32, 128)
`$progressBar.Size = New-Object System.Drawing.Size(336, 6)
`$progressBar.Minimum = 0
`$progressBar.Maximum = 100
`$progressBar.Value = 0
`$progressBar.Style = "Continuous"
`$form.Controls.Add(`$progressBar)

# --- Link expansivel ---
`$lnkDetails = New-Object System.Windows.Forms.LinkLabel
`$lnkDetails.Text = "▶ Mais informacoes"
`$lnkDetails.Font = New-Object System.Drawing.Font("Segoe UI", 8)
`$lnkDetails.Location = New-Object System.Drawing.Point(33, 150)
`$lnkDetails.AutoSize = `$true
`$lnkDetails.LinkColor = [System.Drawing.Color]::FromArgb(0, 122, 255)
`$form.Controls.Add(`$lnkDetails)

# --- Painel de detalhes (oculto inicialmente) ---
`$panelDetails = New-Object System.Windows.Forms.Panel
`$panelDetails.Location = New-Object System.Drawing.Point(32, 178)
`$panelDetails.Size = New-Object System.Drawing.Size(336, `$panelH)
`$panelDetails.Visible = `$false
`$panelDetails.BackColor = [System.Drawing.Color]::FromArgb(245, 245, 245)
`$form.Controls.Add(`$panelDetails)

function Add-DetailLabel([string]`$text, [int]`$y, [bool]`$bold = `$false) {
    `$lbl = New-Object System.Windows.Forms.Label
    `$lbl.Text = `$text
    `$lbl.Font = if (`$bold) { New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold) } else { New-Object System.Drawing.Font("Segoe UI", 8) }
    `$lbl.ForeColor = [System.Drawing.Color]::FromArgb(60, 60, 60)
    `$lbl.Location = New-Object System.Drawing.Point(10, `$y)
    `$lbl.Size = New-Object System.Drawing.Size(316, 16)
    `$panelDetails.Controls.Add(`$lbl)
}
function Add-DetailLink([string]`$text, [string]`$url, [int]`$y) {
    `$lnk = New-Object System.Windows.Forms.LinkLabel
    `$lnk.Text = `$text
    `$lnk.Font = New-Object System.Drawing.Font("Segoe UI", 8)
    `$lnk.Location = New-Object System.Drawing.Point(10, `$y)
    `$lnk.AutoSize = `$true
    `$lnk.LinkColor = [System.Drawing.Color]::FromArgb(0, 122, 255)
    `$lnk.Tag = `$url
    `$lnk.Add_LinkClicked({ [System.Diagnostics.Process]::Start(`$this.Tag) | Out-Null })
    `$panelDetails.Controls.Add(`$lnk)
}

Add-DetailLabel "Onde o plugin e instalado:" 10 `$true
Add-DetailLabel "%APPDATA%\QGIS\QGIS3\profiles\default\python\plugins\ufpr_map_composer" 26

`$sep2 = New-Object System.Windows.Forms.Panel
`$sep2.BackColor = [System.Drawing.Color]::FromArgb(210, 210, 210)
`$sep2.Location = New-Object System.Drawing.Point(10, 56)
`$sep2.Size = New-Object System.Drawing.Size(316, 1)
`$panelDetails.Controls.Add(`$sep2)

Add-DetailLabel "Dependencias necessarias:" 66 `$true
Add-DetailLabel "• QGIS 3.16 ou superior" 82
Add-DetailLabel "• Node.js (para gerar e publicar o WebGIS)" 98
Add-DetailLink  "  Baixar Node.js (nodejs.org)" "https://nodejs.org" 112
Add-DetailLink  "  Baixar QGIS (qgis.org)" "https://qgis.org/download" 130
Add-DetailLabel "Apos instalar, ative em: Plugins > Gerenciar e Instalar Plugins." 152

`$script:expanded = `$false
`$lnkDetails.Add_LinkClicked({
    `$script:expanded = -not `$script:expanded
    if (`$script:expanded) {
        `$lnkDetails.Text = "▼ Menos informacoes"
        `$panelDetails.Visible = `$true
        `$form.ClientSize = New-Object System.Drawing.Size(400, `$expandedH)
        `$btnClose.Location   = New-Object System.Drawing.Point(200, (`$expandedH - 52))
        `$btnInstall.Location = New-Object System.Drawing.Point(288, (`$expandedH - 52))
    } else {
        `$lnkDetails.Text = "▶ Mais informacoes"
        `$panelDetails.Visible = `$false
        `$form.ClientSize = New-Object System.Drawing.Size(400, `$collapsedH)
        `$btnClose.Location   = New-Object System.Drawing.Point(200, (`$collapsedH - 52))
        `$btnInstall.Location = New-Object System.Drawing.Point(288, (`$collapsedH - 52))
    }
})

# --- Botoes ---
`$btnClose = New-Object System.Windows.Forms.Button
`$btnClose.Text = "Fechar"
`$btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 9)
`$btnClose.FlatStyle = "Flat"
`$btnClose.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(200, 200, 200)
`$btnClose.FlatAppearance.BorderSize = 1
`$btnClose.BackColor = [System.Drawing.Color]::FromArgb(245, 245, 245)
`$btnClose.ForeColor = [System.Drawing.Color]::FromArgb(60, 60, 60)
`$btnClose.Location = New-Object System.Drawing.Point(200, (`$collapsedH - 52))
`$btnClose.Size = New-Object System.Drawing.Size(80, 28)
`$btnClose.Enabled = `$true
`$form.Controls.Add(`$btnClose)

`$btnInstall = New-Object System.Windows.Forms.Button
`$btnInstall.Text = "Instalar"
`$btnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 9)
`$btnInstall.FlatStyle = "Flat"
`$btnInstall.FlatAppearance.BorderSize = 0
`$btnInstall.BackColor = [System.Drawing.Color]::FromArgb(0, 122, 255)
`$btnInstall.ForeColor = [System.Drawing.Color]::White
`$btnInstall.Location = New-Object System.Drawing.Point(288, (`$collapsedH - 52))
`$btnInstall.Size = New-Object System.Drawing.Size(80, 28)
`$form.Controls.Add(`$btnInstall)

`$btnClose.Add_Click({ `$form.Close() })

`$btnInstall.Add_Click({
    `$btnInstall.Enabled = `$false

    `$qgisProc = Get-Process -Name "qgis*" -ErrorAction SilentlyContinue
    if (`$qgisProc) {
        `$lblStatus.Text = "Feche o QGIS e clique em Instalar novamente."
        `$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(200, 100, 0)
        `$btnInstall.Enabled = `$true
        return
    }

    `$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(100, 100, 100)

    try {
        `$lblStatus.Text = "Extraindo arquivos..."
        `$progressBar.Value = 10
        [System.Windows.Forms.Application]::DoEvents()
        `$tempZip = Join-Path `$env:TEMP "ufpr_plugin_install.zip"
        [System.IO.File]::WriteAllBytes(`$tempZip, [Convert]::FromBase64String("$base64"))

        `$progressBar.Value = 45
        `$lblStatus.Text = "Removendo versao anterior..."
        [System.Windows.Forms.Application]::DoEvents()
        if (Test-Path `$pluginDst) { Remove-Item -Recurse -Force `$pluginDst }
        New-Item -ItemType Directory -Path `$pluginDst -Force | Out-Null

        `$progressBar.Value = 75
        `$lblStatus.Text = "Instalando plugin..."
        [System.Windows.Forms.Application]::DoEvents()
        Expand-Archive -Path `$tempZip -DestinationPath `$pluginDst -Force
        Remove-Item `$tempZip

        `$progressBar.Value = 100
        `$lblStatus.Text = "Instalado com sucesso."
        `$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 150, 80)
        `$btnInstall.Enabled = `$false
        `$lblSub.Text = "Ative em: Plugins > Gerenciar e Instalar Plugins."
    } catch {
        `$lblStatus.Text = "Erro: `$(`$_.Exception.Message)"
        `$lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(200, 0, 0)
        `$btnInstall.Enabled = `$true
    }
})

[System.Windows.Forms.Application]::Run(`$form)
"@
Set-Content -Path $tempPs1 -Value $installerContent -Encoding UTF8
Invoke-ps2exe -InputFile $tempPs1 -OutputFile $outputExe -NoConsole:$true -Title "UFPR Map Composer" -Version "1.0.0" *>$null
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
