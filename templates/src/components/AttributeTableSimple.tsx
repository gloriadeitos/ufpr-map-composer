import { useState, useMemo } from 'react';
import { FontAwesomeIcon, faXmark } from '../utils/Icons';
import GEODATA from '../data/geodata';
import type { LayerConfig } from '../types/layers';

interface AttributeTableSimpleProps {
    layers: LayerConfig[];
    onClose: () => void;
}

type Row = Record<string, unknown>;

export default function AttributeTableSimple({ layers, onClose }: AttributeTableSimpleProps) {
    const geojsonLayers = layers.filter(l => l.file && (l.type === 'geojson' || !l.type));
    const [activeTab, setActiveTab] = useState(geojsonLayers[0]?.id ?? '');

    const activeLayer = geojsonLayers.find(l => l.id === activeTab);

    const rows = useMemo<Row[]>(() => {
        const data = (GEODATA as Record<string, any>)[activeTab];
        if (!data) return [];
        return (data.features ?? []).map((f: any) => f.properties ?? {});
    }, [activeTab]);

    const cols = useMemo(() => {
        if (rows.length === 0) return [];
        return Array.from(new Set(rows.flatMap(r => Object.keys(r)))) as string[];
    }, [rows]);

    const getLabel = (key: string) => activeLayer?.fields?.find((f: { key: string; label: string }) => f.key === key)?.label ?? key;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-40 flex justify-end"
            style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(2px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Panel */}
            <div className="relative flex flex-col bg-white h-full shadow-2xl"
                style={{ width: 'min(620px, 90vw)' }}>

                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0 bg-gray-50">
                    <span className="text-sm font-semibold text-gray-800 flex-1">Tabela de Atributos</span>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-sm" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-gray-200 shrink-0 overflow-x-auto bg-white">
                    {geojsonLayers.map(layer => (
                        <button
                            key={layer.id}
                            onClick={() => setActiveTab(layer.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === layer.id
                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                            {layer.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    {rows.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-sm text-gray-400">Sem feições nesta camada</div>
                    ) : (
                        <table className="min-w-full text-xs border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50">
                                    <th className="px-3 py-1.5 text-left font-semibold text-gray-400 border-b border-gray-200 w-10">#</th>
                                    {cols.map(col => (
                                        <th key={col} className="px-3 py-1.5 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">
                                            {getLabel(col)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                        <td className="px-3 py-1 text-gray-400 border-b border-gray-100">{i + 1}</td>
                                        {cols.map(col => (
                                            <td key={col} className="px-3 py-1 text-gray-700 border-b border-gray-100 whitespace-nowrap"
                                                style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {row[col] == null ? '' : String(row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer count */}
                {rows.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/80 shrink-0">
                        <span className="text-[11px] text-gray-400">{rows.length} feição{rows.length !== 1 ? 'ões' : ''}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
