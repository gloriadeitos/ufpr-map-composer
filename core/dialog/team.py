# -*- coding: utf-8 -*-
"""
Mixin: aba Equipe — adiciona e remove membros da tabela.
"""
from qgis.PyQt.QtWidgets import QTableWidgetItem


class TeamMixin:

    def _add_team_row(self):
        row = self.team_table.rowCount()
        self.team_table.insertRow(row)
        self.team_table.setItem(row, 0, QTableWidgetItem(''))
        self.team_table.setItem(row, 1, QTableWidgetItem(''))

    def _remove_team_row(self):
        rows = sorted(
            set(idx.row() for idx in self.team_table.selectedIndexes()),
            reverse=True,
        )
        for r in rows:
            self.team_table.removeRow(r)
