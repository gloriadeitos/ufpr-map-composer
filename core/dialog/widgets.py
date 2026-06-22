# -*- coding: utf-8 -*-
"""
Constantes e widgets reutilizáveis do dialog (cores, mapas base, botão de cor).
"""
from qgis.PyQt.QtWidgets import QPushButton
from qgis.PyQt.QtGui import QColor
from qgis.PyQt.QtCore import QSize

# Paleta de cores padrão para camadas (Tailwind)
COLORS = [
    '#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444',
    '#10B981', '#06B6D4', '#F97316', '#EC4899',
    '#6366F1', '#14B8A6', '#84CC16', '#A855F7',
]

# Mapas base disponíveis (serviços XYZ)
BASEMAPS = [
    {
        'id': 'osm',
        'label': 'OpenStreetMap (padrão)',
        'url': 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'attribution': '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'enabled': True, 'default': True,
    },
    {
        'id': 'carto_light',
        'label': 'CartoDB Positron (claro, minimalista)',
        'url': 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'attribution': '© <a href="https://carto.com/">CartoDB</a>',
        'enabled': True, 'default': False,
    },
    {
        'id': 'carto_dark',
        'label': 'CartoDB Dark Matter (escuro, elegante)',
        'url': 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'attribution': '© <a href="https://carto.com/">CartoDB</a>',
        'enabled': False, 'default': False,
    },
    {
        'id': 'esri_satellite',
        'label': 'Esri Satélite (imagem aérea)',
        'url': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'attribution': '© <a href="https://www.esri.com/">Esri</a>',
        'enabled': True, 'default': False,
    },
    {
        'id': 'esri_topo',
        'label': 'Esri Topográfico',
        'url': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        'attribution': '© <a href="https://www.esri.com/">Esri</a>',
        'enabled': False, 'default': False,
    },
    {
        'id': 'osm_humanitarian',
        'label': 'OpenStreetMap Humanitário (HOT)',
        'url': 'https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        'attribution': '© OpenStreetMap contributors, Tiles by HOT',
        'enabled': False, 'default': False,
    },
]


def tile_preview_url(template: str) -> str:
    """Converte um template XYZ em URL concreta (z=5, x=11, y=18 — região do Paraná)."""
    import re
    url = re.sub(r'\{[a-z]-[a-z]\}', lambda m: m.group(0)[1], template)
    url = url.replace('{z}', '5').replace('{x}', '11').replace('{y}', '18')
    return url


class ColorBtn(QPushButton):
    """Botão que abre um seletor de cor e armazena a cor escolhida."""

    def __init__(self, color: str, parent=None):
        super().__init__(parent)
        self.setFixedSize(QSize(32, 24))
        self.setToolTip('Clique para alterar a cor')
        self._set_color(color)
        self.clicked.connect(self._pick)

    def _set_color(self, c: str):
        self._color = c
        self.setStyleSheet(
            f'QPushButton {{ background-color: {c}; border: 1px solid #aaa; border-radius: 4px; }}'
        )

    def color(self) -> str:
        return self._color

    def _pick(self):
        from qgis.PyQt.QtWidgets import QColorDialog
        c = QColorDialog.getColor(QColor(self._color), self, 'Escolher cor')
        if c.isValid():
            self._set_color(c.name())
