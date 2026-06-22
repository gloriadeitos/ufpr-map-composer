// MapLayerGallery.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon, faMap } from '../utils/Icons';

interface MapLayerGalleryProps {
    baseLayer: string;
    onBaseLayerChange: (layer: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

const MapLayerGallery = ({ baseLayer, onBaseLayerChange, isOpen, onToggle }: MapLayerGalleryProps) => {
    const [dropTop, setDropTop] = useState(0);
    const [isActiveSource, setIsActiveSource] = useState(false);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    if (prevIsOpen !== isOpen) {
        setPrevIsOpen(isOpen);
        if (!isOpen) setIsActiveSource(false);
    }

    const handleToggle = () => {
        if (!isOpen) {
            setIsActiveSource(true);
            setDropTop((() => {
                const header = document.querySelector('header');
                return header ? header.getBoundingClientRect().bottom + 10 : 0;
            })());
        }
        onToggle();
    };

    const maps = [
        { id: 'osm', name: 'OpenStreetMap', description: 'Detalhado', thumbnail: 'https://tile.openstreetmap.org/2/2/1.png' },
        { id: 'satellite', name: 'Satelite (Esri)', description: 'Imagem aerea', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/2/1' },
        { id: 'topo', name: 'Topografico', description: 'Com relevo', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/2/2/1' },
        { id: 'streets', name: 'Ruas (Esri)', description: 'Ruas e limites', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/2/2/1' },
        { id: 'dark', name: 'Dark Map', description: 'Tema escuro', thumbnail: 'https://basemaps.cartocdn.com/dark_all/2/2/1.png' },
        { id: 'light', name: 'Light Map', description: 'Tema claro', thumbnail: 'https://basemaps.cartocdn.com/light_all/2/2/1.png' },
    ];

    return (
        <div className="relative">
            <button
                onClick={handleToggle}
                className={`flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-xl transition-all duration-150 ${isOpen
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                title="Galeria de Mapas"
            >
                <FontAwesomeIcon icon={faMap} className="text-sm" />
            </button>

            {isOpen && isActiveSource && createPortal(
                <div style={{
                    position: 'fixed',
                    top: dropTop,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.08)',
                    maxWidth: 'calc(100vw - 16px)',
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px' }}>
                            {maps.map(map => {
                                const isSelected = baseLayer === map.id;
                                return (
                                    <div key={map.id} onClick={() => onBaseLayerChange(map.id)} style={{ flexShrink: 0, position: 'relative', cursor: 'pointer' }}>
                                        <div style={{
                                            position: 'relative',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            width: '112px',
                                            height: '80px',
                                            transition: 'box-shadow 0.15s, outline 0.15s',
                                            outline: isSelected ? '3px solid #3b82f6' : '1px solid rgba(0,0,0,0.12)',
                                            outlineOffset: isSelected ? '1px' : '0px',
                                            boxShadow: isSelected ? '0 4px 14px rgba(59,130,246,0.35)' : '0 1px 4px rgba(0,0,0,0.08)',
                                        }}
                                            onMouseEnter={e => {
                                                if (!isSelected) {
                                                    (e.currentTarget as HTMLDivElement).style.outline = '2px solid rgba(59,130,246,0.5)';
                                                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.14)';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) {
                                                    (e.currentTarget as HTMLDivElement).style.outline = '1px solid rgba(0,0,0,0.12)';
                                                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
                                                }
                                            }}
                                        >
                                            <img
                                                src={map.thumbnail}
                                                alt={map.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                onError={e => {
                                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                                padding: '4px 6px',
                                                background: isSelected ? 'rgba(59,130,246,0.9)' : 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                                            }}>
                                                <p style={{ fontSize: '10px', fontWeight: 600, color: '#fff', textAlign: 'center', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{map.name}</p>
                                                <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.85)', textAlign: 'center', margin: 0 }}>{map.description}</p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute', top: 0, right: 0,
                                                width: '16px', height: '16px',
                                                background: '#3b82f6', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                                zIndex: 10,
                                            }}>
                                                <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MapLayerGallery;
