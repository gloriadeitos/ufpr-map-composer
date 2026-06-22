# ufpr-map-composer

Plugin QGIS que gera um **WebGIS completo e estático** a partir das camadas do seu projeto atual — sem escrever código.

O resultado é uma aplicação web em React + OpenLayers com visual glassmorphism no estilo UFPR-CTM, pronta para publicar no GitHub Pages, Netlify ou qualquer hospedagem estática.

---

## O que o plugin faz

1. Você configura o WebGIS pelo formulário dentro do QGIS (camadas, estilos, basemaps, atributos, documentos e equipe)
2. Clica em **Gerar WebGIS**
3. O plugin exporta as camadas vetoriais como GeoJSON, converte rasters em tiles XYZ e gera um projeto React já configurado
4. O projeto é compilado automaticamente com `npm run build`
5. A pasta de saída contém o site estático pronto para publicar

---

## Funcionalidades do WebGIS gerado

- Mapa interativo com **OpenLayers**
- Ativar/desativar camadas individualmente
- Trocar **mapa base** (OpenStreetMap, CartoDB, Esri Satélite, Esri Topográfico, HOT…)
- **Modo comparação** com swipe entre dois basemaps
- Popup e tabela de atributos ao clicar em feições
- Download de GeoJSON por camada
- Menu de **documentos PDF** linkados
- Seção de equipe no rodapé
- Layout responsivo (desktop e mobile)
- Estilo glassmorphism com paleta de cores UFPR

---

## Pré-requisitos

- **QGIS 3.16** ou superior
- **Node.js** instalado (necessário apenas para compilar o WebGIS gerado)

---

## Instalação

### Opção 1 — Instalador automático (Windows)

1. Gere o instalador rodando `npm run build` na raiz do projeto (veja [BUILD.md](BUILD.md))
2. Execute `dist\install_plugin.exe`
3. O instalador encontra a pasta de plugins do QGIS e copia tudo automaticamente

### Opção 2 — Manual

1. Copie a pasta do plugin para o diretório de plugins do QGIS:
   ```
   %APPDATA%\QGIS\QGIS3\profiles\default\python\plugins\ufpr-map-composer\
   ```
2. Ative o plugin em **QGIS → Complementos → Gerenciar e Instalar Complementos**

---

## Como usar

1. Abra um projeto no QGIS com as camadas que deseja publicar
2. Clique no ícone **UFPR Map Composer** na barra de ferramentas (ou acesse pelo menu *Web*)
3. Preencha as abas do formulário:

| Aba | O que configurar |
|---|---|
| **Mapa** | Centro e zoom inicial (preenchido automaticamente pelo canvas atual) |
| **Camadas** | Quais camadas incluir, ordem, rótulo e estilo visual |
| **Basemaps** | Quais mapas base habilitar e qual será o padrão |
| **Atributos** | Quais campos de cada camada aparecem no popup |
| **Documentos** | PDFs que serão linkados no menu do WebGIS |
| **Equipe** | Membros da equipe exibidos no rodapé |

4. Clique em **Gerar WebGIS** e escolha a pasta de destino
5. Aguarde a compilação — ao final, a pasta contém o site pronto

---

## Publicando o WebGIS

A pasta de saída é um site estático. Para publicar:

**GitHub Pages**
```bash
git init
git add .
git commit -m "WebGIS inicial"
gh repo create meu-webgis --public --source=. --push
# Ative GitHub Pages nas configurações do repositório apontando para a branch main
```

**Netlify**
Arraste a pasta de saída para [app.netlify.com/drop](https://app.netlify.com/drop).

**Qualquer servidor**
Copie os arquivos para a raiz pública do servidor (Apache, Nginx, etc.).

---

## Basemaps disponíveis

| ID | Nome |
|---|---|
| `osm` | OpenStreetMap |
| `carto_light` | CartoDB Positron (claro, minimalista) |
| `carto_dark` | CartoDB Dark Matter (escuro, elegante) |
| `esri_satellite` | Esri Satélite (imagem aérea) |
| `esri_topo` | Esri Topográfico |
| `osm_humanitarian` | OpenStreetMap Humanitário (HOT) |

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Plugin QGIS | Python 3 + PyQt5 |
| Exportação de dados | GDAL, QgsVectorFileWriter |
| Interface do formulário | Qt Designer (`.ui`) |
| WebGIS — framework | React 18 |
| WebGIS — mapa | OpenLayers |
| WebGIS — estilos | Tailwind CSS + Glassmorphism |
| WebGIS — build | Vite |
| Ícones | FontAwesome |
| Instalador Windows | PowerShell + WPF |

---

## Estrutura do projeto

Veja [ARCHITECTURE.md](ARCHITECTURE.md) para a documentação detalhada de cada arquivo e módulo.

---

## Informações

- **QGIS mínimo:** 3.16
- **Autora:** Glória Deitos
- **Repositório:** https://github.com/gloriadeitos/ufpr-map-composer
