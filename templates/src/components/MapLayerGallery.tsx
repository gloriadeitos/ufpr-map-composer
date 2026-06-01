import { useState } from 'react';
import { glassCard, sf } from '../styles/tokens';

const BASE_LAYER_CONFIGS = [
    { id: 'dark', label: 'Dark', color: '#1c1c1e' },
    { id: 'light', label: 'Light', color: '#f5f5f7' },
    { id: 'osm', label: 'OSM', color: '#b5d0d0' },
    { id: 'satellite', label: 'Satélite', color: '#1a3a2a' },
    { id: 'topo', label: 'Topo', color: '#c4b898' },
    { id: 'streets', label: 'Streets', color: '#e8dcc8' },
    { id: 'terrain', label: 'Terreno', color: '#a8c4a0' },
    { id: 'natgeo', label: 'NatGeo', color: '#d4a574' },
];

interface MapLayerGalleryProps {
    currentBaseLayer: string;
    onChange: (id: string) => void;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layers: any[];
    layerVisibility: Record<string, boolean>;
    onLayerToggle: (id: string) => void;
}

export default function MapLayerGallery({
    currentBaseLayer,
    onChange,
    onClose,
    layers,
    layerVisibility,
    onLayerToggle,
}: MapLayerGalleryProps) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 68,
                right: 12,
                width: 300,
                zIndex: 90,
                ...glassCard,
                borderRadius: 16,
                padding: 16,
                fontFamily: sf,
            }}
        >
            {/* Base layers */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Mapa Base
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {BASE_LAYER_CONFIGS.map((b) => (
                    <button
                        key={b.id}
                        onClick={() => onChange(b.id)}
                        style={{
                            borderRadius: 10,
                            border: currentBaseLayer === b.id ? '2px solid #007AFF' : '2px solid transparent',
                            background: b.color,
                            height: 52,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            padding: '0 0 4px',
                            boxShadow: currentBaseLayer === b.id ? '0 0 0 3px rgba(0,122,255,0.2)' : '0 1px 4px rgba(0,0,0,0.1)',
                            overflow: 'hidden',
                            flexDirection: 'column',
                        }}
                    >
                        <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: ['dark', 'satellite'].includes(b.id) ? '#fff' : '#333',
                            textShadow: ['dark', 'satellite'].includes(b.id) ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                            width: '100%',
                            textAlign: 'center',
                            background: 'rgba(0,0,0,0.1)',
                            padding: '2px 0',
                        }}>
                            {b.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Vector layer toggles */}
            {layers.length > 0 && (
                <>
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 10 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                        Camadas
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {layers.map((l) => {
                            const visible = layerVisibility[l.id] ?? false;
                            return (
                                <div
                                    key={l.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                                    onClick={() => onLayerToggle(l.id)}
                                >
                                    <div style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        background: visible ? l.color : '#ccc',
                                        flexShrink: 0,
                                        transition: 'background 0.15s',
                                    }} />
                                    <span style={{ fontSize: 13, color: visible ? '#1c1c1e' : '#999', flex: 1 }}>{l.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
