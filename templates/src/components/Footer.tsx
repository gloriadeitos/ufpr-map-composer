import { useState } from 'react';
import { FontAwesomeIcon } from '../utils/Icons';
import type { LayerDockItem } from '../types/layers';

interface FooterProps {
    layers: LayerDockItem[];
    layerVisibility: Record<string, boolean>;
    onToggleLayer: (id: string) => void;
    baseLayer?: string;
    tableOffset?: number;
    tableResizing?: boolean;
    hidden?: boolean;
    rightOffset?: number;
}

const DARK_BASEMAPS = new Set(['satellite', 'dark']);

const Footer = ({ layers, layerVisibility, onToggleLayer, baseLayer = 'osm', tableOffset = 0, tableResizing = false, hidden = false, rightOffset = 0 }: FooterProps) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [barHovered, setBarHovered] = useState(false);
    const hoveredLayer = layers.find(l => l.id === hoveredId);
    const isDark = DARK_BASEMAPS.has(baseLayer);

    return (
        <footer
            className={`fixed z-30 pointer-events-none transition-all duration-300 ease-in-out ${hidden ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}
            style={{
                bottom: `calc(${tableOffset + 32}px + env(safe-area-inset-bottom, 0px))`,
                left: `calc(50% - ${rightOffset / 2}px)`,
                transform: 'translateX(-50%)',
                transition: tableResizing ? 'none' : 'left 0.25s ease, bottom 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s, transform 0.3s',
                maxWidth: rightOffset > 0 ? `calc(100vw - ${rightOffset + 48}px)` : undefined,
            }}
        >
            <div className="flex flex-col items-center gap-1.5">
                <div
                    className="pointer-events-auto bg-white/20 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl px-5 pt-2 pb-3 flex flex-col items-center gap-0"
                    onMouseEnter={() => setBarHovered(true)}
                    onMouseLeave={() => { setBarHovered(false); setHoveredId(null); }}
                >
                    {/* Label area */}
                    <div className={`overflow-hidden transition-all duration-200 ease-out flex items-center justify-center ${barHovered ? 'max-h-5 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
                        <p
                            className={`text-[11px] font-medium text-center whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-700'}`}
                            style={isDark ? { textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' } : undefined}
                        >
                            {hoveredLayer?.label ?? '\u00A0'}
                        </p>
                    </div>

                    {/* Circles */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 'calc(100vw - 48px)', padding: '4px 2px' }} className="scrollbar-thin">
                        <div className="flex items-end gap-3 sm:gap-5 px-0.5">
                            {layers.map(layer => {
                                const visible = layerVisibility[layer.id] ?? true;
                                const isHovered = hoveredId === layer.id;
                                return (
                                    <div
                                        key={layer.id}
                                        className="flex flex-col items-center"
                                        onMouseEnter={() => setHoveredId(layer.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        <div
                                            onClick={() => onToggleLayer(layer.id)}
                                            className={`rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ease-out ${visible ? 'w-11 h-11' : 'w-9 h-9 sm:w-7 sm:h-7 opacity-40'}`}
                                            style={{
                                                backgroundColor: visible ? layer.color : '#9ca3af',
                                                transform: isHovered && visible ? 'scale(1.1) translateY(-2px)' : undefined,
                                                boxShadow: isHovered && visible
                                                    ? `0 6px 20px ${layer.color}99`
                                                    : visible
                                                        ? `0 3px 12px ${layer.color}77`
                                                        : 'none',
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={layer.icon}
                                                className="text-white drop-shadow"
                                                style={{ fontSize: visible ? '1rem' : '0.75rem' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
