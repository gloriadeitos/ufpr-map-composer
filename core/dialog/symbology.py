# -*- coding: utf-8 -*-
"""
SymbologyDialog — editor de simbologia por camada.
Abre ao clicar "Estilo..." na tabela de camadas.
Suporta Ponto / Linha / Poligono / Raster.
"""
import base64

from qgis.PyQt.QtWidgets import (
    QDialog, QDialogButtonBox, QVBoxLayout, QHBoxLayout, QFormLayout,
    QGroupBox, QLabel, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QSlider, QStackedWidget, QScrollArea, QWidget, QGridLayout,
    QRadioButton, QLineEdit, QFileDialog, QSizePolicy, QFrame,
)
from qgis.PyQt.QtCore import Qt, QSize, QByteArray, QRectF, pyqtSignal
from qgis.PyQt.QtGui import QColor, QPixmap, QPainter, QBrush, QIcon
from qgis.PyQt.QtSvg import QSvgRenderer

from .point_icons import POINT_ICON_CATEGORIES
from .icon_paths import FA_ICON_PATHS


def _make_icon_pixmap(icon_key: str, color: str = '#000000',
                      size: int = 22) -> QPixmap:
    """Renderiza um ícone FA como QPixmap preservando a proporção (letterbox)."""
    entry = FA_ICON_PATHS.get(icon_key)
    pix = QPixmap(size, size)
    pix.fill(Qt.transparent)
    if entry is None:
        return pix
    w, h, path_d = entry
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {w} {h}">'
        f'<path fill="{color}" d="{path_d}"/>'
        f'</svg>'
    ).encode('utf-8')
    renderer = QSvgRenderer(QByteArray(svg))
    # Calcula rect proporcional centrado no quadrado size×size
    aspect = w / h if h > 0 else 1.0
    if aspect >= 1.0:
        rw = float(size)
        rh = size / aspect
    else:
        rh = float(size)
        rw = size * aspect
    rx = (size - rw) / 2.0
    ry = (size - rh) / 2.0
    painter = QPainter(pix)
    painter.setRenderHint(QPainter.Antialiasing)
    renderer.render(painter, QRectF(rx, ry, rw, rh))
    painter.end()
    return pix


# ─────────────────────────────────────────────────────────────────────────────
# Widgets auxiliares
# ─────────────────────────────────────────────────────────────────────────────

class _ColorBtn(QPushButton):
    """Botão que exibe uma amostra de cor e abre QColorDialog ao clicar."""

    colorChanged = pyqtSignal(str)

    def __init__(self, hex_color: str = '#000000', parent=None):
        super().__init__(parent)
        self._color = hex_color
        self.setFixedSize(40, 24)
        self._refresh()
        self.clicked.connect(self._pick)

    def _refresh(self):
        px = QPixmap(36, 20)
        px.fill(QColor(self._color))
        self.setIcon(QIcon(px))
        self.setIconSize(QSize(36, 20))
        self.setText('')
        self.setToolTip(self._color)

    def _pick(self):
        from qgis.PyQt.QtWidgets import QColorDialog
        c = QColorDialog.getColor(QColor(self._color), self, 'Escolher cor')
        if c.isValid():
            self._color = c.name()
            self._refresh()
            self.colorChanged.emit(self._color)

    def color(self) -> str:
        return self._color

    def set_color(self, hex_color: str):
        self._color = hex_color
        self._refresh()


class _OpacityRow(QWidget):
    """Slider 0-100 + SpinBox sincronizados para opacidade."""

    def __init__(self, value: float = 1.0, parent=None):
        super().__init__(parent)
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)

        self._slider = QSlider(Qt.Horizontal)
        self._slider.setRange(0, 100)
        self._spin = QSpinBox()
        self._spin.setRange(0, 100)
        self._spin.setSuffix(' %')
        self._spin.setFixedWidth(60)

        lay.addWidget(self._slider)
        lay.addWidget(self._spin)

        pct = int(round(value * 100))
        self._slider.setValue(pct)
        self._spin.setValue(pct)

        self._slider.valueChanged.connect(self._spin.setValue)
        self._spin.valueChanged.connect(self._slider.setValue)

    def value(self) -> float:
        return self._slider.value() / 100.0

    def set_value(self, v: float):
        self._slider.setValue(int(round(v * 100)))


