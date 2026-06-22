import { useCallback, useEffect, useRef, useState, useMemo, createContext, useContext } from 'react';
import 'ol/ol.css';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import WebGLTileLayer from 'ol/layer/WebGLTile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import TileArcGISRest from 'ol/source/TileArcGISRest';
import GeoTIFFSource from 'ol/source/GeoTIFF';
import { fromLonLat, transform } from 'ol/proj';
import { GeoJSON } from 'ol/format';
import { Style, Stroke, Fill, Circle as CircleStyle, RegularShape, Icon } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';
import Overlay from 'ol/Overlay';
import { getRenderPixel } from 'ol/render';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import MapPanel from './MapPanel';
import { LegendContent, DownloadContent, ReportsContent, AttrContent } from './panel/PanelContent';
import { FontAwesomeIcon, faEye, faEyeSlash } from '../utils/Icons';
import MapPanelSheet from './MapPanelSheet';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { makePointMarkerUrl } from '../utils/PointIcons';
import type { LayerStyle, PointStyle, LineStyle, PolygonStyle } from '../types/layers';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import Select from 'ol/interaction/Select';
import { MAP_CENTER, MAP_ZOOM } from '../config';
import GEODATA from '../data/geodata';

proj4.defs('EPSG:31982', '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
register(proj4);

function formatVal(v: any): string {
    const n = Number(v);
    if (!isNaN(n) && v !== '' && v !== null && v !== undefined) return Number.isInteger(n) ? String(n) : n.toFixed(3);
    return String(v);
}

const FIELD_UNITS: Record<string, string> = {
    area: ' m²', comprimento: ' m', length: ' m', perimetro: ' m', perimeter: ' m', extensao: ' m',
    altura: ' m', height: ' m', largura: ' m', width: ' m', elevation: ' m', altitude: ' m', cota: ' m',
    'st_area(shape)': ' m²', 'st_perimeter(shape)': ' m', 'st_length(shape)': ' m', x_coord: ' m', y_coord: ' m',
};
function getUnit(key: string): string { return FIELD_UNITS[key.toLowerCase()] ?? ''; }

const SwipeContext = createContext<{ ratioRef: React.MutableRefObject<number>; activeRef: React.MutableRefObject<boolean> }>({ ratioRef: { current: 0.5 }, activeRef: { current: false } });

const DEFAULT_PROJECTION = 'EPSG:3857';
const GEOGRAPHIC_PROJECTION = 'EPSG:4326';
const UTM_PROJECTION = 'EPSG:31982';

export interface LayerConfig {
    id: string; label: string; file: string; color: string;
    geometryType?: 'polygon' | 'line' | 'point';
    type?: 'geojson' | 'raster' | 'tiles' | 'arcgis';
    url?: string; opacity?: number; downloadOnly?: boolean;
    extraDownloads?: { label: string; file: string }[];
    tileUrl?: string; arcgisUrl?: string; arcgisLayerId?: number;
    minZoom?: number; maxZoom?: number; clipToStudyArea?: boolean;
    compareOnly?: boolean; strokeColor?: string; strokeWidth?: number;
    pointStyle?: string;
    style?: LayerStyle;
    fields?: { key: string; label: string; defaultHidden?: boolean }[];
}

const BASE_LAYER_CONFIGS: Record<string, { url: string; attribution: string; minZoom: number; maxZoom: number }> = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors', minZoom: 1, maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, Maxar, Earthstar Geographics', minZoom: 0, maxZoom: 19 },
    topo: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, USGS, NOAA', minZoom: 1, maxZoom: 19 },
    streets: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, HERE, Garmin, FAO, NOAA, USGS', minZoom: 1, maxZoom: 19 },
    dark: { url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', attribution: '© CartoDB © OpenStreetMap contributors', minZoom: 0, maxZoom: 19 },
    light: { url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', attribution: '© CartoDB © OpenStreetMap contributors', minZoom: 0, maxZoom: 19 },
    terrain: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, USGS, NOAA', minZoom: 3, maxZoom: 19 },
    natgeo: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', attribution: '© National Geographic, Esri', minZoom: 3, maxZoom: 19 },
};

const detectNeedsReproject = (geojson: any): boolean => {
    const name: string = geojson?.crs?.properties?.name ?? '';
    if (name.includes('CRS84') || name.includes('4326')) return false;
    if (name.includes('31982')) return true;
    return false;
};

function makePointImage(color: string, strokeColor: string, pointStyle = 'circle', radius = 7): CircleStyle | RegularShape {
    const fill = new Fill({ color: color + '55' });
    const stroke = new Stroke({ color: strokeColor, width: 2 });
    const r = radius;
    switch (pointStyle) {
        case 'square': return new RegularShape({ fill, stroke, points: 4, radius: r, angle: Math.PI / 4 });
        case 'triangle': return new RegularShape({ fill, stroke, points: 3, radius: r, angle: 0 });
        case 'star': return new RegularShape({ fill, stroke, points: 5, radius: r, radius2: r / 2, angle: 0 });
        case 'diamond': return new RegularShape({ fill, stroke, points: 4, radius: r, angle: 0 });
        case 'cross': return new RegularShape({ fill, stroke, points: 4, radius: r, radius2: r / 4, angle: Math.PI / 4 });
        default: return new CircleStyle({ radius: r, fill, stroke });
    }
}

const DASH_PATTERNS: Record<string, number[] | undefined> = {
    solid: undefined,
    dashed: [12, 6],
    dotted: [2, 6],
    'dash-dot': [12, 6, 2, 6],
};

/** Constrói ol/Style a partir do dict LayerStyle do plugin. */
function styleFromLayerStyle(ls: LayerStyle, selected = false): Style | Style[] {
    if (ls.geom === 'point') {
        const ps = ls as PointStyle;
        const sz = (ps.size ?? 28) / 40;  // normaliza para scale do Icon
        const url = makePointMarkerUrl(ps.iconKey ?? 'location-dot', ps.color ?? '#3B82F6', ps.size ?? 28);
        const opacity = ps.opacity ?? 1;
        if (selected) {
            return [
                new Style({ image: new Icon({ src: url, scale: sz * 1.45, opacity }) }),
                new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: ps.color ?? '#3B82F6' }) }) }),
            ];
        }
        return [
            new Style({ image: new Icon({ src: url, scale: sz, opacity }) }),
            new Style({ image: new CircleStyle({ radius: 2, fill: new Fill({ color: ps.color ?? '#3B82F6' }) }) }),
        ];
    }
    if (ls.geom === 'line') {
        const line = ls as LineStyle;
        const dash = DASH_PATTERNS[line.dash ?? 'solid'];
        const stroke = new Stroke({ color: line.color, width: line.width ?? 2, lineDash: dash });
        if (selected) return [new Style({ stroke: new Stroke({ color: '#fff', width: (line.width ?? 2) + 4 }) }), new Style({ stroke })];
        return new Style({ stroke });
    }
    if (ls.geom === 'polygon') {
        const poly = ls as PolygonStyle;
        const fc = poly.fillColor + Math.round((poly.fillOpacity ?? 0.3) * 255).toString(16).padStart(2, '0');
        const dash = DASH_PATTERNS[poly.strokeDash ?? 'solid'];
        const stroke = new Stroke({ color: poly.strokeColor, width: poly.strokeWidth ?? 2, lineDash: dash });
        const fill = new Fill({ color: fc });
        if (selected) return [new Style({ stroke: new Stroke({ color: '#fff', width: (poly.strokeWidth ?? 2) + 4 }) }), new Style({ stroke, fill })];
        return new Style({ stroke, fill });
    }
    // raster — não chega aqui via vetor
    return new Style();
}

