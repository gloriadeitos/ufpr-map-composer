# -*- coding: utf-8 -*-
"""
Mixin: aba Relatórios — gerencia a lista de PDFs e pranchas.
"""
from qgis.PyQt.QtWidgets import QTableWidgetItem


class ReportsMixin:

    def _populate_reports(self):
        """Inicia a tabela vazia (sem exemplos hardcoded)."""
        self.reports_table.setRowCount(0)

    def _add_report_row(self, label: str = '', file_: str = '', folder: str = 'Relatorios'):
        """Insere uma linha na tabela de relatórios."""
        row = self.reports_table.rowCount()
        self.reports_table.insertRow(row)
        self.reports_table.setItem(row, 0, QTableWidgetItem(label))
        self.reports_table.setItem(row, 1, QTableWidgetItem(file_))
        self.reports_table.setItem(row, 2, QTableWidgetItem(folder))
        self.reports_table.scrollToBottom()
        self.reports_table.setCurrentCell(row, 0)

    def _remove_report_row(self):
        """Remove a linha selecionada na tabela de relatórios."""
        row = self.reports_table.currentRow()
        if row >= 0:
            self.reports_table.removeRow(row)
