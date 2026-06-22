import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon, faMap } from '../utils/Icons';

interface MapLayerToggleProps {
    baseLayer: string;
    onBaseLayerChange: (layer: string) => void;
}

const MapLayerToggle = ({ baseLayer, onBaseLayerChange }: MapLayerToggleProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (layer: string) => {
        onBaseLayerChange(layer);
        setIsOpen(false);
    };

    const isDark = baseLayer === 'satellite' || baseLayer === 'dark';

    const darkTextStyle = isDark
        ? { textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }
        : undefined;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isOpen
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isDark
                        ? 'bg-black/20 hover:bg-black/30 text-white border border-white/30'
                        : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 border border-gray-200/50'
                    }`}
                title="Mapa Base"
                style={isOpen ? undefined : darkTextStyle}
            >
                <FontAwesomeIcon icon={faMap} className="text-lg" />
                <span className="text-sm font-medium hidden sm:inline">
                    {baseLayer === 'osm' ? 'Mapa' : 'Satélite'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-lg shadow-lg z-40 min-w-max overflow-hidden">
                    <button
                        onClick={() => handleSelect('osm')}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${baseLayer === 'osm'
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        <span className="text-lg">🗺️</span>
                        <span>OpenStreetMap</span>
                        {baseLayer === 'osm' && <span className="ml-auto text-blue-600">✓</span>}
                    </button>
                    <button
                        onClick={() => handleSelect('satellite')}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-t border-gray-100 ${baseLayer === 'satellite'
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        <span className="text-lg">🛰️</span>
                        <span>Satélite (Esri)</span>
                        {baseLayer === 'satellite' && <span className="ml-auto text-blue-600">✓</span>}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapLayerToggle;
