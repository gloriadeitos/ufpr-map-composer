# -*- coding: utf-8 -*-
"""
Mixin: aba Camadas — popula tabela de camadas e controles de seleção.
"""
from qgis.PyQt.QtWidgets import QWidget, QHBoxLayout, QCheckBox, QTableWidgetItem, QPushButton
from qgis.PyQt.QtCore import Qt, QSize
from qgis.PyQt.QtGui import QIcon
from qgis.core import QgsProject, QgsMapLayer, QgsLayerTreeGroup, QgsLayerTreeLayer, QgsWkbTypes

from .symbology import SymbologyDialog, _make_icon_pixmap
from .point_icons import DEFAULT_POINT_STYLE, DEFAULT_LINE_STYLE, DEFAULT_POLYGON_STYLE

# Extra role to store layer type ('vector' | 'raster') on the name item
_LAYER_TYPE_ROLE = Qt.UserRole + 1

DEFAULT_RASTER_STYLE = {'geom': 'raster', 'opacity': 1.0}

_GEOM_TYPE_MAP = {
    QgsWkbTypes.PointGeometry:   ('Ponto',   'point'),
    QgsWkbTypes.LineGeometry:    ('Linha',   'line'),
    QgsWkbTypes.PolygonGeometry: ('Polígono', 'polygon'),
}


def _collect_visible_ids(node, visible_ids: set):
    """Percorre recursivamente a árvore coletando IDs das camadas visíveis."""
    for child in node.children():
        if isinstance(child, QgsLayerTreeGroup):
            _collect_visible_ids(child, visible_ids)
        elif isinstance(child, QgsLayerTreeLayer):
            if child.isVisible():
                lyr = child.layer()
                if lyr is not None:
                    visible_ids.add(lyr.id())


