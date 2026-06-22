# -*- coding: utf-8 -*-
"""
Mixin: aba Atributos — popula e salva a tabela de campos por camada.
"""
from qgis.PyQt.QtWidgets import QWidget, QHBoxLayout, QCheckBox, QTableWidgetItem
from qgis.PyQt.QtCore import Qt


class AttrsMixin:

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
                'visible': chk.isChecked() if chk else True,
            })
        self._attr_data[layer_id] = saved
