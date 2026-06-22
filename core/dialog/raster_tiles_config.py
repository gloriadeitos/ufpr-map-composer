# -*- coding: utf-8 -*-
"""
Mixin: seção Raster → Tiles — aparece na aba Camadas quando há rasters marcados.
"""
from qgis.PyQt.QtWidgets import QTableWidgetItem, QSpinBox, QWidget, QHBoxLayout
from qgis.PyQt.QtCore import Qt
from qgis.core import QgsMapLayer


class RasterTilesMixin:

    def _update_raster_section(self):
        """Mostra ou oculta o grupo raster e atualiza sua tabela.
        Chamado sempre que a tabela de camadas muda."""
        from qgis.PyQt.QtWidgets import QCheckBox
        from qgis.core import QgsProject

        # Quais camadas raster estão marcadas (Incluir = col 0)
        project_layers = QgsProject.instance().mapLayers()
        checked_raster_ids = []
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if not chk or not chk.isChecked():
                continue
            name_item = self.layers_table.item(row, 1)
            if name_item is None:
                continue
            layer_id = name_item.data(Qt.UserRole)
            lyr = project_layers.get(layer_id)
            if lyr and lyr.type() == QgsMapLayer.RasterLayer:
                checked_raster_ids.append((layer_id, lyr.name()))

        visible = len(checked_raster_ids) > 0
        self.grp_raster_tiles.setVisible(visible)

        if not visible:
            return

        # Preserva zoom já configurado
        existing = {}
        for row in range(self.raster_table.rowCount()):
            id_item = self.raster_table.item(row, 0)
            if id_item is None:
                continue
            lid = id_item.data(Qt.UserRole)
            zmin_w = self.raster_table.cellWidget(row, 1)
            zmax_w = self.raster_table.cellWidget(row, 2)
            zmin = zmin_w.findChild(QSpinBox).value() if zmin_w else 10
            zmax = zmax_w.findChild(QSpinBox).value() if zmax_w else 20
            existing[lid] = (zmin, zmax)

        self.raster_table.setRowCount(len(checked_raster_ids))

        for row, (layer_id, name) in enumerate(checked_raster_ids):
            # Col 0: nome
            name_item = QTableWidgetItem(name)
            name_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            name_item.setData(Qt.UserRole, layer_id)
            self.raster_table.setItem(row, 0, name_item)

            prev = existing.get(layer_id, (10, 20))

            # Col 1: Zoom mínimo
            zmin_spin = QSpinBox()
            zmin_spin.setRange(0, 22)
            zmin_spin.setValue(prev[0])
            zmin_spin.setToolTip(
                'Zoom mínimo: nível de afastamento do mapa que ainda carrega a imagem.\n'
                'Ex: 10 = cidade inteira, 14 = bairro, 18 = rua individual.'
            )
            zmin_w = QWidget()
            zmin_l = QHBoxLayout(zmin_w)
            zmin_l.addWidget(zmin_spin)
            zmin_l.setContentsMargins(2, 1, 2, 1)
            self.raster_table.setCellWidget(row, 1, zmin_w)

            # Col 2: Zoom máximo
            zmax_spin = QSpinBox()
            zmax_spin.setRange(0, 22)
            zmax_spin.setValue(prev[1])
            zmax_spin.setToolTip(
                'Zoom máximo: nível de aproximação máximo do mapa que ainda carrega a imagem.\n'
                'Ex: 18 = rua individual, 20 = detalhe de lote/edificação.\n'
                'Valores maiores geram mais arquivos e demoram mais para processar.'
            )
            zmax_w = QWidget()
            zmax_l = QHBoxLayout(zmax_w)
            zmax_l.addWidget(zmax_spin)
            zmax_l.setContentsMargins(2, 1, 2, 1)
            self.raster_table.setCellWidget(row, 2, zmax_w)

    def _populate_raster_tab(self):
        """Chamado na inicialização do dialog."""
        self._update_raster_section()

    def _get_raster_zoom_config(self) -> dict:
        """Retorna {layer_id: (zoom_min, zoom_max)} lido da tabela raster."""
        config = {}
        for row in range(self.raster_table.rowCount()):
            id_item = self.raster_table.item(row, 0)
            if id_item is None:
                continue
            layer_id = id_item.data(Qt.UserRole)
            zmin_w = self.raster_table.cellWidget(row, 1)
            zmax_w = self.raster_table.cellWidget(row, 2)
            zmin = zmin_w.findChild(QSpinBox).value() if zmin_w else 10
            zmax = zmax_w.findChild(QSpinBox).value() if zmax_w else 20
            config[layer_id] = (min(zmin, zmax), max(zmin, zmax))
        return config
        zmax_spin.setToolTip(
            'Nível de zoom máximo gerado (ex: 20 = detalhe de lote)')
        zmax_w = QWidget()
        zmax_l = QHBoxLayout(zmax_w)
        zmax_l.addWidget(zmax_spin)
        zmax_l.setContentsMargins(2, 1, 2, 1)
        self.raster_table.setCellWidget(row, 2, zmax_w)

    def _get_raster_zoom_config(self) -> dict:
        """Retorna {layer_id: (zoom_min, zoom_max)} lido da tabela raster."""
        config = {}
        for row in range(self.raster_table.rowCount()):
            id_item = self.raster_table.item(row, 0)
            if id_item is None:
                continue
            layer_id = id_item.data(Qt.UserRole)
            zmin_w = self.raster_table.cellWidget(row, 1)
            zmax_w = self.raster_table.cellWidget(row, 2)
            zmin = zmin_w.findChild(QSpinBox).value() if zmin_w else 10
            zmax = zmax_w.findChild(QSpinBox).value() if zmax_w else 20
            config[layer_id] = (min(zmin, zmax), max(zmin, zmax))
        return config
