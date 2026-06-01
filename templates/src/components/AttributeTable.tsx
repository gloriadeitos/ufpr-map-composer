import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faXmark, faDownload, faMagnifyingGlass, faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { glassCard, sf } from '../styles/tokens';
import type { LayerConfig } from '../types/layers';

interface AttributeTableProps {
    layer: LayerConfig;
    allLayers: LayerConfig[];
    onLayerChange: (id: string) => void;
    onClose: () => void;
}

type Row = Record<string, unknown>;

export default function AttributeTable({
    layer,
    allLayers,
    onLayerChange,
    onClose,
}: AttributeTableProps) {
    const [rows, setRows] = useState<Row[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [height, setHeight] = useState(280);
    const dragRef = useRef<number | null>(null);

    useEffect(() => {
        if (!layer.file) return;
        fetch(`${import.meta.env.BASE_URL}Produtos/${layer.file}`)
            .then((r) => r.json())
            .then((geojson) => {
                const features = geojson.features ?? [];
                const allKeys = Array.from(
                    new Set(features.flatMap((f: { properties?: Row }) => Object.keys(f.properties ?? {})))
                ) as string[];
                setColumns(allKeys);
                setRows(features.map((f: { properties?: Row }) => f.properties ?? {}));
            })
            .catch(() => { setRows([]); setColumns([]); });
    }, [layer.file]);

    const filtered = useMemo(() => {
        let r = rows;
        if (search.trim()) {
            const q = search.toLowerCase();
            r = r.filter((row) =>
                Object.values(row).some((v) => String(v).toLowerCase().includes(q))
            );
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
        const header = columns.join(',');
        const body = filtered.map((r) =>
            columns.map((c) => JSON.stringify(String(r[c] ?? ''))).join(',')
        ).join('\n');
        const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${layer.id}.csv`;
        a.click();
    };

    const handleSort = (col: string) => {
        if (sortCol === col) setSortAsc((v) => !v);
        else { setSortCol(col); setSortAsc(true); }
    };

    // Drag resize
    const onMouseDown = (e: React.MouseEvent) => {
        dragRef.current = e.clientY;
        const start = height;
        const onMove = (ev: MouseEvent) => {
            const delta = dragRef.current! - ev.clientY;
            setHeight(Math.max(160, Math.min(520, start + delta)));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height,
                zIndex: 120,
                ...glassCard,
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: sf,
                overflow: 'hidden',
            }}
        >
            {/* Drag handle */}
            <div
                style={{ height: 8, cursor: 'row-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onMouseDown={onMouseDown}
            >
                <div style={{ width: 32, height: 3, background: 'rgba(0,0,0,0.12)', borderRadius: 2 }} />
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {/* Layer selector */}
                <select
                    value={layer.id}
                    onChange={(e) => onLayerChange(e.target.value)}
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1c1c1e',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: sf,
                    }}
                >
                    {allLayers.map((l) => (
                        <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                </select>

                <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                    {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                </span>

                <div style={{ flex: 1 }} />

                {/* Search */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 8, color: '#999', fontSize: 12 }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar…"
                        style={{
                            paddingLeft: 26,
                            paddingRight: 8,
                            height: 28,
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.10)',
                            fontSize: 12,
                            fontFamily: sf,
                            background: 'rgba(0,0,0,0.03)',
                            outline: 'none',
                            width: 160,
                        }}
                    />
                </div>

                <button
                    onClick={downloadCSV}
                    style={{ background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <FontAwesomeIcon icon={faDownload} /> CSV
                </button>

                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 15 }}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: sf }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.03)', position: 'sticky', top: 0 }}>
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    onClick={() => handleSort(col)}
                                    style={{
                                        padding: '6px 12px',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        color: '#444',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                                        userSelect: 'none',
                                    }}
                                >
                                    {col}
                                    {sortCol === col && (
                                        <span style={{ marginLeft: 4 }}>{sortAsc ? '↑' : '↓'}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((row, i) => (
                            <tr
                                key={i}
                                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col}
                                        style={{
                                            padding: '5px 12px',
                                            color: '#333',
                                            borderBottom: '1px solid rgba(0,0,0,0.03)',
                                            maxWidth: 220,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {String(row[col] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
                        Nenhum registro encontrado.
                    </div>
                )}
            </div>
        </div>
    );
}