class LayersMixin:

    def _get_all_layers_and_visible(self):
        """Retorna (all_layers, visible_ids) usando mapLayers() para garantir que todas
        as camadas do projeto sejam encontradas, incluindo rasters e subgrupos."""
        all_layers = [
            lyr for lyr in QgsProject.instance().mapLayers().values()
            if lyr.type() in (QgsMapLayer.VectorLayer, QgsMapLayer.RasterLayer)
        ]
        visible_ids = set()
        _collect_visible_ids(
            QgsProject.instance().layerTreeRoot(), visible_ids)
        return all_layers, visible_ids

    def _get_visible_layer_ids(self) -> set:
        _, visible_ids = self._get_all_layers_and_visible()
        return visible_ids

    def _populate_layers(self, only_visible: bool = False):
        all_layers, visible_ids = self._get_all_layers_and_visible()

        layers = [
            lyr for lyr in all_layers
            if not only_visible or lyr.id() in visible_ids
        ]

        self.layers_table.setRowCount(len(layers))
        self.attr_layer_combo.blockSignals(True)
        self.attr_layer_combo.clear()

        for row, lyr in enumerate(layers):
            is_active = lyr.id() in visible_ids
            is_raster = lyr.type() == QgsMapLayer.RasterLayer

            # Col 0: incluir checkbox — pré-marcado se a camada está ativa
            chk = QCheckBox()
            chk.setChecked(is_active)
            chk.stateChanged.connect(self._update_raster_section)
            chk_w = QWidget()
            chk_l = QHBoxLayout(chk_w)
            chk_l.addWidget(chk)
            chk_l.setAlignment(Qt.AlignCenter)
            chk_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 0, chk_w)

            # Col 1: nome QGIS (somente leitura) — armazena id e tipo
            name_item = QTableWidgetItem(lyr.name())
            name_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            name_item.setData(Qt.UserRole, lyr.id())
            name_item.setData(_LAYER_TYPE_ROLE,
                              'raster' if is_raster else 'vector')
            self.layers_table.setItem(row, 1, name_item)

            # Col 2: label (editável)
            self.layers_table.setItem(row, 2, QTableWidgetItem(lyr.name()))

            # Col 3: Tipo (somente leitura)
            if is_raster:
                tipo_str = 'Raster'
                geom_key = 'raster'
            else:
                geom = lyr.geometryType()
                tipo_str, geom_key = _GEOM_TYPE_MAP.get(
                    geom, ('Vetor', 'line'))
            tipo_item = QTableWidgetItem(tipo_str)
            tipo_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            tipo_item.setTextAlignment(Qt.AlignCenter)
            self.layers_table.setItem(row, 3, tipo_item)

            # Col 4: Botão "Estilo..."
            layer_id = lyr.id()
            if not hasattr(self, '_symbology_data'):
                self._symbology_data = {}
            if layer_id not in self._symbology_data:
                if is_raster:
                    self._symbology_data[layer_id] = dict(DEFAULT_RASTER_STYLE)
                elif geom_key == 'point':
                    self._symbology_data[layer_id] = dict(DEFAULT_POINT_STYLE)
                elif geom_key == 'line':
                    self._symbology_data[layer_id] = dict(DEFAULT_LINE_STYLE)
                else:
                    self._symbology_data[layer_id] = dict(
                        DEFAULT_POLYGON_STYLE)

            style_btn = QPushButton()
            style_btn.setProperty('layer_id', layer_id)
            style_btn.setProperty('layer_name', lyr.name())
            style_btn.setProperty('geom_key', geom_key)
            style_btn.setToolTip('Editar estilo')
            style_btn.setFixedHeight(26)
            style_btn.clicked.connect(self._open_symbology_dialog)
            self._update_style_btn(style_btn, layer_id, geom_key)
            btn_w = QWidget()
            btn_l = QHBoxLayout(btn_w)
            btn_l.addWidget(style_btn)
            btn_l.setAlignment(Qt.AlignCenter)
            btn_l.setContentsMargins(2, 1, 2, 1)
            self.layers_table.setCellWidget(row, 4, btn_w)

            # Col 5: Inicia visível
            vis_chk = QCheckBox()
            vis_chk.setChecked(is_active)
            vis_w = QWidget()
            vis_l = QHBoxLayout(vis_w)
            vis_l.addWidget(vis_chk)
            vis_l.setAlignment(Qt.AlignCenter)
            vis_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 5, vis_w)

            # Atributos: somente camadas vetoriais
            if not is_raster:
                self.attr_layer_combo.addItem(lyr.name(), layer_id)
                if layer_id not in self._attr_data:
                    skip = {'fid', 'ogc_fid', 'id'}
                    self._attr_data[layer_id] = [
                        {
                            'key': f.name(),
                            'label': f.displayName() or f.name(),
                            'visible': f.name().lower() not in skip,
                        }
                        for f in lyr.fields()
                    ]

        self.attr_layer_combo.blockSignals(False)
        if self.attr_layer_combo.count() > 0:
            self._on_attr_layer_changed(0)

    def _update_style_btn(self, btn: QPushButton, layer_id: str, geom_key: str):
        """Atualiza ícone e cor de fundo do botão Estilo com base no estilo atual."""
        style = self._symbology_data.get(layer_id, {})

        if geom_key == 'raster':
            btn.setIcon(QIcon())
            btn.setText('Transparência...')
            return

        color = (
            style.get('color') or
            style.get('fill_color') or
            '#000000'
        )
        if geom_key == 'point':
            icon_key = style.get('icon_key', 'location-dot')
            pix = _make_icon_pixmap(icon_key, color, 18)
            btn.setIcon(QIcon(pix))
            btn.setIconSize(QSize(18, 18))
            btn.setText(' Estilo...')
        else:
            from qgis.PyQt.QtGui import QPixmap, QColor
            px = QPixmap(16, 16)
            px.fill(QColor(color))
            btn.setIcon(QIcon(px))
            btn.setIconSize(QSize(16, 16))
            btn.setText(' Estilo...')

    def _open_symbology_dialog(self):
        btn = self.sender()
        layer_id = btn.property('layer_id')
        layer_name = btn.property('layer_name')
        geom_key = btn.property('geom_key')
        style = self._symbology_data.get(layer_id, {})
        dlg = SymbologyDialog(layer_name, geom_key, style, self)
        if dlg.exec_():
            result = dlg.get_result()
            if result is not None:
                self._symbology_data[layer_id] = result
                self._update_style_btn(btn, layer_id, geom_key)

    def _on_only_visible_toggled(self):
        only = self.chk_only_visible.isChecked()
        self._populate_layers(only_visible=only)

    def _set_all_layers_checked(self, state: bool):
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if chk:
                chk.setChecked(state)
        self._update_raster_section()
