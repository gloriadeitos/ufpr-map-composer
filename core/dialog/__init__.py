# -*- coding: utf-8 -*-
"""
Dialog principal do UFPR Map Composer.
Herda os mixins de cada aba; contém apenas inicialização e setup de widgets.
"""
import os

from qgis.PyQt import uic
from qgis.PyQt.QtWidgets import (
    QDialog, QHeaderView, QAbstractItemView, QMessageBox, QButtonGroup,
)
from qgis.PyQt.QtCore import QSize
from qgis.core import QgsProject

from .layers import LayersMixin
from .basemaps import BasemapsMixin
from .attributes import AttrsMixin
from .team import TeamMixin
from .export import ExportMixin


class UfprMapComposerDialog(LayersMixin, BasemapsMixin, AttrsMixin, TeamMixin, ExportMixin, QDialog):

    _GITHUB_URL = 'https://github.com/gloriadeitos/ufpr-map-composer'

    def __init__(self, iface, parent=None):
        super().__init__(parent)
        self.iface = iface

        # ui/ fica dois níveis acima: dialog/ -> core/ -> raiz
        ui_path = os.path.join(os.path.dirname(
            __file__), '..', '..', 'ui', 'dialog.ui')
        uic.loadUi(ui_path, self)

        # Estado interno compartilhado pelos mixins
        self._attr_data = {}
        self._basemap_default_group = QButtonGroup(self.basemap_table)

        self._setup_widgets()
        self._connect_signals()
        self._populate_basemaps()
        self._populate_layers()

    # ─────────────────────────────────────────────────────────
    # Setup inicial
    # ─────────────────────────────────────────────────────────

    def _setup_widgets(self):
        """Configura valores padrão e propriedades das tabelas."""
        self.title_edit.setText(QgsProject.instance().title() or 'WebSIG')
        self.subtitle_edit.setText('Cadastro Técnico Multifinalitário')

        # Tabela de camadas
        hh = self.layers_table.horizontalHeader()
        hh.setSectionResizeMode(QHeaderView.Fixed)
        hh.setSectionResizeMode(1, QHeaderView.Stretch)
        hh.setSectionResizeMode(2, QHeaderView.Stretch)
        hh.setMinimumSectionSize(0)
        self.layers_table.setColumnWidth(0, 52)
        self.layers_table.setColumnWidth(3, 52)
        self.layers_table.setColumnWidth(4, 80)
        self.layers_table.setEditTriggers(
            QAbstractItemView.DoubleClicked | QAbstractItemView.SelectedClicked)
        self.layers_table.setSelectionBehavior(QAbstractItemView.SelectRows)

        # Tabela de atributos
        hh2 = self.attr_table.horizontalHeader()
        hh2.setSectionResizeMode(1, QHeaderView.Stretch)
        hh2.setSectionResizeMode(2, QHeaderView.Stretch)
        self.attr_table.setColumnWidth(0, 65)
        self.attr_table.setEditTriggers(
            QAbstractItemView.DoubleClicked | QAbstractItemView.SelectedClicked)

        # Tabela de mapas base
        hh3 = self.basemap_table.horizontalHeader()
        hh3.setSectionResizeMode(2, QHeaderView.Stretch)
        self.basemap_table.setColumnWidth(0, 55)
        self.basemap_table.setColumnWidth(1, 60)
        self.basemap_table.setColumnWidth(3, 88)
        self.basemap_table.setSelectionBehavior(QAbstractItemView.SelectRows)

        # Tabela de equipe
        hh4 = self.team_table.horizontalHeader()
        hh4.setSectionResizeMode(0, QHeaderView.Stretch)
        hh4.setSectionResizeMode(1, QHeaderView.Stretch)

    def _connect_signals(self):
        """Conecta botões, combos e textos de ajuda."""
        self.btn_github.clicked.connect(
            lambda: __import__('webbrowser').open(self._GITHUB_URL))
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

        helps = [
            (self.btn_help_camadas, 'Camadas',
             '<p>Cada linha é uma camada vetorial do projeto QGIS atual.</p>'
             '<ul>'
             '<li><b>Incluir:</b> marca quais camadas vão aparecer no WebGIS.</li>'
             '<li><b>Label WebGIS:</b> nome exibido no painel lateral. Clique duas vezes para editar.</li>'
             '<li><b>Cor:</b> cor dos símbolos no mapa. Clique no quadrado para alterar.</li>'
             '<li><b>Inicia visível:</b> se marcado, a camada começa ligada ao abrir o WebGIS. O usuário pode ligar e desligar pelo painel lateral.</li>'
             '</ul>'
             '<p><b>Sistema de referência:</b><br>'
             'O plugin converte qualquer sistema para EPSG:4326 (WGS 84, o padrão de latitude e longitude usado por GPS e pela web) automaticamente ao exportar.</p>'),
            (self.btn_help_atributos, 'Atributos no Popup',
             '<p>Escolha quais campos de cada camada aparecem no popup quando o usuário clica numa feição no mapa.</p>'
             '<ul>'
             '<li><b>Incluir:</b> campo aparece no popup.</li>'
             '<li><b>Label:</b> nome amigável exibido (ex: <i>Área m²</i>). Clique duas vezes na célula para editar.</li>'
             '</ul>'
             '<p>Campos não marcados são ignorados no WebGIS.</p>'),
            (self.btn_help_mapabase, 'Mapa Base',
             '<p>Mapas base são as camadas de fundo (ruas, satélite, etc.).</p>'
             '<ul>'
             '<li><b>Ativar:</b> inclui o mapa na lista de opções do WebGIS.</li>'
             '<li><b>Padrão:</b> qual mapa abre ao entrar no WebGIS.</li>'
             '</ul>'
             '<p>Apenas mapas ativados podem ser definidos como Padrão.</p>'),
            (self.btn_help_output, 'Pasta de saída',
             '<p>Escolha uma pasta onde o projeto WebGIS será gerado.</p>'
             '<p>O resultado é a pasta <b>dist/</b> com <b>index.html</b> e os assets. '
             'Basta abrir o <b>index.html</b> no navegador ou publicar numa hospedagem estática.</p>'),
        ]
        for btn, title, html in helps:
            btn.setFixedSize(QSize(22, 22))
            btn.clicked.connect(
                lambda _=False, t=title, h=html: self._show_help(t, h))

    @staticmethod
    def _show_help(title: str, html: str):
        msg = QMessageBox()
        msg.setWindowTitle(title)
        msg.setTextFormat(2)  # Qt.RichText
        msg.setText(html)
        msg.setStandardButtons(QMessageBox.Ok)
        msg.exec_()
