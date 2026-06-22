# -*- coding: utf-8 -*-
"""
Mixin: exportação — coleta dados do formulário, gera GeoJSON, executa npm build.
"""
import os
import shutil
import subprocess

from qgis.PyQt.QtWidgets import QFileDialog, QMessageBox, QProgressDialog, QApplication
from qgis.PyQt.QtCore import Qt
from qgis.core import (
    QgsProject, QgsWkbTypes,
    QgsCoordinateReferenceSystem, QgsCoordinateTransform,
)

from .widgets import BASEMAPS, ColorBtn


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
            qgis_layer = project_layers.get(layer_id)
            if not qgis_layer:
                continue
            label_item = self.layers_table.item(row, 2)
            label = label_item.text().strip() if label_item else qgis_layer.name()
            color_w = self.layers_table.cellWidget(row, 3)
            color_btn = color_w.findChild(ColorBtn) if color_w else None
            color = color_btn.color() if color_btn else '#3B82F6'
            geom_type = {
                QgsWkbTypes.PolygonGeometry: 'polygon',
                QgsWkbTypes.LineGeometry: 'line',
                QgsWkbTypes.PointGeometry: 'point',
            }.get(qgis_layer.geometryType(), 'polygon')
            vis_w = self.layers_table.cellWidget(row, 4)
            vis_chk = vis_w.findChild(QCheckBox) if vis_w else None
            visible = vis_chk.isChecked() if vis_chk else True
            file_name = (
                qgis_layer.name().lower()
                .replace(' ', '_').replace('/', '_') + '.geojson'
            )
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
                'visible': visible,
                'fields': fields,
                'qgis_layer': qgis_layer,
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

        # Relatórios
        reports = []
        for row in range(self.reports_table.rowCount()):
            lbl_i = self.reports_table.item(row, 0)
            file_i = self.reports_table.item(row, 1)
            folder_i = self.reports_table.item(row, 2)
            label = lbl_i.text().strip() if lbl_i else ''
            file_ = file_i.text().strip() if file_i else ''
            folder = folder_i.text().strip() if folder_i else 'Relatorios'
            if label and file_:
                reports.append(
                    {'label': label, 'file': file_, 'folder': folder})

        # Centro do mapa
        canvas = self.iface.mapCanvas()
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

        return {
            'title': title,
            'subtitle': subtitle,
            'base_path': './',
            'layers': layers,
            'basemaps': basemaps,
            'team': team,
            'reports': reports,
            'center': [lon, lat],
            'zoom': self.zoom_spin.value(),
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

        try:
            os.makedirs(output_dir, exist_ok=True)

            # Passo 1 — Exportar GeoJSON
            from ..exporter import export_layer
            produtos_dir = os.path.join(output_dir, 'public', 'Produtos')
            os.makedirs(produtos_dir, exist_ok=True)
            for i, layer_cfg in enumerate(config['layers']):
                if progress.wasCanceled():
                    return
                progress.setValue(i)
                progress.setLabelText(
                    f"Exportando camada: {layer_cfg['label']}…")
                QApplication.processEvents()
                export_layer(
                    layer_cfg['qgis_layer'],
                    os.path.join(produtos_dir, layer_cfg['file']),
                )

            # Passo 2 — Gerar arquivos do projeto React
            progress.setValue(len(config['layers']))
            progress.setLabelText('Gerando arquivos do projeto React…')
            QApplication.processEvents()
            from ..generator import WebGISGenerator
            templates_dir = os.path.join(
                os.path.dirname(__file__), '..', 'templates')
            gen = WebGISGenerator(templates_dir, output_dir, config)
            gen.generate()

            # Passo 3 — npm install
            progress.setValue(len(config['layers']) + 1)
            progress.setLabelText(
                'Executando npm install… (pode demorar 1-2 min)')
            QApplication.processEvents()
            self._run_npm(output_dir, 'install', progress)
            if progress.wasCanceled():
                return

            # Passo 4 — npm run build
            progress.setValue(len(config['layers']) + 2)
            progress.setLabelText('Executando npm run build…')
            QApplication.processEvents()
            self._run_npm(output_dir, 'run build', progress)

            progress.setValue(total_steps)
            progress.close()

        except Exception as e:
            progress.close()
            QMessageBox.critical(self, 'Erro na exportação',
                                 f'Ocorreu um erro:\n\n{e}')
            raise

        dist_dir = os.path.join(output_dir, 'dist')
        if os.path.isdir(dist_dir):
            self._open_result(dist_dir)

        self.accept()

    @staticmethod
    def _open_result(dist_dir: str):
        """Abre o index.html gerado no navegador padrão."""
        import webbrowser
        from pathlib import Path
        index_html = os.path.join(dist_dir, 'index.html')
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
                f'Build gerado em:\n{dist_dir}\n\n'
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
