# -*- coding: utf-8 -*-
"""
Mixin: aba Atributos — popula e salva a tabela de campos por camada.
"""
from qgis.PyQt.QtWidgets import QWidget, QHBoxLayout, QCheckBox, QTableWidgetItem
from qgis.PyQt.QtCore import Qt
from qgis.core import QgsProject


class AttrsMixin:

    # Rastreia o layer_id que está atualmente exibido na tabela
    _displayed_attr_layer_id: str = ''

    def _on_attr_layer_changed(self, index: int):
        # Salva os dados da camada que estava sendo exibida ANTES de trocar
        self._save_attr_table(self._displayed_attr_layer_id)

        layer_id = self.attr_layer_combo.itemData(index)
        self._displayed_attr_layer_id = layer_id or ''

        if not layer_id:
            self.attr_table.setRowCount(0)
            return

        # Se ainda não tem dados para essa camada, lê direto do QGIS
        if layer_id not in self._attr_data or not self._attr_data[layer_id]:
            lyr = QgsProject.instance().mapLayer(layer_id)
            if lyr and hasattr(lyr, 'fields'):
                skip = {'fid', 'ogc_fid', 'id'}
                self._attr_data[layer_id] = [
                    {
                        'key':     f.name(),
                        'label':   f.displayName() or f.name(),
                        'visible': f.name().lower() not in skip,
                    }
                    for f in lyr.fields()
                ]

        fields = self._attr_data.get(layer_id, [])
        self.attr_table.setRowCount(len(fields))
        for row, f in enumerate(fields):
            chk = QCheckBox()
            chk.setChecked(f.get('visible', True))
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

    def _save_attr_table(self, layer_id: str = ''):
        if not layer_id:
            layer_id = self.attr_layer_combo.currentData() or ''
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
                'visible': chk.isChecked() if chk else True,
            })
        self._attr_data[layer_id] = saved
