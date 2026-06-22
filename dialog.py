# -*- coding: utf-8 -*-
"""
Export dialog for UFPR Map Composer.
Collects project settings, layer selection and team members,
then triggers the WebGIS export and optional npm build.
"""
import os
import shutil
import subprocess

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QDialog, QFileDialog, QHBoxLayout, QPushButton,
    QTableWidget, QTableWidgetItem, QCheckBox, QComboBox,
    QHeaderView, QAbstractItemView, QMessageBox,
    QWidget, QProgressDialog, QApplication,
    QButtonGroup, QRadioButton,
)
from qgis.PyQt.QtGui import QColor
from qgis.PyQt.QtCore import Qt, QSize
from qgis.core import (
    QgsProject, QgsWkbTypes, QgsVectorLayer, QgsMapLayer,
    QgsCoordinateReferenceSystem, QgsCoordinateTransform,
    QgsRectangle,
)

# Default layer colours (Tailwind palette)
_COLORS = [
    '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444',
    '#10B981', '#06B6D4', '#F97316', '#EC4899',
    '#6366F1', '#14B8A6', '#84CC16', '#A855F7',
]

# Available basemaps (XYZ tile services)
_BASEMAPS = [
    {
        'id': 'osm',
        'label': 'OpenStreetMap (padrão)',
        'url': 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'attribution': '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'enabled': True, 'default': True,
    },
    {
        'id': 'carto_light',
        'label': 'CartoDB Positron (claro, minimalista)',
        'url': 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'attribution': '© <a href="https://carto.com/">CartoDB</a>',
        'enabled': True, 'default': False,
    },
    {
        'id': 'carto_dark',
        'label': 'CartoDB Dark Matter (escuro, elegante)',
        'url': 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'attribution': '© <a href="https://carto.com/">CartoDB</a>',
        'enabled': False, 'default': False,
    },
    {
        'id': 'esri_satellite',
        'label': 'Esri Satélite (imagem aérea)',
        'url': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'attribution': '© <a href="https://www.esri.com/">Esri</a>',
        'enabled': True, 'default': False,
    },
    {
        'id': 'esri_topo',
        'label': 'Esri Topográfico',
        'url': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        'attribution': '© <a href="https://www.esri.com/">Esri</a>',
        'enabled': False, 'default': False,
    },
    {
        'id': 'osm_humanitarian',
        'label': 'OpenStreetMap Humanitário (HOT)',
        'url': 'https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        'attribution': '© OpenStreetMap contributors, Tiles by HOT',
        'enabled': False, 'default': False,
    },
]


def _tile_preview_url(template: str) -> str:
    """Derives a single concrete tile URL (z=5, x=11, y=18) from an XYZ template."""
    import re
    # Replace subdomain placeholders like {a-c} or {a-d} with first letter
    url = re.sub(r'\{[a-z]-[a-z]\}', lambda m: m.group(0)[1], template)
    url = url.replace('{z}', '5').replace('{x}', '11').replace('{y}', '18')
    return url


def _make_color_btn(color: str, parent=None) -> QPushButton:
    btn = QPushButton(parent)
    btn.setFixedSize(QSize(32, 24))
    btn.setToolTip('Clique para alterar a cor')
    btn.setStyleSheet(
        f'background-color: {color}; border: 1px solid #ccc; border-radius: 4px;'
    )
    btn.setProperty('color', color)
    return btn


class _ColorBtn(QPushButton):
    """Button that opens a colour picker and stores the chosen colour."""

    def __init__(self, color: str, parent=None):
        super().__init__(parent)
        self.setFixedSize(QSize(32, 24))
        self.setToolTip('Clique para alterar a cor')
        self._set_color(color)
        self.clicked.connect(self._pick)

    def _set_color(self, c: str):
        self._color = c
        # Use class selector to prevent stylesheet from cascading to parent widgets
        self.setStyleSheet(
            f'QPushButton {{ background-color: {c}; border: 1px solid #aaa; border-radius: 4px; }}'
        )

    def color(self) -> str:
        return self._color

    def _pick(self):
        from qgis.PyQt.QtWidgets import QColorDialog
        c = QColorDialog.getColor(QColor(self._color), self, 'Escolher cor')
        if c.isValid():
            self._set_color(c.name())