const getFeatureStyle = (color: string, geometryType?: string, strokeColor?: string, strokeWidth?: number, pointStyle?: string): Style | Style[] => {
    const sc = strokeColor ?? color; const sw = strokeWidth ?? 2;
    if (geometryType === 'line') return new Style({ stroke: new Stroke({ color: sc, width: sw }) });
    if (geometryType === 'point') return [
        new Style({ image: makePointImage(color, sc, pointStyle ?? 'circle', 7) }),
        new Style({ image: new CircleStyle({ radius: 2.5, fill: new Fill({ color: sc }) }) }),
    ];
    return new Style({ stroke: new Stroke({ color: sc, width: sw }), fill: new Fill({ color: color + '55' }) });
};

// ─── Drawing engine ───────────────────────────────────────────────────────────
type DrawTool = 'cursor' | 'point' | 'line' | 'polygon' | 'circle';

class DrawingEngine {
    private vectorSource = new VectorSource();
    readonly vectorLayer: VectorLayer<VectorSource>;
    private drawInteraction: Draw | null = null;
    private modifyInteraction: Modify;
    private snapInteraction: Snap;
    private selectInteraction: Select;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;
    private map: OLMap;

    constructor(map: OLMap) {
        this.map = map;
        this.vectorLayer = new VectorLayer({
            source: this.vectorSource, zIndex: 50,
            style: (feature) => {
                const type = feature.getGeometry()?.getType(); const color = '#007AFF';
                if (type === 'Point') return new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color }), stroke: new Stroke({ color: '#fff', width: 2 }) }) });
                if (type === 'LineString') return new Style({ stroke: new Stroke({ color, width: 2.5 }) });
                return new Style({ stroke: new Stroke({ color, width: 2 }), fill: new Fill({ color: color + '33' }) });
            },
        });
        this.map.addLayer(this.vectorLayer);
        this.modifyInteraction = new Modify({ source: this.vectorSource });
        this.snapInteraction = new Snap({ source: this.vectorSource });
        this.selectInteraction = new Select({
            layers: (l) => l === this.vectorLayer,
            style: (feature) => {
                const type = feature.getGeometry()?.getType(); const color = '#007AFF';
                if (type === 'Point') return [new Style({ image: new CircleStyle({ radius: 10, fill: new Fill({ color: '#fff' }) }) }), new Style({ image: new CircleStyle({ radius: 7, fill: new Fill({ color }), stroke: new Stroke({ color: '#fff', width: 2 }) }) })];
                if (type === 'LineString') return [new Style({ stroke: new Stroke({ color: '#fff', width: 5 }) }), new Style({ stroke: new Stroke({ color, width: 3 }) })];
                return [new Style({ stroke: new Stroke({ color: '#fff', width: 4 }) }), new Style({ stroke: new Stroke({ color, width: 2.5 }), fill: new Fill({ color: color + '55' }) })];
            },
        });
        this.map.addInteraction(this.modifyInteraction);
        this.map.addInteraction(this.snapInteraction);
        this.map.addInteraction(this.selectInteraction);
        this.keyHandler = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement === document.body) this.deleteSelected();
            if (e.key === 'Escape') this.setTool('cursor');
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    setTool(tool: DrawTool) {
        if (this.drawInteraction) { this.map.removeInteraction(this.drawInteraction); this.drawInteraction = null; }
        if (tool !== 'cursor') {
            const typeMap: Record<DrawTool, string> = { cursor: '', point: 'Point', line: 'LineString', polygon: 'Polygon', circle: 'Circle' };
            this.drawInteraction = new Draw({ source: this.vectorSource, type: typeMap[tool] as any });
            this.map.addInteraction(this.drawInteraction);
        }
        this.map.getTargetElement().style.cursor = tool === 'cursor' ? '' : 'crosshair';
    }

    deleteSelected() { const f = this.selectInteraction.getFeatures(); f.forEach(ft => this.vectorSource.removeFeature(ft)); f.clear(); }
    clearAll() { this.selectInteraction.getFeatures().clear(); this.vectorSource.clear(); }
    destroy() {
        if (this.drawInteraction) this.map.removeInteraction(this.drawInteraction);
        this.map.removeInteraction(this.modifyInteraction); this.map.removeInteraction(this.snapInteraction); this.map.removeInteraction(this.selectInteraction);
        this.map.removeLayer(this.vectorLayer);
        if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
    }
}

// ─── Drawing Toolbar UI ───────────────────────────────────────────────────────
const _sfDraw = "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif";

