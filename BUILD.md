# Como gerar o instalador

## Pré-requisitos

- Node.js instalado
- Internet na primeira vez (para baixar dependências)

---

## Passo a passo

Abra o terminal do VS Code na pasta do projeto e rode:

### 1. Instalar dependências (apenas na primeira vez)

```bash
npm install
```

> Na primeira vez pode aparecer uma pergunta sobre NuGet — confirme com **S**.

### 2. Gerar o instalador

```bash
npm run build
```

O instalador será gerado em:

```
dist\install_plugin.exe
```

---

## Como distribuir

Copie a **pasta inteira do projeto** (o `.exe` precisa dos arquivos ao redor para funcionar) e entregue para quem for usar.

A pessoa só precisa dar **dois cliques** no `dist\install_plugin.exe` — sem precisar abrir terminal ou instalar nada.

---

## Atualizando após mudanças no código

Sempre que editar o plugin, gere novamente:

```bash
npm run build
```

O `install_plugin.exe` será sobrescrito com a versão atualizada.
