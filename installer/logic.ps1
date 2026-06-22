# installer/logic.ps1
# Define o que acontece ao clicar em "Instalar".
# Este arquivo nao roda sozinho — e carregado pelo build_installer.ps1 apos gui.ps1.
# Variaveis necessarias: $pluginDst, $base64Data
# Controles necessarios (criados em gui.ps1): $btnInstall, $lblStatus, $progressBar, $lblSub

# Atualiza o texto de status e a barra de progresso de uma vez so
function step($msg, $pct) {
    $lblStatus.Text = $msg
    $progressBar.Value = $pct
    [System.Windows.Forms.Application]::DoEvents()  # atualiza a tela antes de continuar
}

$btnInstall.Add_Click({ # executado quando o usuario clica em Instalar
        $btnInstall.Enabled = $false  # desabilita para nao clicar duas vezes
        # Bloqueia se o QGIS estiver aberto (os arquivos estariam em uso)
        if (Get-Process -Name "qgis*" -ErrorAction SilentlyContinue) {
            $lblStatus.Text = "Feche o QGIS e clique em Instalar novamente."
            $lblStatus.ForeColor = rgb 200 100 0
            $btnInstall.Enabled = $true
            return
        }
        $lblStatus.ForeColor = rgb 100 100 100
        try {
            $tempZip = Join-Path $env:TEMP "ufpr_plugin_install.zip"

            # Passo 1: descompacta o zip embedado (base64 → bytes → arquivo)
            step "Extraindo arquivos..." 10
            [IO.File]::WriteAllBytes($tempZip, [Convert]::FromBase64String($base64Data))

            # Passo 2: apaga a versao antiga do plugin, se existir
            step "Removendo versao anterior..." 45
            if (Test-Path $pluginDst) { Remove-Item -Recurse -Force $pluginDst }
            New-Item -ItemType Directory -Path $pluginDst -Force | Out-Null

            # Passo 3: extrai os arquivos do plugin para a pasta do QGIS
            step "Instalando plugin..." 75
            Expand-Archive -Path $tempZip -DestinationPath $pluginDst -Force
            Remove-Item $tempZip  # limpa o zip temporario

            # Sucesso
            step "Instalado com sucesso." 100
            $lblStatus.ForeColor = rgb 0 150 80
            $btnInstall.Enabled = $false
            $lblSub.Text = "Ative em: Plugins > Gerenciar e Instalar Plugins."
        }
        catch {
            # Mostra a mensagem de erro e reabilita o botao para tentar de novo
            $lblStatus.Text = "Erro: $($_.Exception.Message)"
            $lblStatus.ForeColor = rgb 200 0 0
            $btnInstall.Enabled = $true
        }
    })
