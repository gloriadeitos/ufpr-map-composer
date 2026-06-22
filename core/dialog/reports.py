# -*- coding: utf-8 -*-
"""
Mixin: aba Documentos — gerencia a lista de PDFs para o WebGIS.
"""
import os
from qgis.PyQt.QtWidgets import QTableWidgetItem, QFileDialog
from qgis.PyQt.QtCore import Qt


class ReportsMixin:

    def _populate_reports(self):
        """Inicia a tabela vazia."""
        self.reports_table.setRowCount(0)

    def _add_report_row(self):
        """Abre seletor de arquivo(s) PDF e insere uma linha por arquivo."""
        paths, _ = QFileDialog.getOpenFileNames(
            self,
            'Selecionar PDF(s)',
            '',
            'Documentos PDF (*.pdf *.PDF)',
        )
        for src_path in paths:
            basename = os.path.basename(src_path)
            label = os.path.splitext(basename)[0]
            row = self.reports_table.rowCount()
            self.reports_table.insertRow(row)
            # col 0: descrição editável
            self.reports_table.setItem(row, 0, QTableWidgetItem(label))
            # col 1: nome do arquivo (não editável); caminho completo em UserRole
            file_item = QTableWidgetItem(basename)
            file_item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsSelectable)
            file_item.setData(Qt.UserRole, src_path)
            self.reports_table.setItem(row, 1, file_item)
        if paths:
            self.reports_table.scrollToBottom()
            self.reports_table.setCurrentCell(
                self.reports_table.rowCount() - 1, 0)

    def _remove_report_row(self):
        """Remove a linha selecionada na tabela de documentos."""
        row = self.reports_table.currentRow()
        if row >= 0:
            self.reports_table.removeRow(row)
