# -*- coding: utf-8 -*-
"""
Mixin: aba Mapa Base — popula tabela, carrega previews e gerencia rádio padrão.
"""
from qgis.PyQt.QtWidgets import QWidget, QHBoxLayout, QCheckBox, QRadioButton, QTableWidgetItem, QLabel
from qgis.PyQt.QtCore import Qt, QSize

from .widgets import BASEMAPS, tile_preview_url


class BasemapsMixin:

    def _populate_basemaps(self):
        """Preenche a tabela de mapas base com checkboxes, radio e preview."""
        for row, bm in enumerate(BASEMAPS):
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

            # Col 1: radio Padrão
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

        self._load_basemap_previews()

    def _load_basemap_previews(self):
        """Busca tiles de preview para cada mapa base via rede."""
        from qgis.core import QgsNetworkAccessManager
        from qgis.PyQt.QtNetwork import QNetworkRequest
        from qgis.PyQt.QtCore import QUrl
        self._preview_replies = {}
        for row, bm in enumerate(BASEMAPS):
            url = tile_preview_url(bm.get('url', ''))
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

    def _update_basemap_default_state(self):
        """Desabilita o radio 'Padrão' de mapas desativados; garante sempre um padrão."""
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
                    # Seleciona o primeiro ativado como novo padrão
                    for r2 in range(self.basemap_table.rowCount()):
                        en_w2 = self.basemap_table.cellWidget(r2, 0)
                        def_w2 = self.basemap_table.cellWidget(r2, 1)
                        if en_w2 and def_w2:
                            chk2 = en_w2.findChild(QCheckBox)
                            rad2 = def_w2.findChild(QRadioButton)
                            if chk2 and rad2 and chk2.isChecked():
                                rad2.setChecked(True)
                                break