# ─────────────────────────────────────────────────────────────────────────────
# Dialog principal
# ─────────────────────────────────────────────────────────────────────────────

class SymbologyDialog(QDialog):

    def __init__(self, layer_name: str, geom_type: str, style_data: dict, parent=None):
        """
        layer_name : str  — nome exibido no título
        geom_type  : str  — 'point' | 'line' | 'polygon' | 'raster'
        style_data : dict — estilo atual (DEFAULT_*_STYLE como fallback)
        """
        super().__init__(parent)
        self._geom = geom_type
        self._data = dict(style_data)
        self._result = None

        self.setWindowTitle(f'Estilo — {layer_name}')
        self.setMinimumWidth(480)

        root = QVBoxLayout(self)
        root.setSpacing(8)

        # Conteúdo específico por tipo
        if geom_type == 'point':
            self._build_point_ui(root)
        elif geom_type == 'line':
            self._build_line_ui(root)
        elif geom_type == 'polygon':
            self._build_polygon_ui(root)
        else:
            self._build_raster_ui(root)

        # Botões OK / Cancelar
        bb = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        bb.accepted.connect(self._collect_and_accept)
        bb.rejected.connect(self.reject)
        root.addWidget(bb)

    # ──────────────────────────────────────────────────────────
    # Ponto
    # ──────────────────────────────────────────────────────────

    def _build_point_ui(self, root: QVBoxLayout):
        d = self._data

        # Grupo: origem do símbolo
        grp_src = QGroupBox('Origem do símbolo')
        src_lay = QVBoxLayout(grp_src)

        self._rb_icon = QRadioButton('Ícone da biblioteca (FontAwesome)')
        self._rb_svg = QRadioButton('Arquivo SVG (permite colorir)')
        self._rb_png = QRadioButton('Imagem PNG (cor original)')
        src_lay.addWidget(self._rb_icon)
        src_lay.addWidget(self._rb_svg)
        src_lay.addWidget(self._rb_png)

        self._stack = QStackedWidget()
        src_lay.addWidget(self._stack)

        # Página 0: ícone da biblioteca
        page_icon = QWidget()
        pi_lay = QVBoxLayout(page_icon)
        pi_lay.setContentsMargins(0, 4, 0, 0)

        cat_row = QHBoxLayout()
        cat_row.addWidget(QLabel('Categoria:'))
        self._cat_combo = QComboBox()
        for cat in POINT_ICON_CATEGORIES:
            self._cat_combo.addItem(cat)
        cat_row.addWidget(self._cat_combo, 1)
        pi_lay.addLayout(cat_row)

        self._icon_scroll = QScrollArea()
        self._icon_scroll.setWidgetResizable(True)
        self._icon_scroll.setFixedHeight(180)
        self._icon_grid_w = QWidget()
        self._icon_grid = QGridLayout(self._icon_grid_w)
        self._icon_grid.setSpacing(2)
        self._icon_scroll.setWidget(self._icon_grid_w)
        pi_lay.addWidget(self._icon_scroll)

        color_row = QHBoxLayout()
        color_row.addWidget(QLabel('Cor do ícone:'))
        self._icon_color_btn = _ColorBtn(d.get('color', '#000000'))
        self._icon_color_btn.colorChanged.connect(
            lambda _: self._refresh_icon_grid())
        color_row.addWidget(self._icon_color_btn)
        color_row.addStretch()
        pi_lay.addLayout(color_row)

        self._selected_icon_key = d.get('icon_key', 'location-dot')
        self._cat_combo.currentIndexChanged.connect(self._refresh_icon_grid)
        self._refresh_icon_grid()
        # Seleciona categoria do ícone atual
        self._scroll_to_current_icon()

        self._stack.addWidget(page_icon)

        # Página 1: SVG
        page_svg = QWidget()
        ps_lay = QFormLayout(page_svg)
        ps_lay.setContentsMargins(0, 4, 0, 0)
        self._svg_path = QLineEdit()
        self._svg_path.setReadOnly(True)
        self._svg_path.setPlaceholderText('Nenhum arquivo selecionado')
        svg_browse = QPushButton('Procurar...')
        svg_browse.clicked.connect(
            lambda: self._browse_file(self._svg_path, 'SVG (*.svg)'))
        svg_row_w = QWidget()
        svg_row_l = QHBoxLayout(svg_row_w)
        svg_row_l.setContentsMargins(0, 0, 0, 0)
        svg_row_l.addWidget(self._svg_path, 1)
        svg_row_l.addWidget(svg_browse)
        ps_lay.addRow('Arquivo SVG:', svg_row_w)
        self._svg_color_btn = _ColorBtn(d.get('color', '#000000'))
        ps_lay.addRow('Cor (tint):', self._svg_color_btn)
        self._stack.addWidget(page_svg)

        # Página 2: PNG
        page_png = QWidget()
        pp_lay = QFormLayout(page_png)
        pp_lay.setContentsMargins(0, 4, 0, 0)
        self._png_path = QLineEdit()
        self._png_path.setReadOnly(True)
        self._png_path.setPlaceholderText('Nenhum arquivo selecionado')
        png_browse = QPushButton('Procurar...')
        png_browse.clicked.connect(
            lambda: self._browse_file(self._png_path, 'PNG (*.png)'))
        png_row_w = QWidget()
        png_row_l = QHBoxLayout(png_row_w)
        png_row_l.setContentsMargins(0, 0, 0, 0)
        png_row_l.addWidget(self._png_path, 1)
        png_row_l.addWidget(png_browse)
        pp_lay.addRow('Arquivo PNG:', png_row_w)
        note = QLabel('A cor original da imagem será mantida.')
        note.setWordWrap(True)
        pp_lay.addRow(note)
        self._stack.addWidget(page_png)

        # Conecta radios ao stack
        self._rb_icon.toggled.connect(
            lambda on: self._stack.setCurrentIndex(0) if on else None)
        self._rb_svg.toggled.connect(
            lambda on: self._stack.setCurrentIndex(1) if on else None)
        self._rb_png.toggled.connect(
            lambda on: self._stack.setCurrentIndex(2) if on else None)

        # Seleciona radio de acordo com dados atuais
        src = d.get('source', 'icon')
        if src == 'svg':
            self._rb_svg.setChecked(True)
            if d.get('file_name'):
                self._svg_path.setText(d['file_name'])
        elif src == 'png':
            self._rb_png.setChecked(True)
            if d.get('file_name'):
                self._png_path.setText(d['file_name'])
        else:
            self._rb_icon.setChecked(True)

        root.addWidget(grp_src)

        # Grupo: tamanho
        grp_size = QGroupBox('Tamanho')
        sz_lay = QFormLayout(grp_size)

        self._size_spin = QSpinBox()
        self._size_spin.setRange(8, 128)
        self._size_spin.setSuffix(' px')
        self._size_spin.setValue(d.get('size', 28))
        sz_lay.addRow('Tamanho base:', self._size_spin)

        self._scale_chk = QCheckBox('Varia com o zoom')
        self._scale_chk.setChecked(d.get('scale_zoom', False))
        sz_lay.addRow(self._scale_chk)

        self._zoom_base_spin = QSpinBox()
        self._zoom_base_spin.setRange(0, 22)
        self._zoom_base_spin.setValue(d.get('zoom_base', 14))
        sz_lay.addRow('Zoom de referência:', self._zoom_base_spin)

        self._min_size_spin = QSpinBox()
        self._min_size_spin.setRange(4, 64)
        self._min_size_spin.setSuffix(' px')
        self._min_size_spin.setValue(d.get('min_size', 16))
        sz_lay.addRow('Tamanho mínimo:', self._min_size_spin)

        self._max_size_spin = QSpinBox()
        self._max_size_spin.setRange(8, 256)
        self._max_size_spin.setSuffix(' px')
        self._max_size_spin.setValue(d.get('max_size', 40))
        sz_lay.addRow('Tamanho máximo:', self._max_size_spin)

        def _toggle_zoom(checked):
            self._zoom_base_spin.setEnabled(checked)
            self._min_size_spin.setEnabled(checked)
            self._max_size_spin.setEnabled(checked)

        _toggle_zoom(self._scale_chk.isChecked())
        self._scale_chk.toggled.connect(_toggle_zoom)
        root.addWidget(grp_size)

        # Grupo: opacidade
        grp_op = QGroupBox('Opacidade')
        op_lay = QFormLayout(grp_op)
        self._pt_opacity = _OpacityRow(d.get('opacity', 1.0))
        op_lay.addRow(self._pt_opacity)
        root.addWidget(grp_op)

    def _refresh_icon_grid(self):
        # Limpa grid
        while self._icon_grid.count():
            item = self._icon_grid.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        cat = self._cat_combo.currentText()
        icons = POINT_ICON_CATEGORIES.get(cat, [])
        cols = 6
        icon_color = self._icon_color_btn.color() if hasattr(
            self, '_icon_color_btn') else '#1e293b'
        for idx, (key, label) in enumerate(icons):
            btn = QPushButton()
            btn.setCheckable(True)
            btn.setChecked(key == self._selected_icon_key)
            btn.setToolTip(label)
            btn.setFixedSize(44, 44)
            pix = _make_icon_pixmap(key, icon_color, 22)
            btn.setIcon(QIcon(pix))
            btn.setIconSize(QSize(22, 22))
            btn.setProperty('icon_key', key)
            btn.clicked.connect(lambda _, k=key: self._select_icon(k))
            self._icon_grid.addWidget(btn, idx // cols, idx % cols)

    def _select_icon(self, key: str):
        self._selected_icon_key = key
        # Desmarca todos e marca somente o clicado
        for i in range(self._icon_grid.count()):
            w = self._icon_grid.itemAt(i).widget()
            if w:
                w.setChecked(w.property('icon_key') == key)

    def _scroll_to_current_icon(self):
        """Seleciona a categoria que contém o ícone atual."""
        target = self._selected_icon_key
        for i, (cat, entries) in enumerate(POINT_ICON_CATEGORIES.items()):
            if any(k == target for k, _ in entries):
                self._cat_combo.setCurrentIndex(i)
                return

    @staticmethod
    def _browse_file(line_edit: QLineEdit, filt: str):
        path, _ = QFileDialog.getOpenFileName(
            None, 'Selecionar arquivo', '', filt)
        if path:
            line_edit.setText(path)

    # ──────────────────────────────────────────────────────────
    # Linha
    # ──────────────────────────────────────────────────────────

    def _build_line_ui(self, root: QVBoxLayout):
        d = self._data

        DASH_OPTIONS = [
            ('solid',    '─────  Sólida'),
            ('dashed',   '- - -  Tracejada'),
            ('dotted',   '·····  Pontilhada'),
            ('dash-dot', '─·─·  Traço-ponto'),
        ]

        grp = QGroupBox('Estilo de linha')
        form = QFormLayout(grp)

        self._line_color_btn = _ColorBtn(d.get('color', '#000000'))
        form.addRow('Cor:', self._line_color_btn)

        self._line_width = QSpinBox()
        self._line_width.setRange(1, 30)
        self._line_width.setSuffix(' px')
        self._line_width.setValue(d.get('width', 2))
        form.addRow('Espessura:', self._line_width)

        self._line_dash = QComboBox()
        for key, lbl in DASH_OPTIONS:
            self._line_dash.addItem(lbl, key)
        cur_dash = d.get('dash', 'solid')
        self._line_dash.setCurrentIndex(
            next((i for i, (k, _) in enumerate(DASH_OPTIONS) if k == cur_dash), 0))
        form.addRow('Estilo:', self._line_dash)

        self._line_opacity = _OpacityRow(d.get('opacity', 1.0))
        form.addRow('Opacidade:', self._line_opacity)

        root.addWidget(grp)

    # ──────────────────────────────────────────────────────────
    # Polígono
    # ──────────────────────────────────────────────────────────

    def _build_polygon_ui(self, root: QVBoxLayout):
        d = self._data

        DASH_OPTIONS = [
            ('solid',    '─────  Sólida'),
            ('dashed',   '- - -  Tracejada'),
            ('dotted',   '·····  Pontilhada'),
            ('dash-dot', '─·─·  Traço-ponto'),
        ]

        # Preenchimento
        grp_fill = QGroupBox('Preenchimento')
        ff = QFormLayout(grp_fill)
        self._fill_color_btn = _ColorBtn(d.get('fill_color', '#000000'))
        ff.addRow('Cor:', self._fill_color_btn)
        self._fill_opacity = _OpacityRow(d.get('fill_opacity', 0.3))
        ff.addRow('Opacidade:', self._fill_opacity)
        root.addWidget(grp_fill)

        # Contorno
        grp_stroke = QGroupBox('Contorno')
        sf = QFormLayout(grp_stroke)
        self._stroke_color_btn = _ColorBtn(d.get('stroke_color', '#000000'))
        sf.addRow('Cor:', self._stroke_color_btn)

        self._stroke_width = QSpinBox()
        self._stroke_width.setRange(0, 30)
        self._stroke_width.setSuffix(' px')
        self._stroke_width.setValue(d.get('stroke_width', 2))
        sf.addRow('Espessura:', self._stroke_width)

        self._stroke_dash = QComboBox()
        cur_dash = d.get('stroke_dash', 'solid')
        for key, lbl in DASH_OPTIONS:
            self._stroke_dash.addItem(lbl, key)
        self._stroke_dash.setCurrentIndex(
            next((i for i, (k, _) in enumerate(DASH_OPTIONS) if k == cur_dash), 0))
        sf.addRow('Estilo:', self._stroke_dash)

        self._stroke_opacity = _OpacityRow(d.get('stroke_opacity', 1.0))
        sf.addRow('Opacidade:', self._stroke_opacity)

        root.addWidget(grp_stroke)

    # ──────────────────────────────────────────────────────────
    # Raster
    # ──────────────────────────────────────────────────────────

    def _build_raster_ui(self, root: QVBoxLayout):
        d = self._data
        grp = QGroupBox('Transparência')
        form = QFormLayout(grp)
        self._raster_opacity = _OpacityRow(d.get('opacity', 1.0))
        form.addRow(self._raster_opacity)
        root.addWidget(grp)

    # ──────────────────────────────────────────────────────────
    # Coletar resultado
    # ──────────────────────────────────────────────────────────

    def _collect_and_accept(self):
        g = self._geom

        if g == 'point':
            result = {'geom': 'point'}
            if self._rb_svg.isChecked():
                result['source'] = 'svg'
                result['file_name'] = self._svg_path.text()
                result['color'] = self._svg_color_btn.color()
                result['file_data'] = self._encode_file(self._svg_path.text())
            elif self._rb_png.isChecked():
                result['source'] = 'png'
                result['file_name'] = self._png_path.text()
                result['color'] = ''
                result['file_data'] = self._encode_file(self._png_path.text())
            else:
                result['source'] = 'icon'
                result['icon_key'] = self._selected_icon_key
                result['color'] = self._icon_color_btn.color()
                result['file_data'] = None
                result['file_name'] = ''
            result['size'] = self._size_spin.value()
            result['scale_zoom'] = self._scale_chk.isChecked()
            result['zoom_base'] = self._zoom_base_spin.value()
            result['min_size'] = self._min_size_spin.value()
            result['max_size'] = self._max_size_spin.value()
            result['opacity'] = self._pt_opacity.value()

        elif g == 'line':
            result = {
                'geom':    'line',
                'color':   self._line_color_btn.color(),
                'width':   self._line_width.value(),
                'dash':    self._line_dash.currentData(),
                'opacity': self._line_opacity.value(),
            }

        elif g == 'polygon':
            result = {
                'geom':           'polygon',
                'fill_color':     self._fill_color_btn.color(),
                'fill_opacity':   self._fill_opacity.value(),
                'stroke_color':   self._stroke_color_btn.color(),
                'stroke_width':   self._stroke_width.value(),
                'stroke_dash':    self._stroke_dash.currentData(),
                'stroke_opacity': self._stroke_opacity.value(),
            }

        else:  # raster
            result = {
                'geom':    'raster',
                'opacity': self._raster_opacity.value(),
            }

        self._result = result
        self.accept()

    def get_result(self) -> dict:
        """Retorna o dict de estilo após accept(); None se cancelado."""
        return self._result

    @staticmethod
    def _encode_file(path: str):
        """Lê arquivo e retorna base64 str, ou None se inválido."""
        if not path:
            return None
        try:
            with open(path, 'rb') as f:
                return base64.b64encode(f.read()).decode('ascii')
        except OSError:
            return None
