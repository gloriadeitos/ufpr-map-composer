# -*- coding: utf-8 -*-
"""
Exports a QGIS vector layer to GeoJSON (EPSG:4326).
"""
import os

from qgis.core import (
    QgsVectorFileWriter,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransformContext,
    QgsCoordinateTransform,
    QgsProject,
)


def export_layer(qgis_layer, output_path: str) -> None:
    """
    Export *qgis_layer* to *output_path* as GeoJSON in EPSG:4326.

    Always sets an explicit QgsCoordinateTransform so the API does not
    receive None (which raises TypeError in QGIS ≥ 3.38).
    """
    wgs84 = QgsCoordinateReferenceSystem('EPSG:4326')
    src_crs = qgis_layer.crs()

    options = QgsVectorFileWriter.SaveVectorOptions()
    options.driverName = 'GeoJSON'
    options.fileEncoding = 'UTF-8'
    # Always provide a valid transform (identity if already WGS84)
    options.ct = QgsCoordinateTransform(src_crs, wgs84, QgsProject.instance())

    if os.path.exists(output_path):
        os.remove(output_path)

    error, msg = QgsVectorFileWriter.writeAsVectorFormatV2(
        qgis_layer,
        output_path,
        QgsCoordinateTransformContext(),
        options,
    )[:2]

    if error != QgsVectorFileWriter.NoError:
        raise RuntimeError(
            f'Falha ao exportar "{qgis_layer.name()}" para GeoJSON: {msg}'
        )

