import type { LayerConfig } from './Map';

interface MapLegendProps {
    layers: LayerConfig[];
    layerVisibility: Record<string, boolean>;
}

const MapLegend = ({ layers, layerVisibility }: MapLegendProps) => {
    const visible = layers.filter(l => layerVisibility[l.id] !== false);
    if (visible.length === 0) return null;

    const card: React.CSSProperties = {
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
        minWidth: '140px',
    };

    const title: React.CSSProperties = {
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: '#8e8e93',
        textTransform: 'uppercase',
        marginBottom: '8px',
        fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
    };

    const label: React.CSSProperties = {
        fontSize: '12px',
        fontWeight: 500,
        color: '#1c1c1e',
        fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
    };

    return (
        <div style={card}>
            <div style={title}>Legenda</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {visible.map(layer => (
                    <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {layer.id === 'ortofoto' ? (
                            <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0, borderRadius: '3px', overflow: 'hidden' }}>
                                <rect width="18" height="18" fill="#6aaa5a" />
                                <rect x="2" y="2" width="6" height="5" fill="#b0a898" />
                                <rect x="10" y="3" width="5" height="4" fill="#c4bdb2" />
                                <rect x="2" y="9" width="7" height="7" fill="#d4c9a8" />
                                <rect x="9" y="0" width="2" height="18" fill="#888070" opacity="0.7" />
                                <rect x="0" y="8" width="18" height="2" fill="#888070" opacity="0.7" />
                                <rect x="12" y="10" width="4" height="4" fill="#d97040" />
                            </svg>
                        ) : layer.geometryType === 'point' ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                                <circle cx="7" cy="7" r="5.5" fill={layer.color + '55'} stroke={layer.color} strokeWidth="1.5" />
                                <circle cx="7" cy="7" r="2" fill={layer.color} />
                            </svg>
                        ) : layer.geometryType === 'line' ? (
                            <div style={{
                                width: '18px',
                                height: '3px',
                                borderRadius: '2px',
                                background: (layer as any).strokeColor ?? layer.color,
                                flexShrink: 0,
                            }} />
                        ) : (
                            <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '3px',
                                background: layer.color + '55',
                                border: `2px solid ${layer.color}`,
                                flexShrink: 0,
                            }} />
                        )}
                        <span style={label}>{layer.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MapLegend;
