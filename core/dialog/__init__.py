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

from .layers import LayersMixin
from .basemaps import BasemapsMixin
from .attributes import AttrsMixin
from .reports import ReportsMixin
from .mapa import MapaMixin
from .team import TeamMixin
from .export_tiff_to_tiles import ExportMixin
from .raster_tiles_config import RasterTilesMixin


class UfprMapComposerDialog(LayersMixin, BasemapsMixin, AttrsMixin, ReportsMixin, MapaMixin, TeamMixin, ExportMixin, RasterTilesMixin, QDialog):

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
        self._symbology_data = {}
        self._basemap_default_group = QButtonGroup(self.basemap_table)

        self._setup_widgets()
        self._connect_signals()
        self._populate_basemaps()
        self._populate_layers()
        self._populate_raster_tab()
        self._populate_reports()
        self._setup_mapa()

    # ─────────────────────────────────────────────────────────
    # Setup inicial
    # ─────────────────────────────────────────────────────────

    def _setup_widgets(self):
        """Configura valores padrão e propriedades das tabelas."""
        self.title_edit.setText('')
        self.subtitle_edit.setText('')

        # Tabela de camadas
        hh = self.layers_table.horizontalHeader()
        hh.setSectionResizeMode(QHeaderView.Fixed)
        hh.setSectionResizeMode(1, QHeaderView.Stretch)
        hh.setSectionResizeMode(2, QHeaderView.Stretch)
        hh.setMinimumSectionSize(0)
        self.layers_table.setColumnWidth(0, 52)   # Incluir
        self.layers_table.setColumnWidth(3, 70)   # Tipo
        self.layers_table.setColumnWidth(4, 90)   # Estilo
        self.layers_table.setColumnWidth(5, 80)   # Inicia visível
        self.layers_table.setColumnWidth(6, 90)   # Comparação
        # Oculta até o modo ser ativado
        self.layers_table.hideColumn(6)
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

        # Tabela de documentos (PDFs)
        hh4 = self.reports_table.horizontalHeader()
        hh4.setSectionResizeMode(0, QHeaderView.Stretch)
        hh4.setSectionResizeMode(1, QHeaderView.Stretch)
        self.reports_table.setEditTriggers(
            QAbstractItemView.DoubleClicked | QAbstractItemView.SelectedClicked)

        # Tabela de equipe
        hh5 = self.team_table.horizontalHeader()
        hh5.setSectionResizeMode(0, QHeaderView.Stretch)
        hh5.setSectionResizeMode(1, QHeaderView.Stretch)

        # Tabela raster → tiles (dentro da aba Camadas)
        hh6 = self.raster_table.horizontalHeader()
        hh6.setSectionResizeMode(0, QHeaderView.Stretch)
        hh6.setSectionResizeMode(1, QHeaderView.Fixed)
        hh6.setSectionResizeMode(2, QHeaderView.Fixed)
        self.raster_table.setColumnWidth(1, 110)
        self.raster_table.setColumnWidth(2, 110)
        self.raster_table.setSelectionBehavior(QAbstractItemView.SelectRows)

    def _connect_signals(self):
        """Conecta botões, combos e textos de ajuda."""
        self.btn_github.clicked.connect(
            lambda: __import__('webbrowser').open(self._GITHUB_URL))
        self.btn_browse.clicked.connect(self._browse_output)
        self.btn_export.clicked.connect(self._run_export)
        self.btn_add_report.clicked.connect(self._add_report_row)
        self.btn_remove_report.clicked.connect(self._remove_report_row)
        self.btn_capture_view.clicked.connect(self._capture_view)
        self.btn_add_member.clicked.connect(self._add_team_row)
        self.btn_remove_member.clicked.connect(self._remove_team_row)
        self.btn_select_all_layers.clicked.connect(
            lambda: self._set_all_layers_checked(True))
        self.btn_deselect_all_layers.clicked.connect(
            lambda: self._set_all_layers_checked(False))
        self.chk_only_visible.toggled.connect(self._on_only_visible_toggled)
        self.chk_comp_compare.toggled.connect(self._on_compare_toggled)
        self.chk_comp_docs.toggled.connect(self._on_comp_docs_toggled)
        self.chk_comp_team.toggled.connect(self._on_comp_team_toggled)
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
             '<p>Escolha quais campos de cada camada aparecem <b>visíveis por padrão</b> na tabela de atributos do WebGIS.</p>'
             '<ul>'
             '<li><b>Visível:</b> campo aparece visível ao abrir a tabela.</li>'
             '<li><b>Label:</b> nome amigável exibido como cabeçalho da coluna (ex: <i>Área m²</i>). Clique duas vezes na célula para editar.</li>'
             '</ul>'
             '<p>Todos os campos são exportados. Os não marcados ficam ocultos por padrão, mas o usuário pode mostrá-los pelo botão de colunas na tabela.</p>'),
            (self.btn_help_mapabase, 'Mapa Base',
             '<p>Mapas base são as camadas de fundo (ruas, satélite, etc.).</p>'
             '<ul>'
             '<li><b>Ativar:</b> inclui o mapa na lista de opções do WebGIS.</li>'
             '<li><b>Padrão:</b> qual mapa abre ao entrar no WebGIS.</li>'
             '</ul>'
             '<p>Apenas mapas ativados podem ser definidos como Padrão.</p>'),
            (self.btn_help_relatorios, 'Relatórios e Pranchas',
             '<p>Liste os PDFs disponíveis no botão "Relatórios e Pranchas" do WebGIS.</p>'
             '<ul>'
             '<li><b>Descrição:</b> nome exibido no menu do WebGIS.</li>'
             '<li><b>Nome do arquivo:</b> nome exato do arquivo PDF (ex: <i>relatorio_final.pdf</i>).</li>'
             '<li><b>Pasta:</b> subpasta dentro de <i>public/</i> onde o PDF estará (ex: <i>Relatorios</i> ou <i>Pranchas</i>).</li>'
             '</ul>'
             '<p>Após gerar o WebGIS, copie os PDFs para a pasta <b>dist/Relatorios/</b> ou <b>dist/Pranchas/</b>.</p>'),
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

    # índices das abas no QTabWidget
    _TAB_DOCS = 4
    _TAB_TEAM = 6

    def _on_comp_docs_toggled(self, enabled: bool):
        """Habilita/desabilita a aba Documentos conforme o checkbox."""
        self.tabs.setTabEnabled(self._TAB_DOCS, enabled)

    def _on_comp_team_toggled(self, enabled: bool):
        """Habilita/desabilita a aba Equipe conforme o checkbox."""
        self.tabs.setTabEnabled(self._TAB_TEAM, enabled)