const DrawingToolbar = ({ map, hidden }: { map: OLMap | null; hidden?: boolean }) => {
    const engineRef = useRef<DrawingEngine | null>(null);
    const [activeTool, setActiveTool] = useState<DrawTool>('cursor');
    const [hasFeatures, setHasFeatures] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!map) return;
        const engine = new DrawingEngine(map);
        engineRef.current = engine;
        const onFC = () => setHasFeatures(engine.vectorLayer.getSource()!.getFeatures().length > 0);
        engine.vectorLayer.getSource()!.on('addfeature', onFC);
        engine.vectorLayer.getSource()!.on('removefeature', onFC);
        engine.vectorLayer.getSource()!.on('clear', onFC);
        const view = map.getView();
        const onRot = () => setRotation(view.getRotation());
        view.on('change:rotation', onRot);
        const onFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFs);
        return () => { engine.destroy(); engineRef.current = null; view.un('change:rotation', onRot); document.removeEventListener('fullscreenchange', onFs); };
    }, [map]);

    const handleTool = (tool: DrawTool) => { setActiveTool(tool); engineRef.current?.setTool(tool); };
    const handleDelete = () => engineRef.current?.deleteSelected();
    const handleClear = () => { engineRef.current?.clearAll(); setHasFeatures(false); };
    const handleZoomIn = () => { if (!map) return; const v = map.getView(); v.animate({ zoom: (v.getZoom() ?? 10) + 1, duration: 200 }); };
    const handleZoomOut = () => { if (!map) return; const v = map.getView(); v.animate({ zoom: (v.getZoom() ?? 10) - 1, duration: 200 }); };
    const handleHome = () => { if (!map) return; map.getView().animate({ center: fromLonLat([MAP_CENTER[0], MAP_CENTER[1]]), zoom: MAP_ZOOM, rotation: 0, duration: 500 }); };
    const handleResetNorth = () => { if (!map) return; map.getView().animate({ rotation: 0, duration: 300 }); };
    const handleMyLocation = () => {
        if (!map || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => { map.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 17, duration: 500 }); });
    };
    const handleFullscreen = () => {
        const el = (map?.getTargetElement()?.closest('.relative') as Element | null) ?? document.documentElement;
        if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
    };

    const glass: React.CSSProperties = { background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.13),0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' };
    const btn = (opts: { active?: boolean; color?: string; br: string; disabled?: boolean }): React.CSSProperties => ({ width: '36px', height: '36px', border: 'none', padding: 0, background: opts.active ? 'rgba(0,122,255,0.12)' : 'transparent', color: opts.active ? '#007AFF' : (opts.color ?? '#3c3c43'), cursor: opts.disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, color 0.15s', fontFamily: _sfDraw, borderRadius: opts.br, opacity: opts.disabled ? 0.45 : 1, flexShrink: 0 });
    const T = '14px 14px 4px 4px'; const M = '4px'; const B = '4px 4px 14px 14px';
    const TOOLS: { id: DrawTool; label: string; icon: React.ReactNode }[] = [
        { id: 'cursor', label: 'Selecionar', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1.5l10 5.5-4.5 1L6 13.5 3 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" /></svg> },
        { id: 'point', label: 'Ponto', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" /><line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
        { id: 'line', label: 'Linha', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="2,13 6,7 10,10 14,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
        { id: 'polygon', label: 'Polígono', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="8,2 14,6 12,13 4,13 2,6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" /></svg> },
        { id: 'circle', label: 'Círculo', icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" /></svg> },
    ];

    return (
        <div style={{ position: 'absolute', left: '10px', top: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: hidden ? 'none' : 'auto', opacity: hidden ? 0 : 1, transition: 'opacity 0.2s ease', visibility: hidden ? 'hidden' : 'visible' }}>
            <div style={glass}>
                <button title="Ampliar" onClick={handleZoomIn} style={btn({ br: T })}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
                <button title="Reduzir" onClick={handleZoomOut} style={btn({ br: M })}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
                <button title="Vista inicial" onClick={handleHome} style={btn({ br: M })}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8L8 2l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M4 6v6a1 1 0 001 1h2v-3h2v3h2a1 1 0 001-1V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg></button>
                <button title="Minha localização" onClick={handleMyLocation} style={btn({ br: M })}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" /><line x1="8" y1="1" x2="8" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="8" y1="12.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="1" y1="8" x2="3.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="12.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
                <button title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'} onClick={handleFullscreen} style={btn({ br: M })}>{isFullscreen ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>
                <button title={rotation !== 0 ? 'Alinhar ao norte' : 'Norte'} onClick={handleResetNorth} style={btn({ br: B })}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ transform: `rotate(${-rotation}rad)`, transition: 'transform 0.2s' }}>
                        <path d="M10 2 L12 10 L10 8.5 L8 10 Z" fill="currentColor" />
                        <path d="M10 18 L12 10 L10 11.5 L8 10 Z" fill="currentColor" opacity="0.35" />
                    </svg>
                </button>
            </div>
            <div style={glass}>{TOOLS.map((tool, i) => <button key={tool.id} title={tool.label} onClick={() => handleTool(tool.id)} style={btn({ active: activeTool === tool.id, br: i === 0 ? T : i === TOOLS.length - 1 ? B : M })}>{tool.icon}</button>)}</div>
            <div style={glass}>
                <button title="Deletar selecionado" onClick={handleDelete} style={btn({ color: '#FF3B30', br: T })}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5M6.5 8v4M9.5 8v4M4 5l.7 7.1A1 1 0 005.7 13h4.6a1 1 0 001-.9L12 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                <button title="Limpar tudo" onClick={() => { if (hasFeatures) handleClear(); }} style={btn({ br: B, disabled: !hasFeatures })}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13h12M3.5 13l2-5.5L8 9l2.5-7 2 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            </div>
        </div>
    );
};

// ─── Base layer controller ────────────────────────────────────────────────────
const BaseLayerController = ({ baseLayer, map }: { baseLayer: string; map: OLMap | null }) => {
    const baseLayerRef = useRef<TileLayer<XYZ> | null>(null);
    useEffect(() => {
        if (!map) return;
        if (baseLayerRef.current) { map.removeLayer(baseLayerRef.current); baseLayerRef.current = null; }
        const cfg = BASE_LAYER_CONFIGS[baseLayer];
        if (cfg) {
            const tileLayer = new TileLayer({ source: new XYZ({ url: cfg.url.replace('{s}', 'a'), attributions: cfg.attribution, minZoom: cfg.minZoom, maxZoom: cfg.maxZoom }) });
            baseLayerRef.current = tileLayer;
            map.getLayers().insertAt(0, tileLayer);
            map.getView().setMinZoom(cfg.minZoom);
            const cz = map.getView().getZoom() || 0;
            if (cz < cfg.minZoom) map.getView().setZoom(cfg.minZoom);
        }
    }, [baseLayer, map]);
    return null;
};

// ─── GeoJSON Layer ────────────────────────────────────────────────────────────
interface ExpandedFeatureData { label: string; color: string; entries: [string, any][]; reopenKey?: string; }

const GeoJSONLayer = ({ layer, visible, map }: { layer: LayerConfig; visible: boolean; map: OLMap | null }) => {
    const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const popupOverlayRef = useRef<Overlay | null>(null);
    const selectedFeatureRef = useRef<any>(null);
    const { ratioRef: swipeRatioRef, activeRef: compareActiveRef } = useContext(SwipeContext);

    useEffect(() => {
        if (!map) return;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;pointer-events:auto;filter:drop-shadow(0 8px 32px rgba(0,0,0,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10));';
        const card = document.createElement('div');
        card.id = `popup-card-${layer.id}`;
        card.style.cssText = ['min-width:240px', 'max-width:360px', 'background:rgba(255,255,255,0.88)', 'backdrop-filter:blur(28px) saturate(200%)', '-webkit-backdrop-filter:blur(28px) saturate(200%)', 'border:1px solid rgba(255,255,255,0.6)', 'border-radius:16px', 'overflow:hidden', "font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif", 'display:none'].join(';');
        const arrow = document.createElement('div');
        arrow.style.cssText = 'width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:10px solid rgba(255,255,255,0.88);margin:0 auto;display:none;';
        wrapper.appendChild(card); wrapper.appendChild(arrow);
        const overlay = new Overlay({ element: wrapper, positioning: 'bottom-center', offset: [0, -4], stopEvent: true, autoPan: { animation: { duration: 200 } } });
        popupOverlayRef.current = overlay;
        map.addOverlay(overlay);
        const closeThis = () => { overlay.setPosition(undefined); card.style.display = 'none'; arrow.style.display = 'none'; selectedFeatureRef.current = null; vectorLayerRef.current?.changed(); };
        wrapper.addEventListener('click', (e) => { if ((e.target as HTMLElement).dataset.close) closeThis(); });
        const mapEl = map.getTargetElement();
        const onOther = (e: Event) => { if ((e as CustomEvent).detail !== layer.id) { closeThis(); } };
        mapEl.addEventListener('geojson-popup-open', onOther);
        return () => { if (map) map.removeOverlay(overlay); mapEl.removeEventListener('geojson-popup-open', onOther); };
    }, [map, layer.id]);

    useEffect(() => {
        if (!map) return;
        const data = (GEODATA as Record<string, any>)[layer.id];
        if (!data) return;
        const needsReproject = detectNeedsReproject(data);
        const dataProjection = needsReproject ? UTM_PROJECTION : GEOGRAPHIC_PROJECTION;
        const features = new GeoJSON().readFeatures(data, { dataProjection, featureProjection: DEFAULT_PROJECTION });
        const source = new VectorSource({ features });
        const vectorLayer = new VectorLayer({
            source, zIndex: 20,
            style: (feature) => {
                const gt = feature.getGeometry()?.getType();
                let type: 'polygon' | 'line' | 'point' = 'polygon';
                if (gt === 'LineString' || gt === 'MultiLineString') type = 'line';
                else if (gt === 'Point' || gt === 'MultiPoint') type = 'point';
                const isSelected = feature === selectedFeatureRef.current;
                if (layer.style) {
                    return styleFromLayerStyle(layer.style, isSelected);
                }
                if (isSelected) {
                    if (type === 'line') return [new Style({ stroke: new Stroke({ color: '#fff', width: 6 }) }), new Style({ stroke: new Stroke({ color: layer.color, width: 3.5 }) })];
                    if (type === 'point') return [
                        new Style({ image: makePointImage('#ffffff99', '#ffffff', layer.pointStyle ?? 'circle', 11) }),
                        new Style({ image: makePointImage(layer.color, '#fff', layer.pointStyle ?? 'circle', 8) }),
                    ];
                    return [new Style({ stroke: new Stroke({ color: '#fff', width: 5 }) }), new Style({ stroke: new Stroke({ color: layer.color, width: 2.5 }), fill: new Fill({ color: layer.color + '66' }) })];
                }
                return getFeatureStyle(layer.color, type, layer.strokeColor, layer.strokeWidth, layer.pointStyle);
            },
            visible,
        });
        vectorLayer.on('prerender', (event: any) => {
            if (!compareActiveRef.current) return;
            const ctx = event.context as CanvasRenderingContext2D;
            const mapSize = map.getSize()!;
            const swipeXPx = mapSize[0] * swipeRatioRef.current;
            const tl = getRenderPixel(event, [0, 0]); const tr = getRenderPixel(event, [swipeXPx, 0]);
            const br = getRenderPixel(event, [swipeXPx, mapSize[1]]); const bl = getRenderPixel(event, [0, mapSize[1]]);
            ctx.save(); ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tr[0], tr[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.clip();
        });
        vectorLayer.on('postrender', (event: any) => { if (!compareActiveRef.current) return; (event.context as CanvasRenderingContext2D).restore(); });
        map.addLayer(vectorLayer);
        vectorLayerRef.current = vectorLayer;
        return () => { if (vectorLayerRef.current && map) map.removeLayer(vectorLayerRef.current); };
    }, [layer.id, layer.color, map]);

    useEffect(() => {
        if (!map) return;
        const handleClick = (evt: any) => {
            if (!vectorLayerRef.current || !popupOverlayRef.current) return;
            const overlay = popupOverlayRef.current;
            const wrapper = overlay.getElement() as HTMLDivElement;
            const card = wrapper.querySelector(`#popup-card-${layer.id}`) as HTMLDivElement;
            const arrow = wrapper.children[1] as HTMLDivElement;
            const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, { layerFilter: (l) => l === vectorLayerRef.current });
            if (feature) {
                const props = feature.getProperties();
                let entries: [string, any][];
                if (layer.fields && layer.fields.length > 0) {
                    entries = layer.fields.map(f => [f.key, props[f.key]] as [string, any]).filter(([, v]) => v !== null && v !== undefined && v !== '' && String(v).toLowerCase() !== 'null');
                } else {
                    entries = Object.entries(props).filter(([k, v]) => v !== null && v !== undefined && v !== '' && String(v).toLowerCase() !== 'null' && !['geometry', 'layer', 'style', 'feature'].includes(k));
                }
                if (entries.length === 0) return;
                const getLabel = (key: string) => layer.fields?.find(f => f.key === key)?.label ?? key;
                const rows = entries.map(([k, v]) => `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.05)"><span style="font-size:11px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;flex-shrink:0">${getLabel(k)}</span><span style="font-size:12px;font-weight:500;color:#1c1c1e;text-align:right;word-break:break-word">${formatVal(v)}${getUnit(k)}</span></div>`).join('');
                const lastCoord = evt.coordinate as number[];
                card.innerHTML = `<div style="height:3px;background:${layer.color};border-radius:16px 16px 0 0"></div><div style="padding:12px 14px 10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:13px;font-weight:700;color:#1c1c1e;letter-spacing:-.01em">${layer.label}</span><div style="display:flex;gap:5px;align-items:center"><button id="vec-expand-btn" style="background:rgba(59,130,246,0.10);border:1px solid rgba(59,130,246,0.25);border-radius:7px;cursor:pointer;padding:3px 7px;display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#3b82f6;line-height:1;white-space:nowrap"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1H1v8h8V5" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 1h3v3" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="6" x2="9" y2="1" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round"/></svg>Expandir</button><button data-close="1" style="background:rgba(120,120,128,0.16);border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;font-size:12px;color:#636366;line-height:1">✕</button></div></div><div style="display:flex;flex-direction:column">${rows}</div></div>`;
                card.querySelector('#vec-expand-btn')?.addEventListener('click', () => {
                    const reopenKey = `vec-${layer.id}-${Date.now()}`;
                    const mapEl = map.getTargetElement() as any;
                    if (!mapEl.__popupReopenCbs) mapEl.__popupReopenCbs = {};
                    mapEl.__popupReopenCbs[reopenKey] = () => { card.style.display = 'block'; arrow.style.display = 'block'; overlay.setPosition(lastCoord); map.getTargetElement().dispatchEvent(new CustomEvent('geojson-popup-open', { detail: layer.id })); };
                    map.getTargetElement().dispatchEvent(new CustomEvent('map-expand-feature', { detail: { label: layer.label, color: layer.color, entries, reopenKey } satisfies ExpandedFeatureData }));
                    overlay.setPosition(undefined); card.style.display = 'none'; arrow.style.display = 'none'; selectedFeatureRef.current = null; vectorLayerRef.current?.changed();
                });
                card.style.display = 'block'; arrow.style.display = 'block'; arrow.style.borderTopColor = layer.color;
                map.getTargetElement().dispatchEvent(new CustomEvent('geojson-popup-open', { detail: layer.id }));
                selectedFeatureRef.current = feature; vectorLayerRef.current?.changed();
                if (feature.getGeometry()) overlay.setPosition(evt.coordinate);
            } else { selectedFeatureRef.current = null; vectorLayerRef.current?.changed(); }
        };
        const handlePointerMove = (evt: any) => {
            if (!vectorLayerRef.current) return;
            const hit = map.hasFeatureAtPixel(evt.pixel, { layerFilter: (l) => l === vectorLayerRef.current });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        };
        map.on('singleclick', handleClick);
        map.on('pointermove', handlePointerMove);
        return () => { map.un('singleclick', handleClick); map.un('pointermove', handlePointerMove); };
    }, [map, layer.id, layer.color, layer.label, layer.fields]);

    useEffect(() => {
        if (vectorLayerRef.current) vectorLayerRef.current.setVisible(visible);
        if (!visible && popupOverlayRef.current) {
            popupOverlayRef.current.setPosition(undefined);
            const wrapper = popupOverlayRef.current.getElement() as HTMLDivElement | null;
            if (wrapper) {
                const card = wrapper.querySelector(`#popup-card-${layer.id}`) as HTMLDivElement | null;
                const arrow = wrapper.children[1] as HTMLDivElement | null;
                if (card) card.style.display = 'none'; if (arrow) arrow.style.display = 'none';
            }
        }
    }, [visible, layer.id]);
    return null;
};

// ─── Tile Layer ───────────────────────────────────────────────────────────────
const TileLayerComp = ({ layer, visible, map }: { layer: LayerConfig; visible: boolean; map: OLMap | null }) => {
    const tileLayerRef = useRef<TileLayer<XYZ> | null>(null);
    const { ratioRef: swipeRatioRef, activeRef: compareActiveRef } = useContext(SwipeContext);
    useEffect(() => {
        if (!map || !layer.tileUrl) return;
        const tileLayer = new TileLayer({ source: new XYZ({ url: layer.tileUrl, minZoom: layer.minZoom ?? 16, maxZoom: layer.maxZoom ?? 21 }), opacity: layer.opacity ?? 0.85, visible });
        tileLayerRef.current = tileLayer;
        tileLayer.on('prerender', (event: any) => {
            if (!compareActiveRef.current) return;
            const ctx = event.context as CanvasRenderingContext2D; const mapSize = map.getSize()!; const swipeXPx = mapSize[0] * swipeRatioRef.current;
            const tl = getRenderPixel(event, [0, 0]); const tr = getRenderPixel(event, [swipeXPx, 0]); const br = getRenderPixel(event, [swipeXPx, mapSize[1]]); const bl = getRenderPixel(event, [0, mapSize[1]]);
            ctx.save(); ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tr[0], tr[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.clip();
        });
        tileLayer.on('postrender', (event: any) => { if (!compareActiveRef.current) return; (event.context as CanvasRenderingContext2D).restore(); });
        map.addLayer(tileLayer);
        return () => { if (tileLayerRef.current && map) map.removeLayer(tileLayerRef.current); };
    }, [layer.tileUrl, layer.opacity, layer.minZoom, layer.maxZoom, map]);
    useEffect(() => { if (tileLayerRef.current) tileLayerRef.current.setVisible(visible); }, [visible]);
    return null;
};

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
    const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), alpha];
}

const ArcGISLayer = ({ layer, visible, map }: { layer: LayerConfig; visible: boolean; map: OLMap | null }) => {
    const tileLayerRef = useRef<TileLayer<TileArcGISRest> | null>(null);
    useEffect(() => {
        if (!map || !layer.arcgisUrl || layer.arcgisLayerId == null) return;
        const dynamicLayers = JSON.stringify([{ id: 0, source: { type: 'mapLayer', mapLayerId: layer.arcgisLayerId }, showLabels: false, drawingInfo: { renderer: { type: 'simple', symbol: { type: 'esriSFS', style: 'esriSFSSolid', color: hexToRgba(layer.color, 80), outline: { type: 'esriSLS', style: 'esriSLSSolid', color: hexToRgba(layer.color, 230), width: 1.5 } } }, labelingInfo: [] } }]);
        const tileLayer = new TileLayer({ source: new TileArcGISRest({ url: layer.arcgisUrl, params: { dynamicLayers } }), opacity: layer.opacity ?? 1, visible, zIndex: 8 });
        tileLayerRef.current = tileLayer; map.addLayer(tileLayer);
        return () => { map.removeLayer(tileLayer); tileLayer.dispose(); };
    }, [map, layer.arcgisUrl, layer.arcgisLayerId, layer.color, layer.opacity]);
    useEffect(() => { tileLayerRef.current?.setVisible(visible); }, [visible]);
    return null;
};

const GeoTIFFLayer = ({ layer, visible, map, onLoadingChange }: { layer: LayerConfig; visible: boolean; map: OLMap | null; onLoadingChange?: (msg: string | null) => void }) => {
    const rasterLayerRef = useRef<WebGLTileLayer | null>(null);
    useEffect(() => {
        if (!map || (!layer.url && !layer.file)) return;
        let cancelled = false;
        const src = (layer.file ? `${import.meta.env.BASE_URL}Produtos/${encodeURIComponent(layer.file)}` : null) ?? layer.url!;
        onLoadingChange?.('⏳ Carregando raster…');
        const source = new GeoTIFFSource({ sources: [{ url: src }], convertToRGB: true });
        const rasterLayer = new WebGLTileLayer({ source, opacity: layer.opacity ?? 0.85, visible });
        rasterLayer.once('postrender', () => { if (!cancelled) onLoadingChange?.(null); });
        source.on('tileloaderror', () => { if (!cancelled) onLoadingChange?.('❌ Erro ao carregar raster'); });
        rasterLayerRef.current = rasterLayer; map.addLayer(rasterLayer);
        return () => { cancelled = true; if (rasterLayerRef.current && map) { map.removeLayer(rasterLayerRef.current); rasterLayerRef.current.dispose(); rasterLayerRef.current = null; } onLoadingChange?.(null); };
    }, [layer.url, layer.file, layer.opacity, layer.id, map, onLoadingChange]);
    useEffect(() => { if (rasterLayerRef.current) rasterLayerRef.current.setVisible(visible); }, [visible]);
    return null;
};

// ─── Scale bar ────────────────────────────────────────────────────────────────
const ScaleControlComponent = ({ map, isMobile, footerHidden, hidden }: { map: OLMap | null; isMobile?: boolean; footerHidden?: boolean; hidden?: boolean }) => {
    const [scaleInfo, setScaleInfo] = useState<{ px: number; label: string } | null>(null);
    useEffect(() => {
        if (!map) return;
        const BAR_PX = 100;
        const update = () => {
            const view = map.getView(); const res = view.getResolution(); if (!res) return;
            const meters = res * BAR_PX;
            const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
            const step = [...STEPS].reverse().find(s => s <= meters) ?? STEPS[0];
            setScaleInfo({ px: BAR_PX, label: step >= 1000 ? `${step / 1000} km` : `${step} m` });
        };
        map.getView().on('change:resolution', update); map.getView().on('change:center', update); update();
        return () => { map.getView().un('change:resolution', update); map.getView().un('change:center', update); };
    }, [map]);
    if (!scaleInfo) return null;
    const mobileStyle: React.CSSProperties = isMobile ? { position: 'fixed', bottom: footerHidden ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : 'calc(130px + env(safe-area-inset-bottom, 0px))', left: '10px' } : { position: 'absolute', bottom: '28px', left: '10px' };
    return (
        <div style={{ ...mobileStyle, zIndex: 1000, pointerEvents: 'none', opacity: hidden ? 0 : 1, transition: 'opacity 0.2s ease', visibility: hidden ? 'hidden' : 'visible', fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif", fontSize: '11px', fontWeight: 500, color: '#1c1c1e' }}>
            <div style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '8px', padding: '4px 8px 5px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span>{scaleInfo.label}</span>
                <div style={{ width: '100px', height: '4px', borderRadius: '2px', background: '#1c1c1e' }} />
            </div>
        </div>
    );
};

// ─── Coordenadas do cursor ────────────────────────────────────────────────────
const _sf = "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif";
const _mono = "'SF Mono','Fira Mono',monospace";

const CoordsListener = ({ map, onMove, onOut }: { map: OLMap | null; onMove: (lat: number, lng: number) => void; onOut: () => void }) => {
    useEffect(() => {
        if (!map) return;
        const handleMove = (event: any) => { const coords = map.getCoordinateFromPixel(event.pixel); if (coords) { const [lon, lat] = transform(coords, DEFAULT_PROJECTION, GEOGRAPHIC_PROJECTION); onMove(lat, lon); } };
        map.on('pointermove', handleMove); (map as any).on('pointerleave', onOut);
        return () => { map.un('pointermove', handleMove); (map as any).un('pointerleave', onOut); };
    }, [map, onMove, onOut]);
    return null;
};

const CoordsPanel = ({ coords, collapsed, onToggle, hidden }: { coords: { lat: number; lng: number } | null; collapsed: boolean; onToggle: () => void; hidden?: boolean }) => {
    const utm = coords ? proj4('EPSG:4326', 'EPSG:31982', [coords.lng, coords.lat]) : null;
    const easting = utm ? `E ${utm[0].toFixed(1)}m` : '—';
    const northing = utm ? `N ${utm[1].toFixed(1)}m` : '—';
    const latStr = coords ? `${coords.lat >= 0 ? 'N' : 'S'} ${Math.abs(coords.lat).toFixed(6)}°` : '—';
    const lngStr = coords ? `${coords.lng >= 0 ? 'L' : 'O'} ${Math.abs(coords.lng).toFixed(6)}°` : '—';
    return (
        <div style={{ position: 'absolute', bottom: '36px', right: '0', zIndex: 1000, display: hidden ? 'none' : 'flex', alignItems: 'stretch', transform: collapsed ? 'translateX(calc(100% - 26px))' : 'translateX(0)', transition: 'transform 0.25s ease', pointerEvents: 'auto' }}>
            <button onClick={onToggle} style={{ width: '26px', flexShrink: 0, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(0,0,0,0.08)', borderRight: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '-2px 0 8px rgba(0,0,0,0.06)' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">{collapsed ? <polyline points="7,2 3,5 7,8" stroke="#8e8e93" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : <polyline points="3,2 7,5 3,8" stroke="#8e8e93" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}</svg>
            </button>
            <div style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(0,0,0,0.08)', padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.08)', width: '260px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#8e8e93', fontFamily: _sf, textTransform: 'uppercase', marginBottom: '8px' }}>Posição do cursor</div>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 106px 106px', rowGap: '5px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#8e8e93', fontFamily: _sf }}>UTM</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1c1c1e', fontFamily: _mono, letterSpacing: '0.02em' }}>{easting}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1c1c1e', fontFamily: _mono, letterSpacing: '0.02em', paddingLeft: '6px' }}>{northing}</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#8e8e93', fontFamily: _sf }}>Geo</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1c1c1e', fontFamily: _mono, letterSpacing: '0.02em' }}>{latStr}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1c1c1e', fontFamily: _mono, letterSpacing: '0.02em', paddingLeft: '6px' }}>{lngStr}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Swipe Compare ────────────────────────────────────────────────────────────
const SwipeCompare = ({ map, active, panelOpen = false, layers, layerVisibility, onExpandedChange, downloadVisible, attrVisible, reportsVisible, onToggleLayer, panelWidth, onPanelWidthChange }: {
    map: OLMap | null; active: boolean; panelOpen?: boolean;
    layers?: LayerConfig[]; layerVisibility?: Record<string, boolean>;
    onExpandedChange?: (open: boolean) => void;
    downloadVisible?: boolean; attrVisible?: boolean; reportsVisible?: boolean;
    onToggleLayer?: (id: string) => void;
    panelWidth: number; onPanelWidthChange: (w: number) => void;
}) => {
    const swipeXRef = useRef(0.5);
    const [swipeX, setSwipeXState] = useState(0.5);
    const containerRef = useRef<HTMLDivElement>(null);
    const swipeCtx = useContext(SwipeContext);
    const [expandedFeature, setExpandedFeature] = useState<ExpandedFeatureData | null>(null);
    const [expandedTab, setExpandedTab] = useState<'detalhes' | 'legenda' | 'camadas' | 'relatorios' | 'atributos'>('detalhes');
    const MIN_PANEL_WIDTH = 280;
    const panelResizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWRef = useRef(panelWidth);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const [tabScroll, setTabScroll] = useState({ left: false, right: false });

    const checkTabScroll = useCallback(() => {
        const el = tabBarRef.current; if (!el) return;
        setTabScroll({ left: el.scrollLeft > 0, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1 });
    }, []);
    useEffect(() => { if (!expandedFeature) return; const t = setTimeout(checkTabScroll, 0); return () => clearTimeout(t); }, [expandedFeature, downloadVisible, reportsVisible, attrVisible, checkTabScroll]);
    useEffect(() => { onExpandedChange?.(expandedFeature !== null); }, [expandedFeature, onExpandedChange]);
    useEffect(() => {
        if (!map) return;
        const mapEl = map.getTargetElement();
        const handler = (e: Event) => { setExpandedFeature((e as CustomEvent<ExpandedFeatureData>).detail); setExpandedTab('detalhes'); };
        mapEl.addEventListener('map-expand-feature', handler);
        return () => mapEl.removeEventListener('map-expand-feature', handler);
    }, [map]);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); panelResizingRef.current = true; startXRef.current = e.clientX; startWRef.current = panelWidth;
        const onMove = (ev: MouseEvent) => { if (!panelResizingRef.current) return; const maxW = Math.floor(window.innerWidth * 2 / 5); const delta = startXRef.current - ev.clientX; onPanelWidthChange(Math.min(maxW, Math.max(MIN_PANEL_WIDTH, startWRef.current + delta))); };
        const onUp = () => { panelResizingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    }, [panelWidth, onPanelWidthChange]);

    const updateSwipe = useCallback((ratio: number) => { swipeXRef.current = ratio; swipeCtx.ratioRef.current = ratio; setSwipeXState(ratio); map?.render(); }, [map, swipeCtx]);
    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const startClientX = e.clientX; const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1; const startRatio = swipeXRef.current;
        const onMove = (me: PointerEvent) => { const delta = (me.clientX - startClientX) / containerWidth; updateSwipe(Math.max(0.05, Math.min(0.95, startRatio + delta))); };
        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); e.preventDefault();
    }, [updateSwipe]);

    if (!active && !expandedFeature) return null;

    const pct = `${swipeX * 100}%`;
    const visibleLayers = layers?.filter(l => layerVisibility?.[l.id] !== false && !l.downloadOnly && !l.compareOnly) ?? [];
    const downloadableLayers = layers ?? [];

    type ExpTab = 'detalhes' | 'legenda' | 'camadas' | 'relatorios' | 'atributos';
    const tabDefs: { id: ExpTab; label: string }[] = [
        { id: 'detalhes', label: 'Detalhes' },
        { id: 'legenda', label: 'Legenda' },
        ...(downloadVisible ? [{ id: 'camadas' as ExpTab, label: 'Camadas' }] : []),
        ...(reportsVisible ? [{ id: 'relatorios' as ExpTab, label: 'Relatórios' }] : []),
        ...(attrVisible ? [{ id: 'atributos' as ExpTab, label: 'Atributos' }] : []),
    ];

    return (
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            {active && <>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct, transform: 'translateX(-50%)', width: '2px', background: 'rgba(255,255,255,0.92)', boxShadow: '0 0 8px rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 10, left: pct, transform: 'translateX(calc(-100% - 10px))', background: 'rgba(0,0,0,0.62)', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, fontFamily: '-apple-system,sans-serif', letterSpacing: '0.04em', whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>Camadas do projeto</div>
                <div style={{ position: 'absolute', top: 10, left: pct, transform: 'translateX(10px)', background: 'rgba(0,0,0,0.62)', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, fontFamily: '-apple-system,sans-serif', letterSpacing: '0.04em', whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.22)' }}>Mapa base</div>
                <div onPointerDown={onPointerDown} style={{ position: 'absolute', top: '50%', left: pct, transform: 'translate(-50%, -50%)', width: '44px', height: '44px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 14px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.14)', cursor: 'ew-resize', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', touchAction: 'none' }}>
                    <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                        <path d="M5 6H1M1 6L3.5 3.5M1 6L3.5 8.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M17 6H21M21 6L18.5 3.5M21 6L18.5 8.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="11" y1="1" x2="11" y2="11" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
                {visibleLayers.length > 0 && (
                    <div style={{ position: 'absolute', top: panelOpen ? 335 : 76, right: 12, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.13)', pointerEvents: 'auto', minWidth: '140px', userSelect: 'none', transition: 'top 0.2s' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.09em', color: '#8e8e93', textTransform: 'uppercase', fontFamily: '-apple-system,sans-serif', marginBottom: '6px' }}>Camadas visíveis</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {visibleLayers.map(l => {
                                const on = layerVisibility?.[l.id] !== false;
                                return (
                                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: on ? 1 : 0.42, transition: 'opacity 0.15s' }} onClick={() => onToggleLayer?.(l.id)}>
                                        {l.geometryType === 'line' ? <div style={{ width: '18px', height: '3px', borderRadius: '2px', background: l.color, flexShrink: 0 }} /> : <div style={{ width: '18px', height: '14px', borderRadius: '3px', background: l.color + '55', border: `1.5px solid ${l.color}`, flexShrink: 0 }} />}
                                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#1c1c1e', fontFamily: '-apple-system,sans-serif', flex: 1 }}>{l.label}</span>
                                        <button onClick={e => { e.stopPropagation(); onToggleLayer?.(l.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', color: on ? '#3b82f6' : '#c7c7cc', fontSize: '11px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <FontAwesomeIcon icon={on ? faEye : faEyeSlash} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </>}
            {expandedFeature && (() => {
                const { label: elabel, color: lc, entries: detailEntries, reopenKey } = expandedFeature;
                return (
                    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: panelWidth, zIndex: 400, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderLeft: '1px solid rgba(0,0,0,0.10)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', pointerEvents: 'auto' }}>
                        <div onMouseDown={onResizeMouseDown} style={{ position: 'absolute', left: -3, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 3, height: 32, borderRadius: 99, background: 'rgba(0,0,0,0.15)' }} /></div>
                        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: lc, flexShrink: 0 }} /><span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif", letterSpacing: '-.01em' }}>{elabel}</span></div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {reopenKey && <button onClick={() => { const cb = (map?.getTargetElement() as any)?.__popupReopenCbs?.[reopenKey]; if (cb) cb(); setExpandedFeature(null); }} title="Voltar ao popup" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap' }}><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7 2H2v7h7V4" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 2l2-2 2 2" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>Popup</button>}
                                <button onClick={() => setExpandedFeature(null)} title="Fechar" style={{ background: 'rgba(120,120,128,0.16)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#636366', flexShrink: 0 }}>✕</button>
                            </div>
                        </div>
                        <div style={{ position: 'relative', borderBottom: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
                            {tabScroll.left && <><button onClick={() => { tabBarRef.current?.scrollBy({ left: -100, behavior: 'smooth' }); }} style={{ flexShrink: 0, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: '#8e8e93', fontSize: 16, lineHeight: 1, zIndex: 2 }}>‹</button><div style={{ position: 'absolute', left: 26, top: 0, bottom: 1, width: 36, background: 'linear-gradient(to right, rgba(255,255,255,0.97) 20%, transparent)', pointerEvents: 'none', zIndex: 1 }} /></>}
                            <div ref={tabBarRef} style={{ flex: 1, display: 'flex', overflowX: 'hidden' }} onScroll={checkTabScroll}>
                                {tabDefs.map(tab => <button key={tab.id} onClick={() => setExpandedTab(tab.id)} style={{ flexShrink: 0, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: expandedTab === tab.id ? '#3b82f6' : '#8e8e93', background: 'none', border: 'none', borderBottom: expandedTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif" }}>{tab.label}</button>)}
                            </div>
                            {tabScroll.right && <><div style={{ position: 'absolute', right: 26, top: 0, bottom: 1, width: 36, background: 'linear-gradient(to left, rgba(255,255,255,0.97) 20%, transparent)', pointerEvents: 'none', zIndex: 1 }} /><button onClick={() => { tabBarRef.current?.scrollBy({ left: 100, behavior: 'smooth' }); }} style={{ flexShrink: 0, width: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: '#8e8e93', fontSize: 16, lineHeight: 1, zIndex: 2 }}>›</button></>}
                        </div>
                        <div style={expandedTab === 'atributos' ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                            {expandedTab === 'detalhes' && <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{detailEntries.map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>{k}</span><span style={{ fontSize: 12, fontWeight: 500, color: '#1c1c1e', textAlign: 'right', wordBreak: 'break-word' }}>{formatVal(v)}{getUnit(k)}</span></div>)}</div>}
                            {expandedTab === 'legenda' && <LegendContent layers={visibleLayers} allLayers={(layers ?? []).filter(l => !l.downloadOnly && !l.compareOnly)} layerVisibility={layerVisibility} onToggleLayer={onToggleLayer} onSetLayersVisible={(ids, _vis) => ids.forEach(id => onToggleLayer?.(id))} compareActive={active} />}
                            {expandedTab === 'camadas' && <DownloadContent layers={downloadableLayers} layerVisibility={layerVisibility} onToggleLayer={onToggleLayer} />}
                            {expandedTab === 'relatorios' && <ReportsContent />}
                            {expandedTab === 'atributos' && <AttrContent layers={downloadableLayers} stretch />}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

// ─── Componente principal Map ─────────────────────────────────────────────────
interface MapProps {
    baseLayer: string; layers: LayerConfig[]; layerVisibility: Record<string, boolean>;
    legendVisible?: boolean; downloadVisible?: boolean; attrVisible?: boolean; reportsVisible?: boolean;
    onToggleLayer?: (id: string) => void; onSetLayersVisible?: (ids: string[], visible: boolean) => void;
    sidebarOpen?: boolean; footerHidden?: boolean; compareMode?: boolean; onExpandedPanelWidth?: (w: number) => void;
}

const Map = ({ baseLayer, layers, layerVisibility, legendVisible = true, downloadVisible = false, attrVisible = false, reportsVisible = false, onToggleLayer, onSetLayersVisible, sidebarOpen = false, footerHidden = true, compareMode = false, onExpandedPanelWidth }: MapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const olMapRef = useRef<OLMap | null>(null);
    const [olMap, setOlMap] = useState<OLMap | null>(null);
    const swipeRatioRef = useRef(0.5);
    const swipeActiveRef = useRef(compareMode);
    swipeActiveRef.current = compareMode;
    const swipeCtxValue = useMemo(() => ({ ratioRef: swipeRatioRef, activeRef: swipeActiveRef }), []);
    const [rasterLoading, setRasterLoading] = useState<string | null>(null);
    const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [coordsCollapsed, setCoordsCollapsed] = useState(false);
    const [swipeExpanded, setSwipeExpanded] = useState(false);
    const [panelWidth, setPanelWidth] = useState(380);
    useEffect(() => { onExpandedPanelWidth?.(swipeExpanded ? Math.max(0, panelWidth - 380) : 0); }, [swipeExpanded, panelWidth, onExpandedPanelWidth]);
    const { isMobile } = useBreakpoint();
    const attribution = BASE_LAYER_CONFIGS[baseLayer]?.attribution ?? '';
    const isError = rasterLoading?.startsWith('❌');
    const handleCoordsMove = useCallback((lat: number, lng: number) => setCursorCoords({ lat, lng }), []);
    const handleCoordsOut = useCallback(() => setCursorCoords(null), []);
    useEffect(() => { if (sidebarOpen) setCoordsCollapsed(true); }, [sidebarOpen]);

    useEffect(() => {
        if (!mapRef.current) return;
        const olMap = new OLMap({
            target: mapRef.current, layers: [],
            view: new View({ center: fromLonLat([MAP_CENTER[0], MAP_CENTER[1]]), zoom: MAP_ZOOM, maxZoom: 23, minZoom: 1, projection: DEFAULT_PROJECTION }),
            controls: defaultControls({ zoom: false, attribution: false, rotate: false }),
        });
        olMapRef.current = olMap; setOlMap(olMap);
        return () => { if (olMapRef.current) { olMapRef.current.setTarget(undefined); olMapRef.current.dispose(); olMapRef.current = null; setOlMap(null); } };
    }, []);

    return (
        <SwipeContext.Provider value={swipeCtxValue}>
            <div className={`relative h-full w-full${isMobile && !footerHidden ? ' has-footer' : ''}`}>
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} className="z-0" />
                <BaseLayerController baseLayer={baseLayer} map={olMap} />
                <ScaleControlComponent map={olMap} isMobile={isMobile} footerHidden={footerHidden} hidden={sidebarOpen} />
                <DrawingToolbar map={olMap} hidden={sidebarOpen} />
                {!isMobile && <CoordsListener map={olMap} onMove={handleCoordsMove} onOut={handleCoordsOut} />}
                {layers.filter(l => !l.downloadOnly && (!l.compareOnly || !compareMode)).map(layer => (
                    layer.type === 'tiles' ? <TileLayerComp key={layer.id} layer={layer} visible={layerVisibility[layer.id] ?? true} map={olMap} />
                        : layer.type === 'raster' ? <GeoTIFFLayer key={layer.id} layer={layer} visible={layerVisibility[layer.id] ?? true} map={olMap} onLoadingChange={setRasterLoading} />
                            : layer.type === 'arcgis' ? <ArcGISLayer key={layer.id} layer={layer} visible={layerVisibility[layer.id] ?? true} map={olMap} />
                                : <GeoJSONLayer key={layer.id} layer={layer} visible={layerVisibility[layer.id] ?? true} map={olMap} />
                ))}
                <SwipeCompare map={olMap} active={compareMode} panelOpen={!isMobile && (legendVisible || downloadVisible || attrVisible || reportsVisible)} layers={layers} layerVisibility={layerVisibility} onExpandedChange={setSwipeExpanded} downloadVisible={downloadVisible} attrVisible={attrVisible} reportsVisible={reportsVisible} onToggleLayer={onToggleLayer} panelWidth={panelWidth} onPanelWidthChange={setPanelWidth} />
                {!isMobile && <CoordsPanel coords={cursorCoords} collapsed={coordsCollapsed} onToggle={() => setCoordsCollapsed(c => !c)} hidden={sidebarOpen || swipeExpanded} />}
                {rasterLoading && <div onClick={isError ? () => setRasterLoading(null) : undefined} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, pointerEvents: isError ? 'auto' : 'none', cursor: isError ? 'pointer' : 'default', background: isError ? 'rgba(180,0,0,0.82)' : 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)', color: '#fff', borderRadius: '14px', padding: '14px 24px', fontSize: '13px', fontFamily: 'system-ui, sans-serif', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', maxWidth: '320px', textAlign: 'center', lineHeight: '1.5' }}>{rasterLoading}{isError && <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>Clique para fechar</div>}</div>}
                {isMobile
                    ? <MapPanelSheet layers={layers} layerVisibility={layerVisibility} onToggleLayer={onToggleLayer} onSetLayersVisible={onSetLayersVisible} legendVisible={!!legendVisible} downloadVisible={!!downloadVisible} attrVisible={!!attrVisible} reportsVisible={!!reportsVisible} compareActive={compareMode} />
                    : !swipeExpanded && (legendVisible || downloadVisible || attrVisible || reportsVisible) && <MapPanel layers={layers} layerVisibility={layerVisibility} onToggleLayer={onToggleLayer} onSetLayersVisible={onSetLayersVisible} legendVisible={!!legendVisible} downloadVisible={!!downloadVisible} attrVisible={!!attrVisible} reportsVisible={!!reportsVisible} compareActive={compareMode} />
                }
                <div style={{ position: 'absolute', bottom: 0, right: swipeExpanded ? panelWidth : 0, zIndex: 1000, transition: 'right 0.25s ease', display: sidebarOpen ? 'none' : undefined, background: isMobile ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)', fontSize: isMobile ? '9px' : '11px', color: isMobile ? '#aaa' : '#444', padding: isMobile ? '1px 4px' : '2px 6px', borderTopLeftRadius: '4px', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: attribution }} />
            </div>
        </SwipeContext.Provider>
    );
};

export default Map;

const SwipeContext = createContext<{ ratioRef: React.MutableRefObject<number>; activeRef: React.MutableRefObject<boolean> }>({ ratioRef: { current: 0.5 }, activeRef: { current: false } });

const DEFAULT_PROJECTION = 'EPSG:3857';
const GEOGRAPHIC_PROJECTION = 'EPSG:4326';
const UTM_PROJECTION = 'EPSG:31982';