class UfprMapComposerDialog(QDialog):

    _GITHUB_URL = 'https://github.com/gloriadeitos/ufpr-map-composer'

    def __init__(self, iface, parent=None):
        super().__init__(parent)
        self.iface = iface

        # Carrega o layout definido no Qt Designer (dialog.ui)
        ui_path = os.path.join(os.path.dirname(__file__), 'dialog.ui')
        uic.loadUi(ui_path, self)

        # Estado interno
        self._attr_data = {}
        self._basemap_default_group = QButtonGroup(self.basemap_table)

        self._setup_widgets()      # valores iniciais e configuracoes de tabela
        self._connect_signals()    # conecta botoes e combos
        self._populate_basemaps()  # preenche linhas da tabela de mapas base
        self._populate_layers()    # preenche linhas com as camadas do projeto QGIS

    # ─────────────────────────────────────────────────────────
    # Inicializacao pos-loadUi
    # ─────────────────────────────────────────────────────────

    def _setup_widgets(self):
        """Configura valores padrao e propriedades que nao cabem no .ui."""
        # Valores iniciais dos campos de texto
        self.title_edit.setText(QgsProject.instance().title() or 'WebSIG')
        self.subtitle_edit.setText('Cadastro Técnico Multifinalitário')

        # Status do Node.js (verificado em _run_export, nao precisa de widget)

        # Tabela de camadas: larguras e modos de redimensionamento
        hh = self.layers_table.horizontalHeader()
        hh.setSectionResizeMode(QHeaderView.Fixed)
        hh.setSectionResizeMode(1, QHeaderView.Stretch)
        hh.setSectionResizeMode(2, QHeaderView.Stretch)
        hh.setMinimumSectionSize(0)
        self.layers_table.setColumnWidth(0, 52)   # Incluir
        self.layers_table.setColumnWidth(3, 52)   # Cor
        self.layers_table.setColumnWidth(4, 80)   # Inicia visível
        self.layers_table.setEditTriggers(
            QAbstractItemView.DoubleClicked | QAbstractItemView.SelectedClicked
        )
        self.layers_table.setSelectionBehavior(QAbstractItemView.SelectRows)

        # Tabela de atributos
        hh2 = self.attr_table.horizontalHeader()
        hh2.setSectionResizeMode(1, QHeaderView.Stretch)
        hh2.setSectionResizeMode(2, QHeaderView.Stretch)
        self.attr_table.setColumnWidth(0, 65)
        self.attr_table.setEditTriggers(
            QAbstractItemView.DoubleClicked | QAbstractItemView.SelectedClicked
        )

        # Tabela de mapas base
        hh3 = self.basemap_table.horizontalHeader()
        hh3.setSectionResizeMode(2, QHeaderView.Stretch)
        self.basemap_table.setColumnWidth(0, 55)
        self.basemap_table.setColumnWidth(1, 60)
        self.basemap_table.setColumnWidth(3, 88)  # preview
        self.basemap_table.setSelectionBehavior(QAbstractItemView.SelectRows)

        # Tabela de equipe
        hh4 = self.team_table.horizontalHeader()
        hh4.setSectionResizeMode(0, QHeaderView.Stretch)
        hh4.setSectionResizeMode(1, QHeaderView.Stretch)

    def _connect_signals(self):
        """Conecta todos os eventos de botoes e combos."""
        self.btn_github.clicked.connect(
            lambda: __import__('webbrowser').open(self._GITHUB_URL)
        )
        self.btn_browse.clicked.connect(self._browse_output)
        self.btn_export.clicked.connect(self._run_export)
        self.btn_add_member.clicked.connect(self._add_team_row)
        self.btn_remove_member.clicked.connect(self._remove_team_row)
        self.btn_select_all_layers.clicked.connect(
            lambda: self._set_all_layers_checked(True))
        self.btn_deselect_all_layers.clicked.connect(
            lambda: self._set_all_layers_checked(False))
        self.attr_layer_combo.currentIndexChanged.connect(
            self._on_attr_layer_changed)

        # Botoes de ajuda (titulo, mensagem)
        helps = [
            (self.btn_help_camadas, 'Camadas',
             'Cada linha é uma camada vetorial do projeto QGIS atual.\n'
             '\n'
             'Incluir\n'
             '  Marca quais camadas vão aparecer no WebGIS.\n'
             '\n'
             'Label WebGIS\n'
             '  Nome exibido no painel lateral. Editável.\n'
             '\n'
             'Cor\n'
             '  Cor dos símbolos no mapa. Clique para alterar.\n'
             '\n'
             'Inicia visível\n'
             '  Se marcado, a camada começa ligada ao abrir o WebGIS.\n'
             '  O usuário pode ligar e desligar pelo painel lateral.\n'
             '\n'
             'Sistema de referência\n'
             '  O plugin converte qualquer sistema para EPSG:4326\n'
             '  (WGS 84, o padrão de latitude e longitude usado por GPS\n'
             '  e pela web) automaticamente ao exportar.'),
            (self.btn_help_atributos, 'Atributos no Popup',
             'Escolha quais campos de cada camada aparecem no popup\n'
             'quando o usuário clica numa feição no mapa.\n\n'
             '• ✓ Incluir — campo aparece no popup\n'
             '• Label — nome amigável exibido (ex: "Área m²")\n'
             '  Clique duas vezes na célula "Label" para editar.\n\n'
             'Campos não marcados são ignorados no WebGIS.'),
            (self.btn_help_mapabase, 'Mapa Base',
             'Mapas base são as camadas de fundo (ruas, satélite, etc.).\n\n'
             '• Ativar — inclui na lista de opções do WebGIS\n'
             '• Padrão — qual mapa abre ao entrar no WebGIS\n\n'
             'Fontes disponíveis (todas gratuitas):\n'
             '• OpenStreetMap — mapa de ruas colaborativo\n'
             '• CartoDB Positron — minimalista, fundo claro\n'
             '• CartoDB Dark Matter — elegante, fundo escuro\n'
             '• Esri Satélite — imagem aérea de alta resolução\n'
             '• Esri Topográfico — mapa com relevo\n'
             '• OSM Humanitário — foco em infraestrutura\n\n'
             'Apenas mapas "Ativados" podem ser definidos como Padrão.'),
            (self.btn_help_output, 'Pasta de saída',
             'Escolha uma pasta vazia onde o projeto WebGIS será gerado.\n\n'
             'O resultado é a pasta dist/ com index.html e os assets.\n'
             'Basta abrir o index.html no navegador ou publicar num servidor.'),
        ]
        for btn, title, text in helps:
            btn.setFixedSize(QSize(22, 22))
            btn.clicked.connect(lambda _=False, t=title, m=text:
                                QMessageBox.information(self, t, m))

    def _populate_basemaps(self):
        """Preenche a tabela de mapas base com checkboxes e radio buttons."""
        from qgis.PyQt.QtWidgets import QLabel
        for row, bm in enumerate(_BASEMAPS):
            self.basemap_table.insertRow(row)
            self.basemap_table.setRowHeight(row, 56)
            # Col 0: checkbox Ativar
            en_chk = QCheckBox()
            en_chk.setChecked(bm['enabled'])
            en_chk.stateChanged.connect(self._update_basemap_default_state)
            en_w = QWidget()
            en_l = QHBoxLayout(en_w)
            en_l.addWidget(en_chk)
            en_l.setAlignment(Qt.AlignCenter)
            en_l.setContentsMargins(0, 0, 0, 0)
            self.basemap_table.setCellWidget(row, 0, en_w)
            # Col 1: radio Padrao
            def_radio = QRadioButton()
            def_radio.setChecked(bm.get('default', False))
            self._basemap_default_group.addButton(def_radio, row)
            def_w = QWidget()
            def_l = QHBoxLayout(def_w)
            def_l.addWidget(def_radio)
            def_l.setAlignment(Qt.AlignCenter)
            def_l.setContentsMargins(0, 0, 0, 0)
            self.basemap_table.setCellWidget(row, 1, def_w)
            # Col 2: nome (somente leitura)
            name_item = QTableWidgetItem(bm['label'])
            name_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            self.basemap_table.setItem(row, 2, name_item)
            # Col 3: minipreview (carregado assincronamente)
            prev_lbl = QLabel('carregando...')
            prev_lbl.setFixedSize(QSize(86, 52))
            prev_lbl.setAlignment(Qt.AlignCenter)
            prev_lbl.setStyleSheet('color: #888; font-size: 9px;')
            self.basemap_table.setCellWidget(row, 3, prev_lbl)
        # Inicia carregamento dos thumbnails em background
        self._load_basemap_previews()

    def _load_basemap_previews(self):
        """Busca tiles de preview para cada mapa base via rede."""
        from qgis.core import QgsNetworkAccessManager
        from qgis.PyQt.QtNetwork import QNetworkRequest
        from qgis.PyQt.QtCore import QUrl
        self._preview_replies = {}
        for row, bm in enumerate(_BASEMAPS):
            url = _tile_preview_url(bm.get('url', ''))
            if not url:
                continue
            lbl = self.basemap_table.cellWidget(row, 3)
            if not lbl:
                continue
            req = QNetworkRequest(QUrl(url))
            req.setRawHeader(b'User-Agent', b'QGIS UFPR Map Composer Plugin')
            reply = QgsNetworkAccessManager.instance().get(req)
            reply.finished.connect(
                lambda r=reply, l=lbl: self._on_preview_loaded(r, l)
            )
            self._preview_replies[row] = reply

    def _on_preview_loaded(self, reply, label):
        """Recebe tile PNG e exibe no QLabel de preview."""
        from qgis.PyQt.QtGui import QPixmap
        data = reply.readAll()
        pix = QPixmap()
        pix.loadFromData(data)
        if not pix.isNull():
            pix = pix.scaled(86, 52, Qt.KeepAspectRatio,
                             Qt.SmoothTransformation)
            label.setText('')
            label.setPixmap(pix)
        else:
            label.setText('sem preview')
        reply.deleteLater()

    # ─────────────────────────────────────────────────────────
    # Layer population
    # ─────────────────────────────────────────────────────────

    def _populate_layers(self):
        layers = [
            lyr for lyr in QgsProject.instance().mapLayers().values()
            if lyr.type() == QgsMapLayer.VectorLayer
        ]
        self.layers_table.setRowCount(len(layers))
        geom_labels = {
            QgsWkbTypes.PolygonGeometry: 'polygon',
            QgsWkbTypes.LineGeometry: 'line',
            QgsWkbTypes.PointGeometry: 'point',
            QgsWkbTypes.NullGeometry: 'polygon',
            QgsWkbTypes.UnknownGeometry: 'polygon',
        }
        self.attr_layer_combo.blockSignals(True)
        self.attr_layer_combo.clear()
        color_idx = 0
        for row, lyr in enumerate(layers):
            # Col 0: include checkbox
            chk = QCheckBox()
            chk.setChecked(True)
            chk_w = QWidget()
            chk_l = QHBoxLayout(chk_w)
            chk_l.addWidget(chk)
            chk_l.setAlignment(Qt.AlignCenter)
            chk_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 0, chk_w)
            # Col 1: QGIS name (read-only)
            name_item = QTableWidgetItem(lyr.name())
            name_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            name_item.setData(Qt.UserRole, lyr.id())
            self.layers_table.setItem(row, 1, name_item)
            # Col 2: label (editable)
            self.layers_table.setItem(row, 2, QTableWidgetItem(lyr.name()))
            # Col 3: color (centrado)
            color = _COLORS[color_idx % len(_COLORS)]
            color_idx += 1
            color_btn = _ColorBtn(color)
            color_w = QWidget()
            color_l = QHBoxLayout(color_w)
            color_l.addWidget(color_btn)
            color_l.setAlignment(Qt.AlignCenter)
            color_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 3, color_w)
            # Col 4: visible by default (geometria detectada automaticamente)
            vis_chk = QCheckBox()
            vis_chk.setChecked(True)
            vis_w = QWidget()
            vis_l = QHBoxLayout(vis_w)
            vis_l.addWidget(vis_chk)
            vis_l.setAlignment(Qt.AlignCenter)
            vis_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 4, vis_w)
            # Init attribute data
            layer_id = lyr.id()
            self.attr_layer_combo.addItem(lyr.name(), layer_id)
            if layer_id not in self._attr_data:
                skip = {'fid', 'ogc_fid', 'id'}
                self._attr_data[layer_id] = [
                    {
                        'key': f.name(),
                        'label': f.displayName() or f.name(),
                        'include': f.name().lower() not in skip,
                    }
                    for f in lyr.fields()
                ]
        self.attr_layer_combo.blockSignals(False)
        if self.attr_layer_combo.count() > 0:
            self._on_attr_layer_changed(0)

    # ─────────────────────────────────────────────────────────
    # Attribute helpers
    # ─────────────────────────────────────────────────────────

    def _on_attr_layer_changed(self, index: int):
        self._save_attr_table()
        layer_id = self.attr_layer_combo.itemData(index)
        if not layer_id:
            self.attr_table.setRowCount(0)
            return
        fields = self._attr_data.get(layer_id, [])
        self.attr_table.setRowCount(len(fields))
        for row, f in enumerate(fields):
            chk = QCheckBox()
            chk.setChecked(f['include'])
            chk_w = QWidget()
            chk_l = QHBoxLayout(chk_w)
            chk_l.addWidget(chk)
            chk_l.setAlignment(Qt.AlignCenter)
            chk_l.setContentsMargins(0, 0, 0, 0)
            self.attr_table.setCellWidget(row, 0, chk_w)
            key_item = QTableWidgetItem(f['key'])
            key_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            self.attr_table.setItem(row, 1, key_item)
            self.attr_table.setItem(row, 2, QTableWidgetItem(f['label']))

    def _save_attr_table(self):
        if self.attr_layer_combo.count() == 0:
            return
        layer_id = self.attr_layer_combo.currentData()
        if not layer_id or layer_id not in self._attr_data:
            return
        saved = []
        for row in range(self.attr_table.rowCount()):
            chk_w = self.attr_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            key_item = self.attr_table.item(row, 1)
            label_item = self.attr_table.item(row, 2)
            if not key_item:
                continue
            saved.append({
                'key': key_item.text(),
                'label': label_item.text() if label_item else key_item.text(),
                'include': chk.isChecked() if chk else True,
            })
        self._attr_data[layer_id] = saved

    # ─────────────────────────────────────────────────────────
    # Basemap helpers
    # ─────────────────────────────────────────────────────────

    def _update_basemap_default_state(self):
        for row in range(self.basemap_table.rowCount()):
            en_w = self.basemap_table.cellWidget(row, 0)
            def_w = self.basemap_table.cellWidget(row, 1)
            if not (en_w and def_w):
                continue
            en_chk = en_w.findChild(QCheckBox)
            def_radio = def_w.findChild(QRadioButton)
            if en_chk and def_radio:
                enabled = en_chk.isChecked()
                def_radio.setEnabled(enabled)
                if not enabled and def_radio.isChecked():
                    def_radio.setChecked(False)
                    # Auto-select first enabled as new default
                    for r2 in range(self.basemap_table.rowCount()):
                        en_w2 = self.basemap_table.cellWidget(r2, 0)
                        def_w2 = self.basemap_table.cellWidget(r2, 1)
                        if en_w2 and def_w2:
                            chk2 = en_w2.findChild(QCheckBox)
                            rad2 = def_w2.findChild(QRadioButton)
                            if chk2 and rad2 and chk2.isChecked():
                                rad2.setChecked(True)
                                break

    # ─────────────────────────────────────────────────────────
    # Team member helpers
    # ─────────────────────────────────────────────────────────

    def _add_team_row(self):
        row = self.team_table.rowCount()
        self.team_table.insertRow(row)
        self.team_table.setItem(row, 0, QTableWidgetItem(''))
        self.team_table.setItem(row, 1, QTableWidgetItem(''))

    def _remove_team_row(self):
        rows = sorted(
            set(idx.row() for idx in self.team_table.selectedIndexes()),
            reverse=True,
        )
        for r in rows:
            self.team_table.removeRow(r)

    def _set_all_layers_checked(self, state: bool):
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if chk:
                chk.setChecked(state)

    # ─────────────────────────────────────────────────────────

    # Output directory
    # ─────────────────────────────────────────────────────────

    def _browse_output(self):
        path = QFileDialog.getExistingDirectory(
            self, 'Selecionar pasta de saída',
            self.output_edit.text() or os.path.expanduser('~'),
        )
        if path:
            self.output_edit.setText(path)

    # ─────────────────────────────────────────────────────────
    # Collect form data
    # ─────────────────────────────────────────────────────────

    def _collect_config(self):
        self._save_attr_table()
        title = self.title_edit.text().strip() or 'WebSIG'
        subtitle = self.subtitle_edit.text().strip()
        project_layers = {
            lyr.id(): lyr
            for lyr in QgsProject.instance().mapLayers().values()
        }
        # Layers
        layers = []
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if not chk or not chk.isChecked():
                continue
            name_item = self.layers_table.item(row, 1)
            if not name_item:
                continue
            layer_id = name_item.data(Qt.UserRole)
            qgis_layer = project_layers.get(layer_id)
            if not qgis_layer:
                continue
            label_item = self.layers_table.item(row, 2)
            label = label_item.text().strip() if label_item else qgis_layer.name()
            color_w = self.layers_table.cellWidget(row, 3)
            color_btn = color_w.findChild(_ColorBtn) if color_w else None
            color = color_btn.color() if color_btn else '#3B82F6'
            # Geometria detectada automaticamente da camada
            geom_type = {
                QgsWkbTypes.PolygonGeometry: 'polygon',
                QgsWkbTypes.LineGeometry: 'line',
                QgsWkbTypes.PointGeometry: 'point',
            }.get(qgis_layer.geometryType(), 'polygon')
            vis_w = self.layers_table.cellWidget(row, 4)
            vis_chk = vis_w.findChild(QCheckBox) if vis_w else None
            visible = vis_chk.isChecked() if vis_chk else True
            file_name = (
                qgis_layer.name().lower()
                .replace(' ', '_').replace('/', '_') + '.geojson'
            )
            fields = [
                {'key': f['key'], 'label': f['label']}
                for f in self._attr_data.get(layer_id, [])
                if f['include']
            ]
            layers.append({
                'id': file_name.replace('.geojson', ''),
                'label': label,
                'file': file_name,
                'color': color,
                'geometryType': geom_type,
                'visible': visible,
                'fields': fields,
                'qgis_layer': qgis_layer,
            })
        # Basemaps
        basemaps = []
        for row in range(self.basemap_table.rowCount()):
            en_w = self.basemap_table.cellWidget(row, 0)
            def_w = self.basemap_table.cellWidget(row, 1)
            en_chk = en_w.findChild(QCheckBox) if en_w else None
            if not en_chk or not en_chk.isChecked():
                continue
            def_radio = def_w.findChild(QRadioButton) if def_w else None
            name_item = self.basemap_table.item(row, 2)
            bm_data = _BASEMAPS[row]
            basemaps.append({
                'id': bm_data['id'],
                'label': name_item.text() if name_item else bm_data['label'],
                'url': bm_data['url'],
                'attribution': bm_data['attribution'],
                'default': def_radio.isChecked() if def_radio else False,
            })
        if basemaps and not any(b['default'] for b in basemaps):
            basemaps[0]['default'] = True
        # Team
        team = []
        for row in range(self.team_table.rowCount()):
            n = self.team_table.item(row, 0)
            u = self.team_table.item(row, 1)
            name = n.text().strip() if n else ''
            url = u.text().strip() if u else ''
            if name:
                team.append({'name': name, 'linkedin': url})
        # Map center
        canvas = self.iface.mapCanvas()
        extent = canvas.extent()
        center_x = (extent.xMinimum() + extent.xMaximum()) / 2
        center_y = (extent.yMinimum() + extent.yMaximum()) / 2
        src_crs = canvas.mapSettings().destinationCrs()
        dst_crs = QgsCoordinateReferenceSystem('EPSG:4326')
        if src_crs.isValid() and src_crs != dst_crs:
            tr = QgsCoordinateTransform(
                src_crs, dst_crs, QgsProject.instance())
            pt = tr.transform(center_x, center_y)
            lon, lat = pt.x(), pt.y()
        else:
            lon, lat = center_x, center_y
        lon = max(-180.0, min(180.0, lon))
        lat = max(-90.0, min(90.0, lat))
        return {
            'title': title,
            'subtitle': subtitle,
            'base_path': './',
            'layers': layers,
            'basemaps': basemaps,
            'team': team,
            'center': [lon, lat],
            'zoom': 18,
            'output_dir': self.output_edit.text().strip(),
        }

    # ─────────────────────────────────────────────────────────
    # Export
    # ─────────────────────────────────────────────────────────

    def _run_export(self):
        config = self._collect_config()

        if not config['output_dir']:
            QMessageBox.warning(
                self, 'Atenção', 'Selecione uma pasta de saída.')
            return

        if not config['layers']:
            QMessageBox.warning(
                self, 'Atenção',
                'Selecione pelo menos uma camada para exportar.'
            )
            return

        if not (self._find_node() and self._find_npm()):
            QMessageBox.critical(
                self, 'Node.js não encontrado',
                'Node.js é necessário para gerar o WebGIS.\n\n'
                'Instale em nodejs.org e reinicie o QGIS.'
            )
            return

        output_dir = config['output_dir']
        total_steps = len(config['layers']) + 3

        progress = QProgressDialog(
            'Gerando WebGIS…', 'Cancelar', 0, total_steps, self)
        progress.setWindowTitle('UFPR Map Composer')
        progress.setWindowModality(Qt.WindowModal)
        progress.setMinimumWidth(420)
        progress.show()
        QApplication.processEvents()

        try:
            os.makedirs(output_dir, exist_ok=True)

            # Step 1 — Export GeoJSON layers
            from .exporter import export_layer
            produtos_dir = os.path.join(output_dir, 'public', 'Produtos')
            os.makedirs(produtos_dir, exist_ok=True)

            for i, layer_cfg in enumerate(config['layers']):
                if progress.wasCanceled():
                    return
                progress.setValue(i)
                progress.setLabelText(
                    f"Exportando camada: {layer_cfg['label']}…")
                QApplication.processEvents()
                export_layer(
                    layer_cfg['qgis_layer'],
                    os.path.join(produtos_dir, layer_cfg['file']),
                )

            # Step 2 — Generate project files from templates
            progress.setValue(len(config['layers']))
            progress.setLabelText('Gerando arquivos do projeto React…')
            QApplication.processEvents()

            from .generator import WebGISGenerator
            templates_dir = os.path.join(
                os.path.dirname(__file__), 'templates')
            gen = WebGISGenerator(templates_dir, output_dir, config)
            gen.generate()

            # Step 3 — npm install
            progress.setValue(len(config['layers']) + 1)
            progress.setLabelText(
                'Executando npm install… (pode demorar 1-2 min)')
            QApplication.processEvents()
            self._run_npm(output_dir, 'install', progress)

            if progress.wasCanceled():
                return

            # Step 4 — npm run build
            progress.setValue(len(config['layers']) + 2)
            progress.setLabelText('Executando npm run build…')
            QApplication.processEvents()
            self._run_npm(output_dir, 'run build', progress)

            progress.setValue(total_steps)
            progress.close()

        except Exception as e:
            progress.close()
            QMessageBox.critical(
                self, 'Erro na exportação',
                f'Ocorreu um erro:\n\n{e}'
            )
            raise

        # ── Sucesso ────────────────────────────────────────────
        dist_dir = os.path.join(output_dir, 'dist')
        if os.path.isdir(dist_dir):
            self._open_result(dist_dir)

        self.accept()

    @staticmethod
    def _open_result(dist_dir: str):
        """Open the self-contained index.html directly in the default browser."""
        import webbrowser
        from pathlib import Path
        index_html = os.path.join(dist_dir, 'index.html')
        if os.path.exists(index_html):
            # Convert to proper file:/// URL so webbrowser opens the right file
            url = Path(index_html).as_uri()
            webbrowser.open(url)
            QMessageBox.information(
                None, 'WebGIS gerado!',
                f'Mapa aberto no navegador!\n\n'
                f'Arquivo:\n{index_html}\n\n'
                'Você pode abrir esse arquivo a qualquer momento\n'
                'dando um duplo clique nele.'
            )
        else:
            QMessageBox.warning(
                None, 'Build incompleto',
                f'Build gerado em:\n{dist_dir}\n\n'
                'O arquivo index.html não foi encontrado.\n\n'
                'Verifique se o npm run build terminou sem erros.'
            )

    @staticmethod
    def _find_node() -> str:
        """Find node executable, including common Windows install paths."""
        import os
        found = shutil.which('node')
        if found:
            return found
        candidates = [
            r'C:\Program Files\nodejs\node.exe',
            r'C:\Program Files (x86)\nodejs\node.exe',
            os.path.expandvars(r'%APPDATA%\nvm\current\node.exe'),
            os.path.expanduser(r'~\AppData\Roaming\nvm\current\node.exe'),
            os.path.expanduser(r'~\.nvm\versions\node\current\node.exe'),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return ''

    @staticmethod
    def _find_npm() -> str:
        """Find npm executable, including common Windows install paths."""
        import os
        found = shutil.which('npm')
        if found:
            return found
        candidates = [
            r'C:\Program Files\nodejs\npm.cmd',
            r'C:\Program Files (x86)\nodejs\npm.cmd',
            os.path.expandvars(r'%APPDATA%\nvm\current\npm.cmd'),
            os.path.expanduser(r'~\AppData\Roaming\nvm\current\npm.cmd'),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return ''

    def _run_npm(self, cwd: str, args: str, progress: QProgressDialog):
        """Run an npm command synchronously, pumping Qt events so the UI stays responsive."""
        import sys
        npm = self._find_npm() or 'npm'

        # On Windows, .cmd batch files must be invoked via cmd /c to work
        # correctly without opening a new console window.
        if sys.platform == 'win32' and npm.lower().endswith('.cmd'):
            cmd = ['cmd', '/c', npm] + args.split()
        else:
            cmd = [npm] + args.split()

        popen_kwargs = dict(
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            env={
                **os.environ, 'PATH': os.environ.get('PATH', '') + os.pathsep + os.path.dirname(npm)},
        )
        if sys.platform == 'win32':
            # Prevents a new console window from flashing open
            popen_kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW

        proc = subprocess.Popen(cmd, **popen_kwargs)

        output_lines = []
        for line in proc.stdout:
            if progress.wasCanceled():
                proc.terminate()
                return
            output_lines.append(line)
            stripped = line.strip()
            if stripped:
                label = stripped[:80] + '…' if len(stripped) > 80 else stripped
                progress.setLabelText(label)
            QApplication.processEvents()

        proc.wait()
        if proc.returncode != 0:
            tail = ''.join(output_lines[-30:]).strip()
            raise RuntimeError(
                f'`npm {args}` falhou com código {proc.returncode}.\n\n'
                f'Saída do npm:\n{tail}'
            )
