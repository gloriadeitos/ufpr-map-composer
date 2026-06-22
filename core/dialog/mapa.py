# -*- coding: utf-8 -*-
"""
Mixin: aba Mapa — zoom inicial e outras configurações do mapa.
"""


class MapaMixin:

    def _setup_mapa(self):
        """Configura o valor padrão da aba Mapa."""
        self.zoom_spin.setValue(18)
