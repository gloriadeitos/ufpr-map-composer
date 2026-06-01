import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { glassDock, sf } from '../styles/tokens';
import type { LayerDockItem } from '../types/layers';

interface FooterProps {
    layers: LayerDockItem[];
    layerVisibility: Record<string, boolean>;
    onToggle: (id: string) => void;
    hidden?: boolean;
}

export default function Footer({ layers, layerVisibility, onToggle, hidden }: FooterProps) {
    if (hidden) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 90,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                ...glassDock,
                borderRadius: 24,
                padding: '8px 16px',
                maxWidth: 'calc(100vw - 32px)',
                overflowX: 'auto',
                fontFamily: sf,
            }}
        >
            {layers.map((layer) => {
                const visible = layerVisibility[layer.id] ?? false;
                return (
                    <button
                        key={layer.id}
                        onClick={() => onToggle(layer.id)}
                        title={layer.label}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            border: `2px solid ${visible ? layer.color : 'rgba(0,0,0,0.12)'}`,
                            background: visible ? layer.color + '22' : 'rgba(255,255,255,0.6)',
                            color: visible ? layer.color : '#999',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 16,
                            gap: 2,
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            boxShadow: visible ? `0 0 0 3px ${layer.color}33` : 'none',
                        }}
                    >
                        <FontAwesomeIcon icon={layer.icon} style={{ fontSize: 16 }} />
                    </button>
                );
            })}
        </div>
    );
}
