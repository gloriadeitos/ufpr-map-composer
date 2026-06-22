# -*- coding: utf-8 -*-
"""
Mixin: aba Camadas — popula tabela de camadas e controles de seleção.
"""
from qgis.PyQt.QtWidgets import QWidget, QHBoxLayout, QCheckBox, QTableWidgetItem
from qgis.PyQt.QtCore import Qt
from qgis.core import QgsProject, QgsMapLayer, QgsWkbTypes

from .widgets import COLORS, ColorBtn


class LayersMixin:

    def _populate_layers(self):
        layers = [
            lyr for lyr in QgsProject.instance().mapLayers().values()
            if lyr.type() == QgsMapLayer.VectorLayer
        ]
        self.layers_table.setRowCount(len(layers))
        self.attr_layer_combo.blockSignals(True)
        self.attr_layer_combo.clear()
        color_idx = 0

        for row, lyr in enumerate(layers):
            # Col 0: incluir checkbox
            chk = QCheckBox()
            chk.setChecked(True)
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

            # Col 4: inicia visível (geometria detectada automaticamente)
            vis_chk = QCheckBox()
            vis_chk.setChecked(True)
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
                        'include': f.name().lower() not in skip,
                    }
                    for f in lyr.fields()
                ]

        self.attr_layer_combo.blockSignals(False)
        if self.attr_layer_combo.count() > 0:
            self._on_attr_layer_changed(0)

    def _set_all_layers_checked(self, state: bool):
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if chk:
                chk.setChecked(state)
