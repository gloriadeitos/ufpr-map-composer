# -*- coding: utf-8 -*-
"""
Catalogo de icones FontAwesome Free para camadas de ponto.
Cada entrada: (fa_kebab_key, rotulo_ui)

fa_kebab_key -> camelCase import no TypeScript: 'location-dot' -> faLocationDot
Todos os icones listados existem no @fortawesome/free-solid-svg-icons.
"""
from collections import OrderedDict

POINT_ICON_CATEGORIES = OrderedDict([
    ('Marcadores', [
        ('location-dot',        'Localizacao'),
        ('map-pin',             'Alfinete'),
        ('map-marker-alt',      'Marcador de Mapa'),
        ('star',                'Estrela'),
        ('flag',                'Bandeira'),
        ('crosshairs',          'Mira / Referencia'),
        ('compass',             'Bussola'),
        ('circle',              'Circulo / Ponto'),
        ('circle-dot',          'Ponto Central'),
        ('signs-post',          'Marco / Placa'),
    ]),
    ('Transporte', [
        ('car',                 'Carro'),
        ('bus',                 'Onibus / Terminal'),
        ('bicycle',             'Bicicleta / Ciclovia'),
        ('motorcycle',          'Motocicleta'),
        ('truck',               'Caminhao / Carga'),
        ('train',               'Trem / Metro'),
        ('plane',               'Aeroporto / Aviao'),
        ('helicopter',          'Helicoptero'),
        ('ship',                'Porto / Embarcacao'),
        ('taxi',                'Taxi'),
        ('gas-pump',            'Posto de Combustivel'),
        ('parking',             'Estacionamento'),
        ('traffic-light',       'Semaforo'),
        ('road',                'Rodovia / Via'),
        ('route',               'Rota / Percurso'),
        ('truck-medical',       'Ambulancia'),
        ('person-biking',       'Ciclismo'),
        ('person-hiking',       'Trilha / Caminhada'),
        ('plug',                'Recarga EV'),
    ]),
    ('Saude', [
        ('hospital',            'Hospital'),
        ('house-medical',       'Clinica / UBS / ACS'),
        ('pills',               'Farmacia / Drogaria'),
        ('heart-pulse',         'UPA / Pronto-Socorro'),
        ('syringe',             'Posto de Vacinacao'),
        ('stethoscope',         'Consultorio Medico'),
        ('wheelchair',          'Acessibilidade'),
        ('cross',               'Cruz Vermelha / SAMU'),
        ('kit-medical',         'Primeiros Socorros'),
        ('person-cane',         'CRAS / Assistencia Social'),
    ]),
    ('Educacao', [
        ('school',              'Escola / CMEI'),
        ('building-columns',    'Universidade / Faculdade'),
        ('book',                'Biblioteca'),
        ('graduation-cap',      'Graduacao / Pos-Graduacao'),
        ('chalkboard-user',     'Sala de Aula / Curso'),
        ('microscope',          'Laboratorio / Pesquisa'),
        ('book-open',           'Leitura / Centro Cultural'),
        ('pencil',              'Sala de Recursos / Reforco'),
    ]),
    ('Comercio e Servicos', [
        ('utensils',            'Restaurante / Lanchonete'),
        ('mug-hot',             'Cafe / Padaria'),
        ('store',               'Comercio / Loja'),
        ('cart-shopping',       'Supermercado'),
        ('bed',                 'Hotel / Pousada'),
        ('landmark',            'Banco / Agencia Financeira'),
        ('envelope',            'Correios / Agencia Postal'),
        ('scissors',            'Barbearia / Salao de Beleza'),
        ('wrench',              'Mecanica / Oficina'),
        ('city',                'Centro Comercial / Shopping'),
        ('building',            'Edificio / Sede'),
        ('industry',            'Industria / Fabrica'),
        ('warehouse',           'Deposito / Armazem'),
    ]),
    ('Seguranca e Emergencia', [
        ('shield-halved',       'Delegacia / Policia'),
        ('fire-extinguisher',   'Corpo de Bombeiros'),
        ('life-ring',           'Guarda-Vidas'),
        ('triangle-exclamation', 'Aviso / Area de Risco'),
        ('bell',                'Alarme / Sirene'),
        ('person-shelter',      'Abrigo / Defesa Civil'),
        ('vault',               'Tesouraria / Custodia'),
    ]),
    ('Lazer e Cultura', [
        ('futbol',              'Campo / Estadio de Futebol'),
        ('dumbbell',            'Academia / Ginasio'),
        ('masks-theater',       'Teatro / Cinema / Arte'),
        ('camera',              'Ponto Turistico / Mirante'),
        ('person-swimming',     'Piscina / Praia / Clube'),
        ('mountain-sun',        'Parque / Area Natural'),
        ('tree',                'Praca / Arborizacao'),
        ('music',               'Show / Evento / Arena'),
        ('panorama',            'Vista Panoramica'),
    ]),
    ('Religiao e Patrimonio', [
        ('church',              'Igreja / Catedral'),
        ('place-of-worship',    'Mesquita / Templo / Sinagoga'),
        ('chess-rook',          'Fortaleza / Castelo / Patrimonio'),
    ]),
    ('Infraestrutura e Meio Ambiente', [
        ('bolt',                'Subestacao / Energia Eletrica'),
        ('droplet',             'ETA / Captacao / Fonte'),
        ('tower-broadcast',     'Antena / Telecomunicacoes'),
        ('solar-panel',         'Usina Solar'),
        ('recycle',             'Reciclagem / Coleta Seletiva'),
        ('water',               'Manancial / Rio / Lago'),
        ('leaf',                'Area Verde / Ambiental'),
        ('fire',                'Queimada / Risco de Incendio'),
        ('industry',            'Fabrica / Industria'),
    ]),
    ('Sinais e Avisos', [
        ('circle-exclamation',  'Atencao / Alerta'),
        ('circle-info',         'Informacao / Orientacao'),
        ('circle-question',     'Consulta Publica / Duvida'),
        ('ban',                 'Proibicao / Restricao'),
        ('circle-check',        'Liberado / Aprovado'),
        ('arrow-up',            'Sentido Norte / Direcao'),
        ('arrow-right',         'Direcao Leste / Continuacao'),
    ]),
])

# ------------------------------------------------------------------
# Estilos padrao por geometria
# ------------------------------------------------------------------
DEFAULT_POINT_STYLE = {
    'source':     'icon',
    'icon_key':   'location-dot',
    'color':      '#000000',
    'size':       28,
    'scale_zoom': False,
    'zoom_base':  14,
    'min_size':   16,
    'max_size':   40,
    'opacity':    1.0,
    'file_data':  None,
    'file_name':  '',
}

DEFAULT_LINE_STYLE = {
    'color':   '#000000',
    'width':   2,
    'dash':    'solid',
    'opacity': 1.0,
}

DEFAULT_POLYGON_STYLE = {
    'fill_color':     '#000000',
    'fill_opacity':   0.3,
    'stroke_color':   '#000000',
    'stroke_width':   2,
    'stroke_dash':    'solid',
    'stroke_opacity': 1.0,
}


def fa_key_to_ts(key: str) -> str:
    """Converte kebab-case para camelCase com prefixo 'fa'.
    Ex.: 'location-dot' -> 'faLocationDot'
    """
    return 'fa' + ''.join(w.capitalize() for w in key.split('-'))


def all_fa_ts_names() -> list:
    """Retorna todos os nomes camelCase unicos do catalogo."""
    names = set()
    for entries in POINT_ICON_CATEGORIES.values():
        for key, _ in entries:
            names.add(fa_key_to_ts(key))
    return sorted(names)
