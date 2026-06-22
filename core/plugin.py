# -*- coding: utf-8 -*-
"""
Main plugin class for UFPR Map Composer.
"""
import os
from qgis.PyQt.QtWidgets import QAction, QMessageBox
from qgis.PyQt.QtGui import QIcon
from qgis.PyQt.QtCore import Qt


class UfprMapComposer:
    def __init__(self, iface):
        self.iface = iface
        # plugin_dir aponta para a raiz do plugin (um nível acima de core/)
        self.plugin_dir = os.path.dirname(os.path.dirname(__file__))
        self.action = None
        self.dialog = None

    def initGui(self):
        icon_path = os.path.join(self.plugin_dir, 'assets', 'icon.svg')
        self.action = QAction(
            QIcon(icon_path),
            'UFPR Map Composer — Gerar WebGIS',
            self.iface.mainWindow()
        )
        self.action.setToolTip(
            'Gera um WebGIS no estilo UFPR-CTM a partir das camadas do projeto atual'
        )
        self.action.triggered.connect(self.run)

        self.iface.addToolBarIcon(self.action)
        self.iface.addPluginToWebMenu('UFPR Map Composer', self.action)

    def unload(self):
        self.iface.removePluginWebMenu('UFPR Map Composer', self.action)
        self.iface.removeToolBarIcon(self.action)
        if self.action:
            self.action.deleteLater()
            self.action = None

    def run(self):
        try:
            from .dialog import UfprMapComposerDialog
            dlg = UfprMapComposerDialog(self.iface, self.iface.mainWindow())
            dlg.exec_()
        except Exception as e:
            QMessageBox.critical(
                self.iface.mainWindow(),
                'UFPR Map Composer',
                f'Erro ao abrir o plugin:\n{e}'
            )
            raise
