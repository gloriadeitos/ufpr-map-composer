import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import GEODATA from '../data/geodata';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, transform } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { ScaleLine, Attribution } from 'ol/control';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLocationCrosshairs, faExpand, faCompass, faPencil,
    faCircle, faMinus, faDrawPolygon, faTrash, faDownload,
    faRuler,
} from '@fortawesome/free-solid-svg-icons';

import { MAP_CENTER, MAP_ZOOM, BASEMAPS } from '../config';
import type { LayerConfig } from '../types/layers';
import AttributeTable from './AttributeTable';
import AttributeTableSimple from './AttributeTableSimple';

proj4.defs(
    'EPSG:31982',
    '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);
register(proj4);

function basemapUrl(id: string): string {
    const found = BASEMAPS.find((b) => b.id === id);
    return found?.url ?? BASEMAPS[0]?.url ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}

function getLayerStyle(color: string, geomType?: string): Style {
    if (geomType === 'point') {
        return new Style({
            image: new CircleStyle({
                radius: 6,
                fill: new Fill({ color }),
                stroke: new Stroke({ color: '#fff', width: 1.5 }),
            }),
        });
    }
    if (geomType === 'line') {
        return new Style({ stroke: new Stroke({ color, width: 2.5 }) });
    }
    // polygon (default)
    return new Style({
        fill: new Fill({ color: color + '33' }),
        stroke: new Stroke({ color, width: 1.5 }),
    });
}

interface MapProps {
    baseLayer: string;
    layers: LayerConfig[];
    layerVisibility: Record<string, boolean>;
    legendVisible?: boolean;
    downloadVisible?: boolean;
    attrVisible?: boolean;
    sidebarOpen?: boolean;
    footerHidden?: boolean;
}

type DrawMode = 'point' | 'line' | 'polygon' | null;

export default function Map({
    baseLayer,
    layers,
    layerVisibility,
    attrVisible,
    sidebarOpen: _sidebarOpen,
    footerHidden: _footerHidden,
}: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<OLMap | null>(null);
    const baseTileRef = useRef<TileLayer<XYZ> | null>(null);
    const vectorLayerRefs = useRef<Record<string, VectorLayer<VectorSource>>>({});
    const drawInteractionRef = useRef<import('ol/interaction/Draw').default | null>(null);
    const drawLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

    const [coords, setCoords] = useState<{ utm: string; geo: string } | null>(null);
    const [drawMode, setDrawMode] = useState<DrawMode>(null);
    const [selectedFeature, setSelectedFeature] = useState<Feature<Geometry> | null>(null);
    const [attrLayerId, setAttrLayerId] = useState<string | null>(null);
    const [measureResult, setMeasureResult] = useState<string | null>(null);

    // ── Map initialization ────────────────────────────────────
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const baseTile = new TileLayer({
            source: new XYZ({ url: basemapUrl(baseLayer) }),
        });
        baseTileRef.current = baseTile;

        const drawSource = new VectorSource();
        const drawLayer = new VectorLayer({ source: drawSource, zIndex: 999 });
        drawLayerRef.current = drawLayer;

        const map = new OLMap({
            target: mapRef.current,
            layers: [baseTile, drawLayer],
            view: new View({
                center: fromLonLat(MAP_CENTER),
                zoom: MAP_ZOOM,
                maxZoom: 22,
            }),
            controls: [
                new ScaleLine({ units: 'metric' }),
                new Attribution({ collapsible: false }),
            ],
        });

        mapInstanceRef.current = map;

        // Coordinate display
        map.on('pointermove', (evt) => {
            const [lon, lat] = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
            const utm = transform(evt.coordinate, 'EPSG:3857', 'EPSG:31982') as number[];
            setCoords({
                geo: `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`,
                utm: `E ${utm[0].toFixed(1)}  N ${utm[1].toFixed(1)}`,
            });
        });

        // Feature click
        map.on('singleclick', (evt) => {
            let found: Feature<Geometry> | null = null;
            map.forEachFeatureAtPixel(evt.pixel, (f) => {
                found = f as Feature<Geometry>;
                return true;
            });
            setSelectedFeature(found);
        });

        return () => {
            map.setTarget(undefined);
            mapInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Base layer change ─────────────────────────────────────
    useEffect(() => {
        if (!baseTileRef.current) return;
        const url = basemapUrl(baseLayer);
        (baseTileRef.current.getSource() as XYZ).setUrl(url);
    }, [baseLayer]);

    // ── Vector layers ─────────────────────────────────────────
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Remove old layers not in current set
        Object.keys(vectorLayerRefs.current).forEach((id) => {
            if (!layers.find((l) => l.id === id)) {
                map.removeLayer(vectorLayerRefs.current[id]);
                delete vectorLayerRefs.current[id];
            }
        });

        layers.forEach((cfg, idx) => {
            if (!vectorLayerRefs.current[cfg.id]) {
                const features = new GeoJSON().readFeatures(
                    GEODATA[cfg.id] ?? { type: 'FeatureCollection', features: [] },
                    { featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' },
                );
                const source = new VectorSource({ features });
                const lyr = new VectorLayer({
                    source,
                    style: getLayerStyle(cfg.color, cfg.geometryType),
                    zIndex: idx + 1,
                });
                vectorLayerRefs.current[cfg.id] = lyr;
                map.addLayer(lyr);
            }

            const lyr = vectorLayerRefs.current[cfg.id];
            lyr.setVisible(layerVisibility[cfg.id] ?? true);
        });
    }, [layers, layerVisibility]);

    // ── Draw mode ─────────────────────────────────────────────
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (drawInteractionRef.current) {
            map.removeInteraction(drawInteractionRef.current);
            drawInteractionRef.current = null;
        }

        if (!drawMode) return;

        import('ol/interaction/Draw').then(({ default: Draw }) => {
            const geomType =
                drawMode === 'point' ? 'Point'
                    : drawMode === 'line' ? 'LineString'
                        : 'Polygon';

            const draw = new Draw({
                source: drawLayerRef.current!.getSource()!,
                type: geomType,
            });

            draw.on('drawend', (evt) => {
                if (drawMode === 'line' || drawMode === 'polygon') {
                    import('ol/sphere').then(({ getLength, getArea }) => {
                        const geom = (evt.feature as Feature<Geometry>).getGeometry()!;
                        const val =
                            drawMode === 'line'
                                ? `${(getLength(geom as Parameters<typeof getLength>[0]) / 1000).toFixed(3)} km`
                                : `${(getArea(geom as Parameters<typeof getArea>[0]) / 10000).toFixed(4)} ha`;
                        setMeasureResult(val);
                    });
                }
            });

            drawInteractionRef.current = draw;
            map.addInteraction(draw);
        });
    }, [drawMode]);

    const handleHome = () => {
        mapInstanceRef.current?.getView().animate({
            center: fromLonLat(MAP_CENTER),
            zoom: MAP_ZOOM,
            duration: 600,
        });
    };

    const handleFullscreen = () => {
        const el = mapRef.current?.parentElement;
        if (!el) return;
        if (!document.fullscreenElement) el.requestFullscreen?.();
        else document.exitFullscreen?.();
    };

    const handleClearDraw = () => {
        drawLayerRef.current?.getSource()?.clear();
        setMeasureResult(null);
        setDrawMode(null);
    };

    const handleExportPNG = () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.once('rendercomplete', () => {
            const canvas = mapRef.current?.querySelector('canvas');
            if (!canvas) return;
            const a = document.createElement('a');
            a.download = 'mapa.png';
            a.href = canvas.toDataURL();
            a.click();
        });
        map.renderSync();
    };

    // Open attr table for first visible layer when attrVisible toggles on
    useEffect(() => {
        if (attrVisible && layers.length > 0 && !attrLayerId) {
            setAttrLayerId(layers[0].id);
        }
        if (!attrVisible) setAttrLayerId(null);
    }, [attrVisible, layers, attrLayerId]);

    const activeAttrLayer = layers.find((l) => l.id === attrLayerId) ?? null;

    // ── Toolbar style ─────────────────────────────────────────
    const toolbarStyle: React.CSSProperties = {
        position: 'absolute',
        top: 72,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 20,
    };
    const btnStyle = (active = false): React.CSSProperties => ({
        width: 36,
        height: 36,
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.10)',
        background: active ? 'rgba(0,122,255,0.9)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: active ? '#fff' : '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontSize: 14,
    });

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Drawing + navigation toolbar */}
            <div style={toolbarStyle}>
                <button style={btnStyle()} onClick={handleHome} title="Voltar ao centro">
                    <FontAwesomeIcon icon={faLocationCrosshairs} />
                </button>
                <button style={btnStyle()} onClick={handleFullscreen} title="Tela cheia">
                    <FontAwesomeIcon icon={faExpand} />
                </button>

                <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

                <button
                    style={btnStyle(drawMode === 'point')}
                    onClick={() => setDrawMode(drawMode === 'point' ? null : 'point')}
                    title="Marcar ponto"
                >
                    <FontAwesomeIcon icon={faCircle} style={{ fontSize: 10 }} />
                </button>
                <button
                    style={btnStyle(drawMode === 'line')}
                    onClick={() => setDrawMode(drawMode === 'line' ? null : 'line')}
                    title="Desenhar linha / medir distância"
                >
                    <FontAwesomeIcon icon={faMinus} />
                </button>
                <button
                    style={btnStyle(drawMode === 'polygon')}
                    onClick={() => setDrawMode(drawMode === 'polygon' ? null : 'polygon')}
                    title="Desenhar polígono / medir área"
                >
                    <FontAwesomeIcon icon={faDrawPolygon} />
                </button>
                <button style={btnStyle()} onClick={handleClearDraw} title="Limpar desenhos">
                    <FontAwesomeIcon icon={faTrash} />
                </button>

                <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

                <button style={btnStyle()} onClick={handleExportPNG} title="Exportar mapa como PNG">
                    <FontAwesomeIcon icon={faDownload} />
                </button>
            </div>

            {/* Coordinate display */}
            {coords && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 68,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        fontSize: 11,
                        padding: '3px 10px',
                        borderRadius: 8,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        zIndex: 15,
                        fontFamily: "'SF Mono', 'Fira Mono', monospace",
                    }}
                >
                    {coords.utm} &nbsp;|&nbsp; {coords.geo}
                </div>
            )}

            {/* Measure result */}
            {measureResult && (
                <div
                    style={{
                        position: 'absolute',
                        top: 72,
                        left: 12,
                        background: 'rgba(0,122,255,0.9)',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        zIndex: 25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                    }}
                >
                    <FontAwesomeIcon icon={faRuler} />
                    {measureResult}
                    <button
                        onClick={() => setMeasureResult(null)}
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 4 }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Feature popup */}
            {selectedFeature && (
                <div
                    style={{
                        position: 'absolute',
                        top: 72,
                        left: 60,
                        minWidth: 220,
                        maxWidth: 320,
                        background: 'rgba(255,255,255,0.97)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 14,
                        padding: '12px 16px',
                        zIndex: 30,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                        fontSize: 13,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>Atributos</strong>
                        <button
                            onClick={() => setSelectedFeature(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                        >
                            ×
                        </button>
                    </div>
                    {Object.entries(selectedFeature.getProperties() as Record<string, unknown>)
                        .filter(([k]) => k !== 'geometry')
                        .slice(0, 12)
                        .map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                                <span style={{ color: '#666', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
                                <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{String(v)}</span>
                            </div>
                        ))}
                </div>
            )}

            {/* Attribute table (full) */}
            {attrVisible && activeAttrLayer && (
                <AttributeTable
                    layer={activeAttrLayer}
                    allLayers={layers}
                    onLayerChange={setAttrLayerId}
                    onClose={() => setAttrLayerId(null)}
                />
            )}
        </div>
    );
}
