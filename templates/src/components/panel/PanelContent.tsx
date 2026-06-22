/**
 * panel/PanelContent.tsx
 *
 * Shared logic and UI for the map panel (legend, download, attribute table, reports).
 * Used by both the desktop glass card (MapPanel) and the mobile bottom sheet (MapPanelSheet).
 */
import { useState, useRef, useEffect } from 'react';
import type { LayerConfig } from '../../types/layers';
import { sf } from '../../styles/tokens';
import { FontAwesomeIcon, faFilePdf, faDownload, faEye, faEyeSlash, faEllipsisVertical } from '../../utils/Icons';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Tab = 'legend' | 'download' | 'attr' | 'reports';

export const tabLabels: Record<Tab, string> = {
    legend: 'Legenda',
    download: 'Camadas',
    attr: 'Atributos',
    reports: 'Relatórios e Pranchas',
};

export interface PanelVisibility {
    legendVisible: boolean;
    downloadVisible: boolean;
    attrVisible?: boolean;
    reportsVisible?: boolean;
}

// ── Tab state hook ─────────────────────────────────────────────────────────────

export const usePanelTabs = ({
    legendVisible, downloadVisible, attrVisible, reportsVisible,
}: PanelVisibility) => {
    const activePanels: Tab[] = [
        ...(legendVisible ? (['legend'] as Tab[]) : []),
        ...(downloadVisible ? (['download'] as Tab[]) : []),
        ...(attrVisible ? (['attr'] as Tab[]) : []),
        ...(reportsVisible ? (['reports'] as Tab[]) : []),
    ];
    const [activeTab, setActiveTab] = useState<Tab>('legend');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (activePanels.length > 0 && !activePanels.includes(activeTab))
            setActiveTab(activePanels[0]);
    }, [legendVisible, downloadVisible, attrVisible, reportsVisible]);

    const effectiveTab: Tab =
        activePanels.length === 1 ? activePanels[0] : activeTab;

    return { activePanels, effectiveTab, setActiveTab, showTabs: activePanels.length > 1 };
};

// ── Download helper ───────────────────────────────────────────────────────────

