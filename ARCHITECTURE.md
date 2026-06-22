# Estrutura do Projeto — UFPR Map Composer

Plugin QGIS que gera um **WebGIS completo** (React + OpenLayers) a partir das camadas do projeto QGIS atual. O resultado é uma aplicação web estática pronta para hospedar no GitHub Pages, Netlify ou qualquer servidor.

---

## Visão Geral do Fluxo

```
Usuário abre o QGIS
      ↓
Clica no ícone do plugin na barra de ferramentas
      ↓
Preenche o formulário (abas: Camadas, Mapa, Basemaps, Atributos, Documentos, Equipe)
      ↓
Clica em "Gerar WebGIS"
      ↓
Plugin exporta camadas vetoriais → GeoJSON
Plugin gera tiles XYZ de rasters → pasta public/
Plugin copia os templates e injeta os dados configurados
Plugin roda `npm install` + `npm run build`
      ↓
Pasta de saída com site estático pronto para publicar
```

---

## Árvore de Arquivos

```
ufpr-map-composer/
├── __init__.py                   ← Ponto de entrada do plugin QGIS
├── metadata.txt                  ← Metadados do plugin (nome, versão, autor…)
├── package.json                  ← Scripts Node.js (build do instalador)
├── build_installer.ps1           ← Script PowerShell que empacota o .exe
├── install_plugin.ps1            ← Script PowerShell que instala o plugin no QGIS
├── BUILD.md                      ← Como gerar o instalador
├── README.md                     ← Descrição do projeto
│
├── assets/
│   └── icon.svg                  ← Ícone do plugin (aparece na barra do QGIS)
│
├── core/                         ← Lógica principal do plugin (Python)
│   ├── __init__.py               ← Registra a classe UfprMapComposerDialog
│   ├── plugin.py                 ← Classe principal: inicializa o botão e abre o diálogo
│   ├── react_project_generator.py← Gera o projeto React substituindo placeholders nos templates
│   ├── export_vector_to_geojson.py← Exporta camada vetorial QGIS → GeoJSON (EPSG:4326)
│   └── dialog/                   ← Abas do formulário (cada arquivo = uma aba ou sub-recurso)
│       ├── __init__.py           ← Monta o diálogo unindo todos os Mixins
│       ├── mapa.py               ← Aba "Mapa": captura centro/zoom do canvas atual
│       ├── layers.py             ← Aba "Camadas": lista camadas do projeto com checkboxes
│       ├── basemaps.py           ← Aba "Basemaps": seleção de mapas base com preview
│       ├── attributes.py         ← Aba "Atributos": quais campos de cada camada exibir
│       ├── reports.py            ← Aba "Documentos": adiciona PDFs ao WebGIS
│       ├── team.py               ← Aba "Equipe": lista membros da equipe do projeto
│       ├── symbology.py          ← Editor de simbologia (cor, espessura, ícone por camada)
│       ├── point_icons.py        ← Catálogo de ícones para pontos + estilos padrão
│       ├── icon_paths.py         ← Paths SVG dos ícones FontAwesome (gerado pelo script CJS)
│       ├── raster_tiles_config.py← Sub-seção de zoom min/max para cada raster
│       ├── export_tiff_to_tiles.py← Converte raster TIFF → tiles XYZ via GDAL
│       └── widgets.py            ← Dados estáticos: lista de BASEMAPS disponíveis, helpers
│
├── templates/                    ← Projeto React que será copiado e personalizado
│   ├── index.html                ← HTML base (título injetado)
│   ├── package.json              ← Dependências do WebGIS (React, OpenLayers, Tailwind…)
│   ├── vite.config.ts            ← Configuração do bundler Vite
│   ├── tsconfig*.json            ← Configurações TypeScript
│   ├── eslint.config.js          ← Regras de lint
│   ├── extract_fa_paths.cjs      ← Script Node: extrai paths SVG do FontAwesome → icon_paths.py
│   ├── _gitignore                ← Template de .gitignore para o projeto gerado
│   └── src/
│       ├── main.tsx              ← Ponto de entrada React
│       ├── App.tsx / App.css     ← Componente raiz e estilo global
│       ├── index.css             ← Reset CSS / variáveis globais
│       ├── config.ts             ← Arquivo gerado: centro do mapa, zoom, basemaps ativos…
│       ├── georaster.d.ts        ← Tipagem do pacote georaster
│       ├── pages/
│       │   └── Home.tsx          ← Página principal: orquestra todos os componentes
│       ├── components/
│       │   ├── Map.tsx           ← Mapa OpenLayers: renderiza camadas, estilos, swipe, popups
│       │   ├── Sidebar.tsx       ← Painel lateral: toggle de camadas e grupos
│       │   ├── Header.tsx        ← Cabeçalho: título, logo, botões de menu
│       │   ├── Footer.tsx        ← Rodapé com créditos
│       │   ├── MapPanel.tsx      ← Painel flutuante desktop (Legenda, Download, etc.)
│       │   ├── MapPanelSheet.tsx ← Versão mobile do painel (bottom sheet)
│       │   ├── MapLayerToggle.tsx← Toggle individual de camada no mapa
│       │   ├── VectorLayerToggle.tsx← Toggle para camadas vetoriais
│       │   ├── MapLayerGallery.tsx← Galeria de mapas base para troca rápida
│       │   ├── MapLegend.tsx     ← Legenda visual das camadas
│       │   ├── LayerDownload.tsx ← Botão de download do GeoJSON por camada
│       │   ├── AttributeTable.tsx← Tabela de atributos (versão completa, redimensionável)
│       │   ├── AttributeTableSimple.tsx← Tabela de atributos (versão simplificada/mobile)
│       │   ├── ReportsMenu.tsx   ← Menu de documentos PDF linkados
│       │   ├── ShareMenu.tsx     ← Botão de compartilhamento de link
│       │   └── panel/
│       │       └── PanelContent.tsx← Conteúdo renderizado dentro do MapPanel (Legenda, Download…)
│       ├── data/
│       │   └── geodata.ts        ← Arquivo gerado: GeoJSON inline de todas as camadas vetoriais
│       ├── hooks/
│       │   └── useBreakpoint.ts  ← Hook: detecta se a tela é mobile ou desktop
│       ├── styles/
│       │   └── tokens.ts         ← Tokens de design (cores, espaçamentos do tema UFPR)
│       ├── types/
│       │   └── layers.ts         ← Tipos TypeScript: LayerDockItem, LayerStyle, PointStyle…
│       └── utils/
│           ├── Icons.ts          ← Re-exporta ícones FontAwesome usados no projeto
│           └── PointIcons.ts     ← Gera Data URL de marcador SVG para pontos no mapa
│
├── ui/
│   └── dialog.ui                 ← Layout do formulário (arquivo Qt Designer XML)
│
└── installer/
    ├── gui.ps1                   ← Interface gráfica do instalador Windows (WPF)
    └── logic.ps1                 ← Lógica de instalação: copia arquivos, registra plugin
```

