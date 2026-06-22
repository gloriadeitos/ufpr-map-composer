# -*- coding: utf-8 -*-
"""
UFPR Map Composer — QGIS Plugin
Gera um WebGIS estilo UFPR-CTM (React + OpenLayers + Glassmorphism)
a partir das camadas do projeto QGIS atual.
"""


def classFactory(iface):
    from .core.plugin import UfprMapComposer
    return UfprMapComposer(iface)
