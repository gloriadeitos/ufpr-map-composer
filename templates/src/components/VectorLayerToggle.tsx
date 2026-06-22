import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon, faDrawPolygon } from '../utils/Icons';

interface VectorLayerToggleProps {
    vectorVisibility: {
        parcelas: boolean;
        edificacoes: boolean;
        vegetacao: boolean;
        hidrografia: boolean;
    };
    onVectorLayerChange: (layer: string, visible: boolean) => void;
}

const VectorLayerToggle = ({
    vectorVisibility = { parcelas: true, edificacoes: false, vegetacao: false, hidrografia: false },
    onVectorLayerChange,
}: VectorLayerToggleProps) => {
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

    const layers = [
        { id: 'parcelas', label: 'Parcelas', color: 'bg-red-500', colorClass: 'text-red-600' },
        { id: 'edificacoes', label: 'Edificações', color: 'bg-blue-500', colorClass: 'text-blue-600' },
        { id: 'vegetacao', label: 'Vegetação', color: 'bg-green-500', colorClass: 'text-green-600' },
        { id: 'hidrografia', label: 'Hidrografia', color: 'bg-cyan-500', colorClass: 'text-cyan-600' },
    ];

    const activeCount = Object.values(vectorVisibility || {}).filter(Boolean).length;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${isOpen
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 border border-gray-200/50'
                    }`}
                title="Dados Vetoriais"
            >
                <FontAwesomeIcon icon={faDrawPolygon} className="text-lg" />
            </button>
            {activeCount > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full pointer-events-none z-10">
                    {activeCount}
                </span>
            )}

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-lg shadow-lg z-40 min-w-max overflow-hidden">
                    {layers.map((layer) => (
                        <label
                            key={layer.id}
                            className="w-full px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                            <input
                                type="checkbox"
                                checked={vectorVisibility[layer.id as keyof typeof vectorVisibility]}
                                onChange={(e) => onVectorLayerChange(layer.id, e.target.checked)}
                                className="w-4 h-4 rounded accent-purple-600"
                            />
                            <div className={`w-3 h-3 rounded-full ${layer.color}`}></div>
                            <span className="text-sm text-gray-700">{layer.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VectorLayerToggle;
