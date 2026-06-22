import { useState, useRef, useEffect, useMemo } from 'react';
import { FontAwesomeIcon, faXmark, faDownload, faMagnifyingGlass, faTableColumns } from '../utils/Icons';
import type { LayerConfig } from '../types/layers';
import GEODATA from '../data/geodata';

interface AttributeTableProps {
    layers: LayerConfig[];
    height: number;
    onHeightChange: (h: number) => void;
    onClose: () => void;
    onResizeStart?: () => void;
    onResizeEnd?: () => void;
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;

type Row = Record<string, unknown>;

export default function AttributeTable({ layers, height, onHeightChange, onClose, onResizeStart, onResizeEnd }: AttributeTableProps) {
    const geojsonLayers = layers.filter(l => l.file && (l.type === 'geojson' || !l.type));
    const [activeTab, setActiveTab] = useState(geojsonLayers[0]?.id ?? '');
    const [search, setSearch] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [hiddenColsMap, setHiddenColsMap] = useState<Record<string, Set<string>>>({});
    const [showColPicker, setShowColPicker] = useState(false);
    const colPickerRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const startY = useRef(0);
    const startH = useRef(0);

    const activeLayer = geojsonLayers.find(l => l.id === activeTab);

    // Load rows from GEODATA
    const rows = useMemo<Row[]>(() => {
        const data = (GEODATA as Record<string, any>)[activeTab];
        if (!data) return [];
        const features: any[] = data.features ?? [];
        return features.map(f => f.properties ?? {});
    }, [activeTab]);

    const columns = useMemo(() => {
        if (rows.length === 0) return [];
        return Array.from(new Set(rows.flatMap(r => Object.keys(r)))) as string[];
    }, [rows]);

    // Init hidden cols from defaultHidden when tab changes
    useEffect(() => {
        setHiddenColsMap(prev => {
            if (prev[activeTab]) return prev;
            const defaultHidden = new Set((activeLayer?.fields ?? []).filter(f => f.defaultHidden).map(f => f.key));
            return { ...prev, [activeTab]: defaultHidden };
        });
        setSearch('');
        setSortCol(null);
        setSortAsc(true);
        setShowColPicker(false);
    }, [activeTab, activeLayer]);

    const hiddenCols = hiddenColsMap[activeTab] ?? new Set<string>();
    const visibleColumns = useMemo(() => columns.filter(c => !hiddenCols.has(c)), [columns, hiddenCols]);

    const getLabel = (key: string) => activeLayer?.fields?.find(f => f.key === key)?.label ?? key;

    const filtered = useMemo(() => {
        let r = rows;
        if (search.trim()) {
            const q = search.toLowerCase();
            r = r.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
        }
        if (sortCol) {
            r = [...r].sort((a, b) => {
                const av = String(a[sortCol] ?? '');
                const bv = String(b[sortCol] ?? '');
                return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
            });
        }
        return r;
    }, [rows, search, sortCol, sortAsc]);

    const downloadCSV = () => {
        const header = visibleColumns.map(c => JSON.stringify(getLabel(c))).join(',');
        const body = filtered.map(r => visibleColumns.map(c => JSON.stringify(String(r[c] ?? ''))).join(',')).join('\n');
        const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${activeTab}.csv`;
        a.click();
    };

    const toggleCol = (col: string) => {
        setHiddenColsMap(prev => {
            const cur = new Set(prev[activeTab] ?? []);
            if (cur.has(col)) cur.delete(col); else cur.add(col);
            return { ...prev, [activeTab]: cur };
        });
    };

    useEffect(() => {
        if (!showColPicker) return;
        const handler = (e: MouseEvent) => { if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColPicker]);

    const handleSort = (col: string) => { if (sortCol === col) setSortAsc(v => !v); else { setSortCol(col); setSortAsc(true); } };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const delta = startY.current - e.clientY;
            onHeightChange(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH.current + delta)));
        };
        const onUp = () => { if (dragging.current) onResizeEnd?.(); dragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [onHeightChange, onResizeEnd]);

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        dragging.current = true; startY.current = e.clientY; startH.current = height;
        onResizeStart?.(); e.preventDefault();
    };

    const sf = "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif";

    return (
        <div style={{ height, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', fontFamily: sf, overflow: 'hidden', flexShrink: 0 }}>
            {/* Drag handle */}
            <div style={{ height: 8, cursor: 'row-resize', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }} onMouseDown={handleResizeMouseDown}>
                <div style={{ width: 32, height: 3, background: 'rgba(0,0,0,0.12)', borderRadius: 2 }} />
            </div>

            {/* Layer tabs */}
            {geojsonLayers.length > 1 && (
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)', overflowX: 'auto', flexShrink: 0 }}>
                    {geojsonLayers.map(l => (
                        <button key={l.id} onClick={() => setActiveTab(l.id)} style={{ flexShrink: 0, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: activeTab === l.id ? '#3b82f6' : '#8e8e93', background: 'none', border: 'none', borderBottom: activeTab === l.id ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: sf }}>
                            {l.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, flexWrap: 'wrap' }}>
                {geojsonLayers.length === 1 && <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{activeLayer?.label}</span>}
                <span style={{ fontSize: 12, color: '#888' }}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
                <div style={{ flex: 1 }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 8, color: '#999', fontSize: 12 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" style={{ paddingLeft: 26, paddingRight: 8, height: 28, borderRadius: 8, border: '1px solid rgba(0,0,0,0.10)', fontSize: 12, fontFamily: sf, background: 'rgba(0,0,0,0.03)', outline: 'none', width: 160 }} />
                </div>
                <button onClick={downloadCSV} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FontAwesomeIcon icon={faDownload} /> CSV
                </button>
                <div style={{ position: 'relative' }} ref={colPickerRef}>
                    <button onClick={() => setShowColPicker(v => !v)} title="Mostrar/ocultar colunas" style={{ background: showColPicker ? 'rgba(0,0,0,0.06)' : 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FontAwesomeIcon icon={faTableColumns} />
                        {hiddenCols.size > 0 && <span style={{ background: '#3B82F6', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{hiddenCols.size}</span>}
                    </button>
                    {showColPicker && (
                        <div style={{ position: 'absolute', bottom: '110%', right: 0, background: 'white', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '8px 0', zIndex: 200, minWidth: 180, maxHeight: 280, overflowY: 'auto' }}>
                            {columns.map(col => (
                                <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px', cursor: 'pointer', fontSize: 12, color: '#333' }}>
                                    <input type="checkbox" checked={!hiddenCols.has(col)} onChange={() => toggleCol(col)} />
                                    {getLabel(col)}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 15 }}><FontAwesomeIcon icon={faXmark} /></button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {rows.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>Nenhum dado disponível.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: sf }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.03)', position: 'sticky', top: 0 }}>
                                {visibleColumns.map(col => (
                                    <th key={col} onClick={() => handleSort(col)} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#444', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(0,0,0,0.06)', userSelect: 'none' }}>
                                        {getLabel(col)}{sortCol === col && <span style={{ marginLeft: 4 }}>{sortAsc ? '↑' : '↓'}</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                                    {visibleColumns.map(col => (
                                        <td key={col} style={{ padding: '5px 12px', color: '#333', borderBottom: '1px solid rgba(0,0,0,0.03)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {String(row[col] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {filtered.length === 0 && rows.length > 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>Nenhum registro encontrado.</div>
                )}
            </div>
        </div>
    );
}