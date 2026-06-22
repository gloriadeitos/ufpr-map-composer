# -*- coding: utf-8 -*-
"""
Mixin: aba Camadas — popula tabela de camadas e controles de seleção.
"""
from qgis.PyQt.QtWidgets import QWidget, QHBoxLayout, QCheckBox, QTableWidgetItem
from qgis.PyQt.QtCore import Qt
from qgis.core import QgsProject, QgsMapLayer, QgsLayerTreeGroup, QgsLayerTreeLayer

from .widgets import COLORS, ColorBtn


def _collect_all_vector_layers(node, visible_ids: set, result: list, parent_visible: bool = True):
    """Percorre recursivamente a árvore de grupos/camadas, coletando todas as camadas vetoriais."""
    from qgis.core import QgsLayerTreeGroup, QgsLayerTreeLayer
    for child in node.children():
        if isinstance(child, QgsLayerTreeGroup):
            _collect_all_vector_layers(
                child, visible_ids, result, parent_visible)
        elif isinstance(child, QgsLayerTreeLayer):
            lyr = child.layer()
            if lyr is not None and lyr.type() == QgsMapLayer.VectorLayer:
                result.append(lyr)
                if child.isVisible():
                    visible_ids.add(lyr.id())


class LayersMixin:

    def _get_all_layers_and_visible(self):
        """Retorna (all_vector_layers, visible_ids) percorrendo toda a árvore recursivamente."""
        root = QgsProject.instance().layerTreeRoot()
        all_layers = []
        visible_ids = set()
        _collect_all_vector_layers(root, visible_ids, all_layers)
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
        color_idx = 0

        for row, lyr in enumerate(layers):
            is_active = lyr.id() in visible_ids

            # Col 0: incluir checkbox — pré-marcado se a camada está ativa
            chk = QCheckBox()
            chk.setChecked(is_active)
            chk_w = QWidget()
            chk_l = QHBoxLayout(chk_w)
            chk_l.addWidget(chk)
            chk_l.setAlignment(Qt.AlignCenter)
            chk_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 0, chk_w)

            # Col 1: nome QGIS (somente leitura)
            name_item = QTableWidgetItem(lyr.name())
            name_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            name_item.setData(Qt.UserRole, lyr.id())
            self.layers_table.setItem(row, 1, name_item)

            # Col 2: label (editável)
            self.layers_table.setItem(row, 2, QTableWidgetItem(lyr.name()))

            # Col 3: cor (centralizada)
            color = COLORS[color_idx % len(COLORS)]
            color_idx += 1
            color_btn = ColorBtn(color)
            color_w = QWidget()
            color_l = QHBoxLayout(color_w)
            color_l.addWidget(color_btn)
            color_l.setAlignment(Qt.AlignCenter)
            color_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 3, color_w)

            # Col 4: inicia visível no WebGIS — pré-marcado se ativa no QGIS
            vis_chk = QCheckBox()
            vis_chk.setChecked(is_active)
            vis_w = QWidget()
            vis_l = QHBoxLayout(vis_w)
            vis_l.addWidget(vis_chk)
            vis_l.setAlignment(Qt.AlignCenter)
            vis_l.setContentsMargins(0, 0, 0, 0)
            self.layers_table.setCellWidget(row, 4, vis_w)

            # Inicializa dados de atributos
            layer_id = lyr.id()
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

    def _on_only_visible_toggled(self):
        only = self.chk_only_visible.isChecked()
        self._populate_layers(only_visible=only)

    def _set_all_layers_checked(self, state: bool):
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if chk:
                chk.setChecked(state)
