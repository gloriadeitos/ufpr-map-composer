# -*- coding: utf-8 -*-
"""
Mixin: exportação — coleta dados do formulário, gera GeoJSON, executa npm build.
"""
import os
import re
import shutil
import subprocess

from qgis.PyQt.QtWidgets import QFileDialog, QMessageBox, QProgressDialog, QApplication
from qgis.PyQt.QtCore import Qt
from qgis.core import (
    QgsProject, QgsWkbTypes,
)

from .widgets import BASEMAPS
from .point_icons import DEFAULT_POINT_STYLE, DEFAULT_LINE_STYLE, DEFAULT_POLYGON_STYLE


def _safe_name(text: str) -> str:
    """Converte um texto em nome de arquivo/pasta seguro no Windows.

    Remove ou substitui por '_' todos os caracteres inválidos em caminhos
    Windows: \ / : * ? " < > | e sequências de whitespace.
    """
    s = text.lower().strip()
    s = re.sub(r'[\\/:*?"<>|\s]+', '_', s)
    s = re.sub(r'_+', '_', s)          # colapsa múltiplos '_'
    s = s.strip('_') or 'layer'        # garante que não fique vazio
    return s


def _generate_raster_tiles(qgis_layer, tiles_dir: str,
                           zoom_min: int = 10, zoom_max: int = 20):
    """
    Gera tiles XYZ a partir de uma camada raster do QGIS.
    Usa gdal2tiles via subprocesso externo para não afetar o processo QGIS.
    Os tiles são gravados em tiles_dir/{z}/{x}/{y}.png.
    """
    import sys
    import tempfile
    import processing as _proc
    from qgis.core import (
        QgsCoordinateReferenceSystem as _CRS,
        QgsProcessingContext as _ProcCtx,
        QgsProcessingFeedback as _ProcFb,
    )

    # Passo 1: reprojetar para EPSG:3857 (sistema dos tiles web)
    # Usamos um contexto de processamento sem projeto para evitar que o QGIS
    # tente carregar o raster temporário como camada no mapa.
    _ctx = _ProcCtx()
    _fb = _ProcFb()
    tmp_tif = tempfile.mktemp(suffix='_3857.tif')
    _proc.run('gdal:warpreproject', {
        'INPUT': qgis_layer,
        'TARGET_CRS': _CRS('EPSG:3857'),
        'RESAMPLING': 0,
        'NODATA': None,
        'TARGET_RESOLUTION': None,
        'OPTIONS': 'COMPRESS=LZW',
        'DATA_TYPE': 0,
        'TARGET_EXTENT': None,
        'TARGET_EXTENT_CRS': None,
        'MULTITHREADING': False,
        'EXTRA': '',
        'OUTPUT': tmp_tif,
    }, context=_ctx, feedback=_fb)
    # Não chamamos gdal2tiles.main() diretamente pois ele chama sys.exit()
    # internamente, o que encerraria o processo do QGIS.
    os.makedirs(tiles_dir, exist_ok=True)
    try:
        # Remover tilemapresource.xml depois se existir, para o QGIS não tentar
        # carregá-lo como fonte de dados
        cmd = [
            sys.executable, '-m', 'osgeo_utils.gdal2tiles',
            '--zoom', f'{zoom_min}-{zoom_max}',
            '--webviewer', 'none',
            '--processes', '1',
            '--resampling', 'average',
            tmp_tif,
            tiles_dir,
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f'gdal2tiles falhou (código {result.returncode}):\n'
                f'{result.stderr or result.stdout}'
            )
        # Remover arquivos extras gerados pelo gdal2tiles que o QGIS pode
        # interpretar como fontes de dados
        for extra in ('tilemapresource.xml', 'googlemaps.html', 'leaflet.html',
                      'openlayers.html', 'mapml.mapml'):
            p = os.path.join(tiles_dir, extra)
            if os.path.exists(p):
                os.remove(p)
    finally:
        if os.path.exists(tmp_tif):
            os.remove(tmp_tif)


