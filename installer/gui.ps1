# installer/gui.ps1
# Monta a janela do instalador (controles, estilos, botoes).
# Este arquivo nao roda sozinho — e carregado pelo build_installer.ps1.
# Variaveis que precisam existir antes: $collapsedH, $expandedH, $panelH

Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$ProgressPreference = 'SilentlyContinue'

# Atalhos para nao repetir nomes compridos toda hora
function pt($x, $y) { [Drawing.Point]::new($x, $y) }           # posicao x,y
function sz($w, $h) { [Drawing.Size]::new($w, $h) }            # tamanho w x h
function rgb($r, $g, $b) { [Drawing.Color]::FromArgb($r, $g, $b) }  # cor RGB
function fnt($f, $s, $bold = $false) {
    # fonte (nome, tamanho, negrito?)
    if ($bold) { [Drawing.Font]::new($f, $s, [Drawing.FontStyle]::Bold) }
    else { [Drawing.Font]::new($f, $s) }
}
# Cria um controle WinForms, aplica as propriedades do hashtable e adiciona ao pai
function ctrl($type, [hashtable]$p, $parent = $script:form) {
    $c = New-Object "System.Windows.Forms.$type"
    foreach ($kv in $p.GetEnumerator()) { $c.($kv.Key) = $kv.Value }
    $parent.Controls.Add($c); $c
}

# Janela principal (altura inicial = colapsada)
$form = New-Object System.Windows.Forms.Form -Property @{
    Text = "UFPR Map Composer"; ClientSize = sz 400 $collapsedH
    StartPosition = "CenterScreen"; FormBorderStyle = "FixedSingle"
    MaximizeBox = $false; MinimizeBox = $false; BackColor = rgb 250 250 250
}

# Titulo grande no topo
$lblTitle = ctrl Label @{
    Text      = "UFPR Map Composer"
    Font      = fnt "Segoe UI" 15
    ForeColor = rgb 30 30 30
    AutoSize  = $true
    Location  = pt 32 28
}

# Subtitulo menor, cinza
$lblSub = ctrl Label @{
    Text      = "Instalador do plugin para QGIS"
    Font      = fnt "Segoe UI" 9
    ForeColor = rgb 140 140 140
    AutoSize  = $true
    Location  = pt 33 60
}

ctrl Panel @{ BackColor = rgb 220 220 220; Location = pt 32 88; Size = sz 336 1 } | Out-Null  # linha separadora

# Texto de status que muda durante a instalacao
$lblStatus = ctrl Label @{
    Text      = "Pronto para instalar."
    Font      = fnt "Segoe UI" 9
    ForeColor = rgb 100 100 100
    AutoSize  = $true
    Location  = pt 33 102
}

# Barra de progresso fina (6px) preenchida pelo logic.ps1
$progressBar = ctrl ProgressBar @{
    Location = pt 32 128
    Size = sz 336 6
    Minimum = 0; Maximum = 100; Value = 0
    Style = "Continuous"
}

# Link clicavel que expande/colapsa o painel de detalhes
$lnkDetails = ctrl LinkLabel @{
    Text      = "▶ Mais informacoes"
    Font      = fnt "Segoe UI" 8
    LinkColor = rgb 0 122 255
    AutoSize  = $true
    Location  = pt 33 150
}

# Painel oculto que aparece ao clicar em "Mais informacoes"
$panelDetails = ctrl Panel @{
    Location  = pt 32 178
    Size      = sz 336 $panelH
    Visible   = $false
    BackColor = rgb 245 245 245
}

# Helpers para adicionar linhas de texto e links dentro do painel de detalhes
function dlbl($t, $y, $bold = $false) { ctrl Label @{ Text = $t; Font = fnt "Segoe UI" 8 $bold; ForeColor = rgb 60 60 60; Location = pt 10 $y; Size = sz 316 16 } $panelDetails | Out-Null }
function dlnk($t, $url, $y) {
    $l = ctrl LinkLabel @{ Text = $t; Font = fnt "Segoe UI" 8; Location = pt 10 $y; AutoSize = $true; LinkColor = rgb 0 122 255; Tag = $url } $panelDetails
    $l.Add_LinkClicked({ [Diagnostics.Process]::Start($this.Tag) | Out-Null })  # abre o link no navegador
}

# Conteudo do painel de detalhes
dlbl "Onde o plugin e instalado:" 10 $true
dlbl "%APPDATA%\QGIS\QGIS3\profiles\default\python\plugins\ufpr_map_composer" 26
ctrl Panel @{ BackColor = rgb 210 210 210; Location = pt 10 56; Size = sz 316 1 } $panelDetails | Out-Null
dlbl "Dependencias necessarias:" 66 $true
dlbl "• QGIS 3.16 ou superior" 82
dlbl "• Node.js (para gerar e publicar o WebGIS)" 98
dlnk "  Baixar Node.js (nodejs.org)" "https://nodejs.org" 112
dlnk "  Baixar QGIS (qgis.org)"     "https://qgis.org/download" 130
dlbl "Apos instalar, ative em: Plugins > Gerenciar e Instalar Plugins." 152

# Logica de expandir/colapsar a janela ao clicar em "Mais informacoes"
$script:expanded = $false
$lnkDetails.Add_LinkClicked({
        $script:expanded = -not $script:expanded
        $h = if ($script:expanded) { $expandedH } else { $collapsedH }
        $lnkDetails.Text = if ($script:expanded) { "▼ Menos informacoes" } else { "▶ Mais informacoes" }
        $panelDetails.Visible = $script:expanded
        $form.ClientSize = sz 400 $h
        $btnClose.Location = pt 200 ($h - 52)
        $btnInstall.Location = pt 288 ($h - 52)
    })

# Botao cinza que fecha a janela
$btnClose = ctrl Button @{
    Text = "Fechar"; Font = fnt "Segoe UI" 9; FlatStyle = "Flat"
    BackColor = rgb 245 245 245; ForeColor = rgb 60 60 60
    Location = pt 200 ($collapsedH - 52); Size = sz 80 28
}
$btnClose.FlatAppearance.BorderColor = rgb 200 200 200
$btnClose.FlatAppearance.BorderSize = 1
$btnClose.Add_Click({ $form.Close() })

# Botao azul que dispara a instalacao (handler definido em logic.ps1)
$btnInstall = ctrl Button @{
    Text = "Instalar"; Font = fnt "Segoe UI" 9; FlatStyle = "Flat"
    BackColor = rgb 0 122 255; ForeColor = [Drawing.Color]::White
    Location = pt 288 ($collapsedH - 52); Size = sz 80 28
}
$btnInstall.FlatAppearance.BorderSize = 0
