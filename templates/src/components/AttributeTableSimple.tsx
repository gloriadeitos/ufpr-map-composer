import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { glassCard, sf } from '../styles/tokens';
import type { LayerConfig } from '../types/layers';

interface AttributeTableSimpleProps {
    layer: LayerConfig;
    onClose: () => void;
}

type Row = Record<string, unknown>;

export default function AttributeTableSimple({ layer, onClose }: AttributeTableSimpleProps) {
    const [rows, setRows] = useState<Row[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    useEffect(() => {
        if (!layer.file) return;
        fetch(`${import.meta.env.BASE_URL}Produtos/${layer.file}`)
            .then((r) => r.json())
            .then((geojson) => {
                const features = geojson.features ?? [];
                const keys = Array.from(
                    new Set(features.flatMap((f: { properties?: Row }) => Object.keys(f.properties ?? {})))
                ) as string[];
                setColumns(keys);
                setRows(features.map((f: { properties?: Row }) => f.properties ?? {}));
            })
            .catch(() => { setRows([]); setColumns([]); });
    }, [layer.file]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 64,
                right: 0,
                bottom: 0,
                width: 340,
                maxWidth: '95vw',
                zIndex: 110,
                ...glassCard,
                borderRadius: '16px 0 0 16px',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: sf,
                overflow: 'hidden',
                transform: 'translateX(0)',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{layer.label}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 15 }}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {rows.slice(0, 50).map((row, i) => (
                    <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        {columns.slice(0, 6).map((col) => (
                            <div key={col} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                                <span style={{ color: '#888', minWidth: 80 }}>{col}</span>
                                <span style={{ color: '#1c1c1e', fontWeight: 500, wordBreak: 'break-all' }}>{String(row[col] ?? '')}</span>
                            </div>
                        ))}
                    </div>
                ))}
                {rows.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
                        Sem dados disponíveis.
                    </div>
                )}
            </div>
        </div>
    );
}