---

## Detalhamento por Módulo

### `core/plugin.py` — Ponto de entrada no QGIS
- Registra o botão **"UFPR Map Composer — Gerar WebGIS"** na barra de ferramentas e no menu *Web*
- Ao ser clicado, instancia e abre o `UfprMapComposerDialog`

---

### `core/dialog/` — O formulário de configuração

O diálogo é montado combinando vários **Mixins** (cada arquivo = uma responsabilidade):

| Arquivo | Aba no formulário | O que faz |
|---|---|---|
| `mapa.py` | **Mapa** | Lê o centro e zoom atual do canvas do QGIS e preenche os campos automaticamente |
| `layers.py` | **Camadas** | Lista todas as camadas vetoriais e raster do projeto com checkbox para incluir/excluir |
| `basemaps.py` | **Basemaps** | Mostra os mapas base disponíveis com preview de tile em miniatura |
| `attributes.py` | **Atributos** | Para cada camada vetorial, permite escolher quais campos aparecem no popup do mapa |
| `reports.py` | **Documentos** | Adiciona PDFs que serão linkados no menu do WebGIS |
| `team.py` | **Equipe** | Cadastra nome e cargo dos membros da equipe (aparece no rodapé do WebGIS) |
| `symbology.py` | *(popup)* | Editor visual de cor, espessura, ícone e opacidade por camada |
| `raster_tiles_config.py` | *(sub-seção)* | Define zoom mínimo e máximo para a geração de tiles de cada raster |
| `export_tiff_to_tiles.py` | *(execução)* | Converte rasters TIFF para tiles XYZ usando GDAL (reprojeção para EPSG:3857 + gdal2tiles) |
| `widgets.py` | *(dados)* | Lista estática dos basemaps disponíveis (OSM, Google, Esri…) e helpers de URL |

---

### `core/export_vector_to_geojson.py` — Exportação vetorial
- Recebe uma camada QGIS e um caminho de saída
- Reprojecta para **EPSG:4326** (WGS-84) automaticamente
- Grava como **GeoJSON UTF-8**

