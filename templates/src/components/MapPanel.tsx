import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faDownload, faTable, faXmark } from '@fortawesome/free-solid-svg-icons';
import { glassCard, sf } from '../styles/tokens';
import type { LayerDockItem } from '../types/layers';
import { PanelContent } from './panel/PanelContent';

interface MapPanelProps {
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

export default function MapPanel({
    layers,
    layerVisibility,
    onLayerToggle,
    legendVisible,
    onLegendClose,
    downloadVisible,
    onDownloadClose,
    attrVisible,
    onAttrClose,
}: MapPanelProps) {
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

    if (!activePanel) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 72,
                right: 12,
                width: 280,
                maxHeight: 'calc(100vh - 140px)',
                overflowY: 'auto',
                zIndex: 80,
                ...glassCard,
                borderRadius: 16,
                fontFamily: sf,
            }}
        >
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>
                    {activePanel === 'legend' ? 'Legenda' : activePanel === 'download' ? 'Downloads' : 'Atributos'}
                </span>
                <button
                    onClick={closePanel}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 15 }}
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            <PanelContent
                activeTab={activePanel}
                layers={layers}
                layerVisibility={layerVisibility}
                onLayerToggle={onLayerToggle}
            />
        </div>
    );
}
