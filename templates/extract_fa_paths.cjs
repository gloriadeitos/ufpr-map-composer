/**
 * Extrai SVG path data dos módulos FA e gera icon_paths.py para uso no plugin QGIS.
 * Rodar com: node extract_fa_paths.js  (dentro da pasta templates/)
 */
const fs = require('fs');
const path = require('path');

// Todas as chaves de ícone usadas no catálogo (point_icons.py)
const ICON_KEYS = [
    'location-dot', 'map-pin', 'map-marker-alt', 'star', 'flag',
    'crosshairs', 'compass', 'circle', 'circle-dot', 'signs-post',
    'car', 'bus', 'bicycle', 'motorcycle', 'truck', 'train', 'plane',
    'helicopter', 'ship', 'taxi', 'gas-pump', 'parking', 'traffic-light',
    'road', 'route', 'truck-medical', 'person-biking', 'person-hiking', 'plug',
    'hospital', 'house-medical', 'pills', 'heart-pulse', 'syringe',
    'stethoscope', 'wheelchair', 'cross', 'kit-medical', 'person-cane',
    'school', 'building-columns', 'graduation-cap', 'chalkboard-user',
    'microscope', 'book-open', 'pencil', 'book',
    'utensils', 'mug-hot', 'store', 'cart-shopping', 'bed', 'landmark',
    'envelope', 'scissors', 'wrench', 'city', 'building', 'industry', 'warehouse',
    'shield-halved', 'fire-extinguisher', 'life-ring', 'triangle-exclamation',
    'bell', 'person-shelter', 'vault',
    'futbol', 'dumbbell', 'masks-theater', 'camera', 'person-swimming',
    'mountain-sun', 'tree', 'music', 'panorama',
    'church', 'place-of-worship', 'chess-rook',
    'bolt', 'droplet', 'tower-broadcast', 'solar-panel', 'recycle',
    'water', 'leaf', 'fire', 'satellite',
    'circle-exclamation', 'circle-info', 'circle-question', 'ban',
    'circle-check', 'arrow-up', 'arrow-right',
];

function kebabToPascal(key) {
    return key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
}

const FA_DIR = path.join(__dirname, 'node_modules/@fortawesome/free-solid-svg-icons');

const entries = [];
const missing = [];

for (const key of ICON_KEYS) {
    const pascal = kebabToPascal(key);
    const filePath = path.join(FA_DIR, `fa${pascal}.js`);
    if (!fs.existsSync(filePath)) {
        missing.push(key);
        continue;
    }
    try {
        const mod = require(filePath);
        const def = mod.definition || mod[`fa${pascal}`];
        if (!def) { missing.push(key); continue; }
        const [w, h, , , pathData] = def.icon;
        const pd = Array.isArray(pathData) ? pathData.join(' ') : pathData;
        entries.push({ key, w, h, pd });
    } catch (e) {
        missing.push(key);
    }
}

if (missing.length) {
    console.warn('Icones nao encontrados:', missing.join(', '));
}

// Gera icon_paths.py
const lines = [
    '# -*- coding: utf-8 -*-',
    '# Gerado automaticamente por extract_fa_paths.js — NÃO editar manualmente.',
    '# Mapa de chave kebab → (largura, altura, svg_path_d)',
    'FA_ICON_PATHS: dict[str, tuple[int, int, str]] = {',
];

for (const { key, w, h, pd } of entries) {
    // Escapa aspas simples no path (raro, mas seguro)
    const safe = pd.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(`    '${key}': (${w}, ${h}, '${safe}'),`);
}

lines.push('}', '');

const outPath = path.join(__dirname, '..', 'core', 'dialog', 'icon_paths.py');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Gerado: ${outPath} (${entries.length} icones)`);