---

### `core/react_project_generator.py` — Gerador do projeto React

É o coração da geração do WebGIS. A classe `WebGISGenerator`:

1. **Copia** toda a pasta `templates/` para o diretório de saída escolhido pelo usuário
2. **Processa** os arquivos dinâmicos substituindo tokens `{{PLACEHOLDER}}` pelos dados reais:
   - `{{LAYERS_ARRAY}}` → array TypeScript com todas as camadas configuradas
   - `{{DEFAULT_VISIBLE_SET}}` → quais camadas começam visíveis
   - `{{LAYER_ICON_IMPORTS}}` → imports dos ícones usados
3. **Grava** `src/config.ts` com centro do mapa, zoom, basemaps habilitados, flags de modo comparação etc.
4. **Grava** `src/data/geodata.ts` com os GeoJSONs das camadas vetoriais embutidos diretamente no código
5. **Cria** as pastas `public/Produtos/` e as subpastas de relatórios PDF

---

### `templates/src/` — O WebGIS em si (React + OpenLayers)

| Componente | Responsabilidade |
|---|---|
| `pages/Home.tsx` | Orquestra todos os estados: visibilidade de camadas, painel aberto, modo comparação, tabela de atributos |
| `components/Map.tsx` | Renderiza o mapa OpenLayers, aplica estilos vetoriais, gerencia swipe (modo comparação), exibe popups de atributos ao clicar |
| `components/Sidebar.tsx` | Painel lateral com toggles de camadas agrupadas |
| `components/Header.tsx` | Barra superior com logo, título do projeto e botões de menu |
| `components/MapPanel.tsx` | Container flutuante desktop para Legenda, Download, Documentos |
| `components/MapPanelSheet.tsx` | Versão mobile (bottom sheet) do mesmo painel |
| `components/MapLegend.tsx` | Renderiza a legenda visual de cada camada com cor/ícone |
| `components/AttributeTable.tsx` | Tabela de atributos redimensionável, abre ao clicar uma feição no mapa |
| `data/geodata.ts` | **Gerado automaticamente** — contém os GeoJSONs de todas as camadas |
| `config.ts` | **Gerado automaticamente** — configurações do mapa (centro, zoom, basemaps…) |
| `utils/PointIcons.ts` | Gera marcadores SVG coloridos com ícone FontAwesome para pontos no mapa |
| `hooks/useBreakpoint.ts` | Detecta breakpoint mobile/desktop para adaptar o layout |
| `types/layers.ts` | Tipagens TypeScript de camadas e estilos |

---

### `installer/` — Instalador Windows
- `gui.ps1` — Interface gráfica WPF com barra de progresso, botão de instalar e log de saída
- `logic.ps1` — Encontra a pasta de plugins do QGIS no sistema, copia os arquivos e ativa o plugin

---

## Como o WebGIS gerado funciona

```
Usuário acessa a URL do site
        ↓
React carrega config.ts  →  define centro, zoom, basemaps disponíveis
React carrega geodata.ts →  GeoJSON das camadas vetoriais já embutido
        ↓
OpenLayers renderiza o mapa com os tiles do basemap selecionado
OpenLayers adiciona camadas vetoriais com os estilos definidos no QGIS
        ↓
Usuário pode:
  - Ativar/desativar camadas (Sidebar)
  - Trocar o mapa base (galeria)
  - Clicar em feições para ver atributos (popup / tabela)
  - Baixar GeoJSON de cada camada
  - Acessar PDFs de documentos
  - Usar modo de comparação (swipe entre dois basemaps)
```

---

## Dependências principais

| Tecnologia | Onde | Para quê |
|---|---|---|
| **Python 3 + QGIS API** | `core/` | Ler camadas, exportar dados, rodar o formulário Qt |
| **PyQt5** | `core/` | Interface do formulário (Qt Designer) |
| **GDAL** | `core/dialog/export_tiff_to_tiles.py` | Reprojetar e gerar tiles de rasters |
| **Node.js / npm** | geração | Compilar o projeto React gerado |
| **React 18** | `templates/src/` | Framework da interface web |
| **OpenLayers** | `templates/src/components/Map.tsx` | Motor do mapa interativo |
| **Tailwind CSS** | `templates/src/` | Estilização utilitária |
| **Vite** | `templates/` | Bundler e build tool |
| **FontAwesome** | `templates/src/utils/Icons.ts` | Ícones de camadas e da interface |