export const downloadLayer = (layer: LayerConfig) => {
    const href = layer.file
        ? `${import.meta.env.BASE_URL}Produtos/${layer.file}`
        : (layer.url ?? '');
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = layer.file || layer.label;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// ── Tab bar ───────────────────────────────────────────────────────────────────

export const TabBar = ({ activePanels, effectiveTab, onTabChange, fluid }: {
    activePanels: Tab[];
    effectiveTab: Tab;
    onTabChange: (tab: Tab) => void;
    fluid?: boolean;
}) => (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {activePanels.map(tab => (
            <button
                key={tab} onClick={() => onTabChange(tab)} style={{
                    flex: 1,
                    padding: fluid ? '16px 12px' : '8px 12px',
                    fontSize: fluid ? '14px' : '11px',
                    minHeight: fluid ? '52px' : undefined,
                    fontWeight: effectiveTab === tab ? 600 : 400,
                    color: effectiveTab === tab ? '#1c1c1e' : '#8e8e93',
                    background: 'none', border: 'none',
                    borderBottom: effectiveTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer',
                    fontFamily: sf, transition: 'color 0.15s', whiteSpace: 'nowrap',
                }}>
                {tabLabels[tab]}
            </button>
        ))}
    </div>
);

// ── Legend content ────────────────────────────────────────────────────────────

export const LegendContent = ({ layers, allLayers, layerVisibility, onToggleLayer, onSetLayersVisible, compareActive }: {
    layers: LayerConfig[];
    allLayers?: LayerConfig[];
    layerVisibility?: Record<string, boolean>;
    onToggleLayer?: (id: string) => void;
    onSetLayersVisible?: (ids: string[], visible: boolean) => void;
    compareActive?: boolean;
}) => {
    const toggleable = (allLayers ?? layers).filter(l => l.id !== 'ortofoto' && l.id !== 'mds' && !l.compareOnly && !l.downloadOnly);
    const allOn = toggleable.length > 0 && toggleable.every(l => layerVisibility ? layerVisibility[l.id] !== false : true);

    const handleToggleAll = () => {
        if (toggleable.length === 0) return;
        if (onSetLayersVisible) {
            onSetLayersVisible(toggleable.map(l => l.id), !allOn);
        } else if (onToggleLayer) {
            toggleable.forEach(l => {
                const visible = layerVisibility ? layerVisibility[l.id] !== false : true;
                if (allOn ? visible : !visible) onToggleLayer(l.id);
            });
        }
    };

    const points = layers.filter(l => l.geometryType === 'point');
    const others = layers.filter(l => l.geometryType !== 'point' && l.type !== 'tiles' && l.type !== 'raster');
    const rasters = layers.filter(l => l.type === 'tiles' || l.type === 'raster');

    const renderLayer = (layer: LayerConfig) => {
        const on = layerVisibility ? layerVisibility[layer.id] !== false : true;
        return (
            <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: on ? 1 : 0.38, transition: 'opacity 0.15s' }}>
                <div style={{ width: '18px', height: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {layer.id === 'ortofoto' ? (
                        <svg width="18" height="14" viewBox="0 0 18 14" style={{ borderRadius: '3px', overflow: 'hidden', display: 'block' }}>
                            <rect width="18" height="14" fill="#6aaa5a" />
                            <rect x="1" y="1" width="5" height="4" fill="#b0a898" />
                            <rect x="8" y="1" width="5" height="3" fill="#c4bdb2" />
                            <rect x="1" y="7" width="6" height="6" fill="#d4c9a8" />
                            <rect x="7" y="0" width="2" height="14" fill="#888070" opacity="0.7" />
                            <rect x="0" y="6" width="18" height="2" fill="#888070" opacity="0.7" />
                            <rect x="11" y="8" width="4" height="4" fill="#d97040" />
                        </svg>
                    ) : layer.id === 'mds' ? (
                        <svg width="18" height="14" viewBox="0 0 18 14" style={{ borderRadius: '3px', overflow: 'hidden', display: 'block' }}>
                            <defs>
                                <linearGradient id="mds-grad" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor="#1a1a2e" />
                                    <stop offset="30%" stopColor="#4a5568" />
                                    <stop offset="60%" stopColor="#a0aec0" />
                                    <stop offset="100%" stopColor="#f7fafc" />
                                </linearGradient>
                            </defs>
                            <rect width="18" height="14" fill="url(#mds-grad)" />
                            <polyline points="0,12 3,8 6,10 9,5 12,7 15,3 18,4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
                        </svg>
                    ) : layer.geometryType === 'point' ? (
                        <svg width="14" height="14" viewBox="0 0 14 14">
                            <circle cx="7" cy="7" r="5.5" fill={layer.color + '55'} stroke={layer.color} strokeWidth="1.5" />
                            <circle cx="7" cy="7" r="2" fill={layer.color} />
                        </svg>
                    ) : layer.geometryType === 'line'
                        ? <div style={{ width: '18px', height: '3px', borderRadius: '2px', background: layer.color }} />
                        : <div style={{ width: '18px', height: '14px', borderRadius: '3px', background: layer.color + '55', border: `1.5px solid ${layer.color}` }} />
                    }
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#1c1c1e', fontFamily: sf }}>{layer.label}</span>
            </div>
        );
    };

    return (
        <div style={{ padding: '10px 0' }}>
            <div style={{ padding: '0 14px', marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#8e8e93', textTransform: 'uppercase', fontFamily: sf }}>Legenda</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 14px' }}>
                {[...points, ...others].map(renderLayer)}
                {rasters.length > 0 && (
                    <>
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', margin: '2px 0' }} />
                        {rasters.map(renderLayer)}
                    </>
                )}
            </div>
            {compareActive && (onToggleLayer || onSetLayersVisible) && toggleable.length > 0 && (
                <div style={{ padding: '8px 14px 0' }}>
                    <button onClick={handleToggleAll} style={{ width: '100%', fontSize: '10px', fontWeight: 600, color: allOn ? '#ef4444' : '#3b82f6', background: allOn ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${allOn ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}`, borderRadius: '7px', padding: '5px 0', cursor: 'pointer', fontFamily: sf }}>
                        {allOn ? 'Desativar todas' : 'Ativar todas'}
                    </button>
                </div>
            )}
        </div>
    );
};

// ── Download content ──────────────────────────────────────────────────────────

const downloadFile = (file: string) => {
    const href = file.startsWith('http') ? file : `${import.meta.env.BASE_URL}Produtos/${encodeURIComponent(file)}`;
    const a = document.createElement('a');
    a.href = href;
    a.download = file.split('/').pop() || file;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

export const DownloadContent = ({ layers, layerVisibility, onToggleLayer, fluid }: {
    layers: LayerConfig[];
    layerVisibility?: Record<string, boolean>;
    onToggleLayer?: (id: string) => void;
    fluid?: boolean;
}) => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const openLayer = openMenu ? layers.find(l => l.id === openMenu) ?? null : null;
    const openFormats: { label: string; file: string }[] = openLayer
        ? [
            ...(openLayer.file ? [{ label: 'GeoJSON', file: openLayer.file }] : []),
            ...(openLayer.extraDownloads ?? []),
        ]
        : [];

    const titleStyle: React.CSSProperties = {
        fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
        color: '#8e8e93', textTransform: 'uppercase',
        marginBottom: '8px',
        fontFamily: sf, padding: '0 14px',
    };

    const toggleableLayers = layers.filter(l => l.type !== 'tiles' && l.type !== 'raster');
    const allOn = toggleableLayers.every(l => layerVisibility ? layerVisibility[l.id] !== false : true);
    const handleToggleAll = () => {
        if (!onToggleLayer || toggleableLayers.length === 0) return;
        toggleableLayers.forEach(l => {
            const visible = layerVisibility ? layerVisibility[l.id] !== false : true;
            if (allOn ? visible : !visible) onToggleLayer(l.id);
        });
    };

    return (
        <div style={{ padding: '10px 0', display: 'flex', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#8e8e93', textTransform: 'uppercase', fontFamily: sf }}>Camadas</div>
                    {onToggleLayer && toggleableLayers.length > 0 && (
                        <button onClick={handleToggleAll} style={{ fontSize: '9px', fontWeight: 600, color: allOn ? '#ef4444' : '#3b82f6', background: allOn ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${allOn ? 'rgba(239,68,68,0.25)' : 'rgba(59,130,246,0.25)'}`, borderRadius: '5px', padding: '2px 7px', cursor: 'pointer', fontFamily: sf, whiteSpace: 'nowrap' }}>
                            {allOn ? 'Desativar todas' : 'Ativar todas'}
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: fluid ? '6px' : '0', padding: fluid ? '0 10px' : '0' }}>
                    {layers.map(layer => {
                        const visible = layerVisibility ? layerVisibility[layer.id] !== false : true;
                        const menuOpen = openMenu === layer.id;
                        const formats: { label: string; file: string }[] = [
                            ...(layer.file ? [{ label: 'GeoJSON', file: layer.file }] : []),
                            ...(layer.extraDownloads ?? []),
                        ];
                        return (
                            <div key={layer.id} style={{
                                display: 'flex', alignItems: 'center', gap: fluid ? '14px' : '8px',
                                width: '100%', padding: fluid ? '10px 12px 10px 18px' : '4px 10px 4px 14px',
                                background: menuOpen ? 'rgba(59,130,246,0.08)' : (fluid ? 'rgba(0,0,0,0.03)' : 'none'),
                                border: fluid ? '1px solid ' + (menuOpen ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.07)') : 'none',
                                borderRadius: fluid ? '14px' : '0',
                                minHeight: fluid ? '56px' : undefined,
                                boxSizing: 'border-box',
                                transition: 'background 0.12s',
                            }}
                                onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = menuOpen ? 'rgba(59,130,246,0.08)' : (fluid ? 'rgba(0,0,0,0.03)' : 'none'); }}
                            >
                                <span style={{ fontSize: fluid ? '16px' : '12px', fontWeight: 600, color: '#1c1c1e', flex: 1, fontFamily: sf }}>{layer.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minWidth: fluid ? '52px' : '40px', justifyContent: 'flex-end' }}>
                                    {onToggleLayer && (
                                        <button onClick={() => onToggleLayer(layer.id)} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            padding: fluid ? '5px' : '3px', color: visible ? '#3b82f6' : '#c7c7cc',
                                            fontSize: fluid ? '14px' : '11px', display: 'flex', alignItems: 'center',
                                        }} title={visible ? 'Ocultar camada' : 'Mostrar camada'}>
                                            <FontAwesomeIcon icon={visible ? faEye : faEyeSlash} />
                                        </button>
                                    )}
                                    {formats.length > 0 ? (
                                        <button
                                            onClick={() => setOpenMenu(menuOpen ? null : layer.id)}
                                            style={{
                                                background: menuOpen ? 'rgba(59,130,246,0.15)' : 'none',
                                                border: 'none', cursor: 'pointer',
                                                padding: fluid ? '5px 6px' : '3px 4px',
                                                color: menuOpen ? '#3b82f6' : '#8e8e93',
                                                fontSize: fluid ? '14px' : '11px',
                                                display: 'flex', alignItems: 'center',
                                                borderRadius: '6px',
                                            }}
                                            title="Opcoes de download"
                                        >
                                            <FontAwesomeIcon icon={faEllipsisVertical} />
                                        </button>
                                    ) : (
                                        <span style={{ display: 'inline-block', width: fluid ? '26px' : '20px' }} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {openMenu && openFormats.length > 0 && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    borderLeft: '1px solid rgba(0,0,0,0.09)',
                    background: 'rgba(248,248,250,0.9)',
                    minWidth: fluid ? '130px' : '100px',
                    flexShrink: 0,
                }}>
                    <div style={{ ...titleStyle, padding: fluid ? '0 14px' : '0 10px' }}>Baixar</div>
                    {openFormats.map(f => (
                        <button
                            key={f.file}
                            onClick={() => { downloadFile(f.file); setOpenMenu(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '7px',
                                width: '100%', padding: fluid ? '9px 14px' : '6px 10px',
                                background: 'none', border: 'none',
                                cursor: 'pointer', textAlign: 'left', fontFamily: sf,
                                fontSize: fluid ? '13px' : '11px', color: '#1c1c1e',
                                boxSizing: 'border-box',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            <FontAwesomeIcon icon={faDownload} style={{ color: '#8e8e93', fontSize: fluid ? '11px' : '9px', flexShrink: 0 }} />
                            {f.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Reports content ───────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL;

const REPORT_GROUPS = [
    {
        heading: 'Relatorios',
        folder: 'Relatorios',
        items: [
            { label: 'Relatorio de Processamento Final', file: 'RELATORIO PROCESSAMENTO FINAL.pdf' },
            { label: 'Relatorio PEC-PCD Planialtimetrico', file: 'RELATORIO-PEC-PCD_FINAL_PLANIALTIMETRICO_REV1.pdf' },
        ],
    },
    {
        heading: 'Pranchas',
        folder: 'Pranchas',
        items: [
            { label: 'Prancha 1', file: 'prancha_1.pdf' },
            { label: 'Prancha 2', file: 'prancha_2.pdf' },
            { label: 'Prancha 3', file: 'prancha_3.pdf' },
        ],
    },
];

export const ReportsContent = ({ fluid }: { fluid?: boolean }) => (
    <div style={{ padding: '6px 0 10px' }}>
        {REPORT_GROUPS.map((group, gi) => (
            <div key={group.heading}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#8e8e93', textTransform: 'uppercase', marginBottom: '6px', marginTop: gi > 0 ? '14px' : '4px', fontFamily: sf, padding: '0 14px' }}>
                    {group.heading}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: fluid ? '6px' : '0', padding: fluid ? '0 10px' : '0' }}>
                    {group.items.map(r => {
                        const url = `${BASE}Produtos/${group.folder}/${encodeURIComponent(r.file)}`;
                        return (
                            <div key={r.file} style={{
                                display: 'flex', alignItems: 'center', gap: fluid ? '14px' : '8px',
                                padding: fluid ? '12px 18px' : '6px 14px',
                                background: fluid ? 'rgba(0,0,0,0.03)' : 'none',
                                border: fluid ? '1px solid rgba(0,0,0,0.07)' : 'none',
                                borderRadius: fluid ? '14px' : '0',
                                minHeight: fluid ? '52px' : undefined,
                            }}>
                                <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: fluid ? '17px' : '13px', color: '#ef4444', flexShrink: 0 }} />
                                <span style={{ fontSize: fluid ? '14px' : '12px', fontWeight: 600, color: '#1c1c1e', flex: 1, fontFamily: sf }}>{r.label}</span>
                                <button onClick={() => window.open(url, '_blank')} title="Ver" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#3b82f6', lineHeight: 1 }}>
                                    <FontAwesomeIcon icon={faEye} style={{ fontSize: fluid ? '15px' : '12px' }} />
                                </button>
                                <button onClick={() => { const a = document.createElement('a'); a.href = url; a.download = r.file; document.body.appendChild(a); a.click(); document.body.removeChild(a); }} title="Baixar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#8e8e93', lineHeight: 1 }}>
                                    <FontAwesomeIcon icon={faDownload} style={{ fontSize: fluid ? '15px' : '12px' }} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
    </div>
);

// ── Attribute table content ───────────────────────────────────────────────────

export const AttrContent = ({ layers, fluid = false, stretch = false }: {
    layers: LayerConfig[];
    fluid?: boolean;
    stretch?: boolean;
}) => {
    const geojsonLayers = layers.filter(l => l.file && (l.type === 'geojson' || !l.type));
    const [activeTab, setActiveTab] = useState(geojsonLayers[0]?.id ?? '');
    const [features, setFeatures] = useState<Record<string, any[]>>({});
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const loadedRef = useRef<Set<string>>(new Set());

    const loadLayer = async (id: string) => {
        const layer = layers.find(l => l.id === id);
        if (!layer?.file || loadedRef.current.has(id)) return;
        loadedRef.current.add(id);
        setLoadingIds(prev => new Set(prev).add(id));
        try {
            const res = await fetch(`${import.meta.env.BASE_URL}Produtos/${layer.file}`);
            const json = await res.json();
            setFeatures(prev => ({ ...prev, [id]: json.features ?? [] }));
        } catch {
            setFeatures(prev => ({ ...prev, [id]: [] }));
            loadedRef.current.delete(id);
        } finally {
            setLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (activeTab) loadLayer(activeTab); }, [activeTab]);

    const activeFeatures = features[activeTab];
    const rows = activeFeatures?.map((f: any) => f.properties ?? {}) ?? [];
    const cols = rows.length ? Object.keys(rows[0]) : [];
    const isLoading = loadingIds.has(activeTab);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            width: fluid ? '100%' : '480px',
            ...(stretch ? { flex: 1, overflow: 'hidden' } : { maxHeight: fluid ? '50vh' : '360px', overflow: 'hidden' }),
        }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#8e8e93', textTransform: 'uppercase', fontFamily: sf, padding: '10px 14px 0', flexShrink: 0 }}>
                Atributos
            </div>
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} className="scrollbar-thin">
                {geojsonLayers.map(layer => (
                    <button key={layer.id} onClick={() => setActiveTab(layer.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: fluid ? '13px 14px' : '6px 12px',
                        fontSize: fluid ? '13px' : '11px',
                        minHeight: fluid ? '46px' : undefined,
                        fontWeight: activeTab === layer.id ? 600 : 400,
                        color: activeTab === layer.id ? '#1c1c1e' : '#8e8e93',
                        background: 'none', border: 'none',
                        borderBottom: activeTab === layer.id ? '2px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: sf,
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: layer.color, flexShrink: 0, display: 'inline-block' }} />
                        {layer.label}
                    </button>
                ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }} className="scrollbar-thin">
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', fontSize: '12px', color: '#8e8e93', fontFamily: sf }}>Carregando...</div>
                ) : !activeFeatures ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', fontSize: '12px', color: '#8e8e93', fontFamily: sf }}>Selecione uma aba</div>
                ) : activeFeatures.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', fontSize: '12px', color: '#8e8e93', fontFamily: sf }}>Sem feicoes</div>
                ) : (
                    <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: sf }}>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', top: 0, background: 'rgba(248,248,248,0.95)', padding: '5px 10px', textAlign: 'left', fontWeight: 600, color: '#8e8e93', borderBottom: '1px solid rgba(0,0,0,0.06)', width: '32px', backdropFilter: 'blur(4px)' }}>#</th>
                                {cols.map(col => (
                                    <th key={col} style={{ position: 'sticky', top: 0, background: 'rgba(248,248,248,0.95)', padding: '5px 10px', textAlign: 'left', fontWeight: 600, color: '#8e8e93', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                    <td style={{ padding: '4px 10px', color: '#8e8e93', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>{i + 1}</td>
                                    {cols.map(col => (
                                        <td key={col} style={{ padding: '4px 10px', color: '#1c1c1e', borderBottom: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {row[col] == null ? '' : String(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {rows.length > 0 && (
                <div style={{ padding: '4px 12px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '10px', color: '#8e8e93', fontFamily: sf, flexShrink: 0 }}>
                    {rows.length} feicoes
                </div>
            )}
        </div>
    );
};
