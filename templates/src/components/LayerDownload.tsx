import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { glassCard, sf } from '../styles/tokens';
import type { LayerDockItem } from '../types/layers';

interface LayerDownloadProps {
    layers: LayerDockItem[];
}

export default function LayerDownload({ layers }: LayerDownloadProps) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(12px)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: sf,
                    color: '#333',
                }}
            >
                <FontAwesomeIcon icon={faDownload} />
                Downloads
                <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, opacity: 0.6 }} />
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: '110%',
                        right: 0,
                        width: 220,
                        ...glassCard,
                        borderRadius: 12,
                        zIndex: 100,
                        padding: '8px 0',
                        fontFamily: sf,
                    }}
                >
                    {layers.map((l) => (
                        <a
                            key={l.id}
                            href={`${import.meta.env.BASE_URL}Produtos/${l.file}`}
                            download
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 14px',
                                textDecoration: 'none',
                                color: '#1c1c1e',
                                fontSize: 13,
                            }}
                            onClick={() => setOpen(false)}
                        >
                            <FontAwesomeIcon icon={l.icon} style={{ color: l.color, width: 16 }} />
                            <span>{l.label}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
