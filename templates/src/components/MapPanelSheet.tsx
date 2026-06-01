import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { glassCard, sf } from '../styles/tokens';
import type { LayerDockItem } from '../types/layers';
import { PanelContent } from './panel/PanelContent';

interface MapPanelSheetProps {
    layers: LayerDockItem[];
    layerVisibility: Record<string, boolean>;
    onLayerToggle: (id: string) => void;
    legendVisible: boolean;
    onLegendClose: () => void;
    downloadVisible: boolean;
    onDownloadClose: () => void;
    attrVisible: boolean;
    onAttrClose: () => void;
}

export default function MapPanelSheet({
    layers,
    layerVisibility,
    onLayerToggle,
    legendVisible,
    onLegendClose,
    downloadVisible,
    onDownloadClose,
    attrVisible,
    onAttrClose,
}: MapPanelSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);

    const activePanel =
        legendVisible ? 'legend'
            : downloadVisible ? 'download'
                : attrVisible ? 'attr'
                    : null;

    const closePanel = () => {
        if (legendVisible) onLegendClose();
        if (downloadVisible) onDownloadClose();
        if (attrVisible) onAttrClose();
    };

    useEffect(() => {
        if (!activePanel) return;
        const handler = (e: TouchEvent) => {
            if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) closePanel();
        };
        document.addEventListener('touchstart', handler);
        return () => document.removeEventListener('touchstart', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePanel]);

    return (
        <div
            ref={sheetRef}
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '60vh',
                overflowY: 'auto',
                zIndex: 150,
                ...glassCard,
                borderRadius: '20px 20px 0 0',
                transform: activePanel ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: sf,
            }}
        >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)' }} />
            </div>

            {/* Header */}
            {activePanel && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>
                        {activePanel === 'legend' ? 'Legenda' : activePanel === 'download' ? 'Downloads' : 'Atributos'}
                    </span>
                    <button
                        onClick={closePanel}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 16 }}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            )}

            {activePanel && (
                <PanelContent
                    activeTab={activePanel}
                    layers={layers}
                    layerVisibility={layerVisibility}
                    onLayerToggle={onLayerToggle}
                />
            )}
        </div>
    );
}
