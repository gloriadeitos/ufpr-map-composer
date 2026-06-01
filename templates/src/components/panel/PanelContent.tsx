import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { LayerDockItem } from '../../types/layers';

type TabId = 'legend' | 'download' | 'attr';

interface PanelContentProps {
    activeTab: TabId;
    layers: LayerDockItem[];
    layerVisibility: Record<string, boolean>;
    onLayerToggle: (id: string) => void;
}

export function PanelContent({ activeTab, layers, layerVisibility, onLayerToggle }: PanelContentProps) {
    if (activeTab === 'legend') {
        return (
            <div style={{ padding: '12px 16px 16px' }}>
                {layers.map((layer) => {
                    const visible = layerVisibility[layer.id] ?? false;
                    return (
                        <div
                            key={layer.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 0',
                                borderBottom: '1px solid rgba(0,0,0,0.04)',
                                cursor: 'pointer',
                                opacity: visible ? 1 : 0.45,
                            }}
                            onClick={() => onLayerToggle(layer.id)}
                        >
                            {/* Colour swatch */}
                            <div style={{
                                width: 14,
                                height: 14,
                                borderRadius: layer.geometryType === 'point' ? '50%' : 3,
                                background: layer.color,
                                flexShrink: 0,
                                border: layer.geometryType === 'line' ? `3px solid ${layer.color}` : undefined,
                            }} />
                            <FontAwesomeIcon
                                icon={layer.icon}
                                style={{ color: layer.color, fontSize: 13, width: 14 }}
                            />
                            <span style={{ fontSize: 13, color: '#1c1c1e', flex: 1 }}>{layer.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (activeTab === 'download') {
        return (
            <div style={{ padding: '12px 16px 16px' }}>
                {layers.map((layer) => (
                    <a
                        key={layer.id}
                        href={`${import.meta.env.BASE_URL}Produtos/${layer.file}`}
                        download
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 0',
                            borderBottom: '1px solid rgba(0,0,0,0.04)',
                            textDecoration: 'none',
                            color: '#1c1c1e',
                        }}
                    >
                        <FontAwesomeIcon icon={layer.icon} style={{ color: layer.color, fontSize: 14, width: 16 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{layer.label}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>GeoJSON</div>
                        </div>
                    </a>
                ))}
            </div>
        );
    }

    // attr tab — simple list
    return (
        <div style={{ padding: '12px 16px 16px' }}>
            {layers.map((l) => (
                <div key={l.id} style={{ fontSize: 13, padding: '4px 0', color: '#444' }}>
                    {l.label}
                </div>
            ))}
        </div>
    );
}
