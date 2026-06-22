# -*- coding: utf-8 -*-
"""
Mixin: aba Mapa — visualização inicial e restrições de navegação.
"""
import math

from qgis.core import (
    QgsProject,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
)


class MapaMixin:

    def _setup_mapa(self):
        """Preenche os campos da aba Mapa com a visão atual do canvas."""
        self._capture_view()

    def _capture_view(self):
        """Lê o centro e escala do canvas do QGIS e preenche os spinboxes."""
        canvas = self.iface.mapCanvas()

        # ── Centro em WGS-84 ─────────────────────────────────
        extent = canvas.extent()
        cx = (extent.xMinimum() + extent.xMaximum()) / 2
        cy = (extent.yMinimum() + extent.yMaximum()) / 2

        src_crs = canvas.mapSettings().destinationCrs()
        dst_crs = QgsCoordinateReferenceSystem('EPSG:4326')
        if src_crs.isValid() and src_crs != dst_crs:
            tr = QgsCoordinateTransform(
                src_crs, dst_crs, QgsProject.instance())
            pt = tr.transform(cx, cy)
            lon, lat = pt.x(), pt.y()
        else:
            lon, lat = cx, cy

        lon = max(-180.0, min(180.0, lon))
        lat = max(-90.0, min(90.0, lat))

        # ── Zoom estimado a partir da escala do canvas ────────
        scale = canvas.scale()          # ex: 50000 → 1:50 000
        zoom = self._scale_to_zoom(scale)

        # ── Preencher widgets ─────────────────────────────────
        self.lon_spin.setValue(lon)
        self.lat_spin.setValue(lat)
        self.zoom_spin.setValue(zoom)

        self.lbl_mapa_preview.setText(
            f'<b>Centro capturado:</b> {lat:.6f}°, {lon:.6f}°  |  '
            f'<b>Zoom:</b> {zoom}  '
            f'(escala aproximada 1:{int(scale):,})'.replace(',', '.')
        )

    @staticmethod
    def _scale_to_zoom(scale: float) -> int:
        """
        Converte escala cartográfica (ex: 50000) para zoom do WebGIS.
        Fórmula: zoom = log2(559 082 264 / scale), baseada na resolução
        da projeção Web Mercator a 96 DPI.
        """
        if scale <= 0:
            return 15
        zoom = math.log2(559_082_264.0 / scale)
        return max(1, min(22, round(zoom)))