class ExportMixin:

    def _browse_output(self):
        path = QFileDialog.getExistingDirectory(
            self, 'Selecionar pasta de saída',
            self.output_edit.text() or os.path.expanduser('~'),
        )
        if path:
            self.output_edit.setText(path)

    # ─── Coleta de dados do formulário ───────────────────────

    def _collect_config(self):
        self._save_attr_table()
        title = self.title_edit.text().strip() or 'WebSIG'
        subtitle = self.subtitle_edit.text().strip()
        project_layers = {
            lyr.id(): lyr
            for lyr in QgsProject.instance().mapLayers().values()
        }

        # Camadas
        from qgis.PyQt.QtWidgets import QCheckBox
        from qgis.PyQt.QtCore import Qt as _Qt
        from .layers import _LAYER_TYPE_ROLE
        layers = []
        for row in range(self.layers_table.rowCount()):
            chk_w = self.layers_table.cellWidget(row, 0)
            chk = chk_w.findChild(QCheckBox) if chk_w else None
            if not chk or not chk.isChecked():
                continue
            name_item = self.layers_table.item(row, 1)
            if not name_item:
                continue
            layer_id = name_item.data(_Qt.UserRole)
            layer_type = name_item.data(_LAYER_TYPE_ROLE) or 'vector'
            qgis_layer = project_layers.get(layer_id)
            if not qgis_layer:
                continue
            label_item = self.layers_table.item(row, 2)
            label = label_item.text().strip() if label_item else qgis_layer.name()
            vis_w = self.layers_table.cellWidget(row, 5)
            vis_chk = vis_w.findChild(QCheckBox) if vis_w else None
            visible = vis_chk.isChecked() if vis_chk else True

            if layer_type == 'raster':
                safe_name = _safe_name(qgis_layer.name())
                layers.append({
                    'id': safe_name,
                    'label': label,
                    'file': '',
                    'color': '#888888',
                    'geometryType': 'raster',
                    'type': 'tiles',
                    'visible': visible,
                    'fields': [],
                    'qgis_layer': qgis_layer,
                    'is_raster': True,
                })
            else:
                geom_type = {
                    QgsWkbTypes.PolygonGeometry: 'polygon',
                    QgsWkbTypes.LineGeometry: 'line',
                    QgsWkbTypes.PointGeometry: 'point',
                }.get(qgis_layer.geometryType(), 'polygon')
                # Estilo da camada via _symbology_data
                default_style = {
                    'point': DEFAULT_POINT_STYLE,
                    'line': DEFAULT_LINE_STYLE,
                    'polygon': DEFAULT_POLYGON_STYLE,
                }.get(geom_type, DEFAULT_LINE_STYLE)
                style = dict(self._symbology_data.get(layer_id, default_style))
                style['geom'] = geom_type
                # Cor resumida para uso legado no frontend
                color = style.get('color') or style.get(
                    'fill_color') or '#3B82F6'
                file_name = _safe_name(qgis_layer.name()) + '.geojson'
                fields = [
                    {
                        'key': f['key'],
                        'label': f['label'],
                        'defaultHidden': not f.get('visible', True),
                    }
                    for f in self._attr_data.get(layer_id, [])
                ]
                layers.append({
                    'id': file_name.replace('.geojson', ''),
                    'label': label,
                    'file': file_name,
                    'color': color,
                    'geometryType': geom_type,
                    'type': 'geojson',
                    'visible': visible,
                    'fields': fields,
                    'style': style,
                    'qgis_layer': qgis_layer,
                    'is_raster': False,
                })

        # Mapas base
        from qgis.PyQt.QtWidgets import QRadioButton
        basemaps = []
        for row in range(self.basemap_table.rowCount()):
            en_w = self.basemap_table.cellWidget(row, 0)
            def_w = self.basemap_table.cellWidget(row, 1)
            en_chk = en_w.findChild(QCheckBox) if en_w else None
            if not en_chk or not en_chk.isChecked():
                continue
            def_radio = def_w.findChild(QRadioButton) if def_w else None
            name_item = self.basemap_table.item(row, 2)
            bm_data = BASEMAPS[row]
            basemaps.append({
                'id': bm_data['id'],
                'label': name_item.text() if name_item else bm_data['label'],
                'url': bm_data['url'],
                'attribution': bm_data['attribution'],
                'default': def_radio.isChecked() if def_radio else False,
            })
        if basemaps and not any(b['default'] for b in basemaps):
            basemaps[0]['default'] = True

        # Equipe
        team = []
        for row in range(self.team_table.rowCount()):
            n = self.team_table.item(row, 0)
            u = self.team_table.item(row, 1)
            name = n.text().strip() if n else ''
            url = u.text().strip() if u else ''
            if name:
                team.append({'name': name, 'linkedin': url})

        # Documentos (PDFs)
        reports = []
        for row in range(self.reports_table.rowCount()):
            lbl_i = self.reports_table.item(row, 0)
            file_i = self.reports_table.item(row, 1)
            label = lbl_i.text().strip() if lbl_i else ''
            src_path = file_i.data(Qt.UserRole) if file_i else ''
            file_ = os.path.basename(src_path) if src_path else ''
            if label and file_ and os.path.isfile(src_path):
                reports.append(
                    {'label': label, 'file': file_, 'folder': 'Documentos',
                     'source_path': src_path})

        return {
            'title': title,
            'subtitle': subtitle,
            'base_path': './',
            'layers': layers,
            'basemaps': basemaps,
            'team': team,
            'reports': reports,
            'center': [self.lon_spin.value(), self.lat_spin.value()],
            'zoom': self.zoom_spin.value(),
            'zoom_min': self.zoom_min_spin.value(),
            'zoom_max': self.zoom_max_spin.value(),
            'output_dir': self.output_edit.text().strip(),
        }

    # ─── Execução da exportação ───────────────────────────────

    def _run_export(self):
        config = self._collect_config()

        if not config['output_dir']:
            QMessageBox.warning(
                self, 'Atenção', 'Selecione uma pasta de saída.')
            return
        if not config['layers']:
            QMessageBox.warning(
                self, 'Atenção', 'Selecione pelo menos uma camada para exportar.')
            return
        if not (self._find_node() and self._find_npm()):
            QMessageBox.critical(
                self, 'Node.js não encontrado',
                'Node.js é necessário para gerar o WebGIS.\n\n'
                'Instale em nodejs.org e reinicie o QGIS.'
            )
            return

        output_dir = config['output_dir']
        total_steps = len(config['layers']) + 3

        progress = QProgressDialog(
            'Gerando WebGIS…', 'Cancelar', 0, total_steps, self)
        progress.setWindowTitle('UFPR Map Composer')
        progress.setWindowModality(Qt.WindowModal)
        progress.setMinimumWidth(420)
        progress.show()
        QApplication.processEvents()

        import tempfile
        # Gerar o projeto React em diretório temporário; copiar apenas o
        # dist/ final para a pasta escolhida pelo usuário.
        build_dir = tempfile.mkdtemp(prefix='ufpr_map_')
        try:
            os.makedirs(output_dir, exist_ok=True)

            # Passo 1 — Exportar GeoJSON / gerar tiles raster
            from ..export_vector_to_geojson import export_layer
            produtos_dir = os.path.join(build_dir, 'public', 'Produtos')
            os.makedirs(produtos_dir, exist_ok=True)
            for i, layer_cfg in enumerate(config['layers']):
                if progress.wasCanceled():
                    return
                progress.setValue(i)
                progress.setLabelText(
                    f"Exportando camada: {layer_cfg['label']}…")
                QApplication.processEvents()
                if layer_cfg.get('is_raster'):
                    zoom_cfg = self._get_raster_zoom_config()
                    layer_id = layer_cfg['qgis_layer'].id()
                    zoom_min, zoom_max = zoom_cfg.get(layer_id, (10, 20))
                    tiles_dir = os.path.join(
                        build_dir, 'public', 'tiles', layer_cfg['id'])
                    _generate_raster_tiles(
                        layer_cfg['qgis_layer'], tiles_dir,
                        zoom_min=zoom_min, zoom_max=zoom_max)
                else:
                    export_layer(
                        layer_cfg['qgis_layer'],
                        os.path.join(produtos_dir, layer_cfg['file']),
                    )

            # Passo 1b — Copiar PDFs para public/Produtos/Documentos/
            if config.get('reports'):
                docs_dir = os.path.join(produtos_dir, 'Documentos')
                os.makedirs(docs_dir, exist_ok=True)
                for r in config['reports']:
                    src = r.get('source_path', '')
                    if src and os.path.isfile(src):
                        shutil.copy2(src, os.path.join(docs_dir, r['file']))

            # Passo 2 — Gerar arquivos do projeto React
            progress.setValue(len(config['layers']))
            progress.setLabelText('Gerando arquivos do projeto React…')
            QApplication.processEvents()
            from ..react_project_generator import WebGISGenerator
            templates_dir = os.path.join(
                os.path.dirname(__file__), '..', '..', 'templates')
            gen = WebGISGenerator(templates_dir, build_dir, config)
            gen.generate()

            # Passo 3 — npm install
            progress.setValue(len(config['layers']) + 1)
            progress.setLabelText(
                'Executando npm install… (pode demorar 1-2 min)')
            QApplication.processEvents()
            self._run_npm(build_dir, 'install', progress)
            if progress.wasCanceled():
                return

            # Passo 4 — npm run build
            progress.setValue(len(config['layers']) + 2)
            progress.setLabelText('Executando npm run build…')
            QApplication.processEvents()
            self._run_npm(build_dir, 'run build', progress)

            # Passo 5 — Copiar dist/ para a pasta de saída do usuário
            progress.setLabelText('Copiando resultado para pasta de saída…')
            QApplication.processEvents()
            dist_dir = os.path.join(build_dir, 'dist')
            if not os.path.isdir(dist_dir):
                raise RuntimeError(
                    'npm run build não gerou a pasta dist/.')
            for item in os.listdir(dist_dir):
                src_item = os.path.join(dist_dir, item)
                dst_item = os.path.join(output_dir, item)
                if os.path.isdir(src_item):
                    if os.path.isdir(dst_item):
                        shutil.rmtree(dst_item)
                    shutil.copytree(src_item, dst_item)
                else:
                    shutil.copy2(src_item, dst_item)

            progress.setValue(total_steps)
            progress.close()

        except Exception as e:
            progress.close()
            QMessageBox.critical(self, 'Erro na exportação',
                                 f'Ocorreu um erro:\n\n{e}')
            raise
        finally:
            shutil.rmtree(build_dir, ignore_errors=True)

        self._open_result(output_dir)
        self.accept()

    @staticmethod
    def _open_result(output_dir: str):
        """Abre o index.html gerado no navegador padrão."""
        import webbrowser
        from pathlib import Path
        index_html = os.path.join(output_dir, 'index.html')
        if os.path.exists(index_html):
            webbrowser.open(Path(index_html).as_uri())
            QMessageBox.information(
                None, 'WebGIS gerado!',
                f'Mapa aberto no navegador!\n\n'
                f'Arquivo:\n{index_html}\n\n'
                'Você pode abrir esse arquivo a qualquer momento\n'
                'dando um duplo clique nele.'
            )
        else:
            QMessageBox.warning(
                None, 'Build incompleto',
                f'Build gerado em:\n{output_dir}\n\n'
                'O arquivo index.html não foi encontrado.\n\n'
                'Verifique se o npm run build terminou sem erros.'
            )

    # ─── Utilitários Node.js / npm ────────────────────────────

    @staticmethod
    def _find_node() -> str:
        found = shutil.which('node')
        if found:
            return found
        candidates = [
            r'C:\Program Files\nodejs\node.exe',
            r'C:\Program Files (x86)\nodejs\node.exe',
            os.path.expandvars(r'%APPDATA%\nvm\current\node.exe'),
            os.path.expanduser(r'~\AppData\Roaming\nvm\current\node.exe'),
            os.path.expanduser(r'~\.nvm\versions\node\current\node.exe'),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return ''

    @staticmethod
    def _find_npm() -> str:
        found = shutil.which('npm')
        if found:
            return found
        candidates = [
            r'C:\Program Files\nodejs\npm.cmd',
            r'C:\Program Files (x86)\nodejs\npm.cmd',
            os.path.expandvars(r'%APPDATA%\nvm\current\npm.cmd'),
            os.path.expanduser(r'~\AppData\Roaming\nvm\current\npm.cmd'),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c
        return ''

    def _run_npm(self, cwd: str, args: str, progress: QProgressDialog):
        """Executa comando npm de forma síncrona, atualizando a UI."""
        import sys
        npm = self._find_npm() or 'npm'
        if sys.platform == 'win32' and npm.lower().endswith('.cmd'):
            cmd = ['cmd', '/c', npm] + args.split()
        else:
            cmd = [npm] + args.split()

        popen_kwargs = dict(
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            env={
                **os.environ, 'PATH': os.environ.get('PATH', '') + os.pathsep + os.path.dirname(npm)},
        )
        if sys.platform == 'win32':
            popen_kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW

        proc = subprocess.Popen(cmd, **popen_kwargs)
        output_lines = []
        for line in proc.stdout:
            if progress.wasCanceled():
                proc.terminate()
                return
            output_lines.append(line)
            stripped = line.strip()
            if stripped:
                label = stripped[:80] + '…' if len(stripped) > 80 else stripped
                progress.setLabelText(label)
            QApplication.processEvents()

        proc.wait()
        if proc.returncode != 0:
            tail = ''.join(output_lines[-30:]).strip()
            raise RuntimeError(
                f'`npm {args}` falhou com código {proc.returncode}.\n\n'
                f'Saída do npm:\n{tail}'
            )
