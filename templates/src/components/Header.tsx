import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBars, faXmark, faLayerGroup, faTable,
    faDownload, faShareNodes, faMap, faEye, faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { PROJECT_TITLE, PROJECT_SUBTITLE } from '../config';
import type { LayerDockItem } from '../types/layers';
import MapLayerGallery from './MapLayerGallery';
import ShareMenu from './ShareMenu';
import { glassCard, sf } from '../styles/tokens';

interface HeaderProps {
    sidebarOpen: boolean;
    onSidebarToggle: () => void;
    legendVisible: boolean;
    onLegendToggle: () => void;
    downloadVisible: boolean;
    onDownloadToggle: () => void;
    attrVisible: boolean;
    onAttrToggle: () => void;
    onBaseLayerChange: (id: string) => void;
    currentBaseLayer: string;
    layers: LayerDockItem[];
    layerVisibility: Record<string, boolean>;
    onLayerToggle: (id: string) => void;
    footerHidden: boolean;
    onFooterToggle: () => void;
}

export default function Header({
    sidebarOpen,
    onSidebarToggle,
    legendVisible,
    onLegendToggle,
    downloadVisible,
    onDownloadToggle,
    attrVisible,
    onAttrToggle,
    onBaseLayerChange,
    currentBaseLayer,
    layers,
    layerVisibility,
    onLayerToggle,
    footerHidden,
    onFooterToggle,
}: HeaderProps) {
    const [baseLayerOpen, setBaseLayerOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    const headerStyle: React.CSSProperties = {
        ...glassCard,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 100,
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        fontFamily: sf,
    };

    const iconBtnStyle = (active = false): React.CSSProperties => ({
        width: 36,
        height: 36,
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.08)',
        background: active ? 'rgba(0,122,255,0.12)' : 'transparent',
        color: active ? '#007AFF' : '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 15,
        transition: 'background 0.15s, color 0.15s',
    });

    return (
        <>
            <header style={headerStyle}>
                {/* Hamburger / sidebar toggle */}
                <button style={iconBtnStyle(sidebarOpen)} onClick={onSidebarToggle} title="Sobre o projeto">
                    <FontAwesomeIcon icon={sidebarOpen ? faXmark : faBars} />
                </button>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', letterSpacing: -0.3, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {PROJECT_TITLE}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {PROJECT_SUBTITLE}
                    </div>
                </div>

                {/* Desktop toolbar actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Base layer */}
                    <button
                        style={iconBtnStyle(baseLayerOpen)}
                        onClick={() => setBaseLayerOpen((o) => !o)}
                        title="Camada base"
                    >
                        <FontAwesomeIcon icon={faMap} />
                    </button>

                    {/* Legend */}
                    <button style={iconBtnStyle(legendVisible)} onClick={onLegendToggle} title="Legenda">
                        <FontAwesomeIcon icon={faLayerGroup} />
                    </button>

                    {/* Download */}
                    <button style={iconBtnStyle(downloadVisible)} onClick={onDownloadToggle} title="Downloads">
                        <FontAwesomeIcon icon={faDownload} />
                    </button>

                    {/* Attribute table */}
                    <button style={iconBtnStyle(attrVisible)} onClick={onAttrToggle} title="Tabela de atributos">
                        <FontAwesomeIcon icon={faTable} />
                    </button>

                    {/* Footer toggle */}
                    <button style={iconBtnStyle(!footerHidden)} onClick={onFooterToggle} title="Mostrar/ocultar dock de camadas">
                        <FontAwesomeIcon icon={footerHidden ? faEyeSlash : faEye} />
                    </button>

                    {/* Share */}
                    <button style={iconBtnStyle(shareOpen)} onClick={() => setShareOpen((o) => !o)} title="Compartilhar">
                        <FontAwesomeIcon icon={faShareNodes} />
                    </button>
                </div>
            </header>

            {/* Floating base layer gallery */}
            {baseLayerOpen && (
                <MapLayerGallery
                    currentBaseLayer={currentBaseLayer}
                    onChange={(id) => { onBaseLayerChange(id); setBaseLayerOpen(false); }}
                    onClose={() => setBaseLayerOpen(false)}
                    layers={layers}
                    layerVisibility={layerVisibility}
                    onLayerToggle={onLayerToggle}
                />
            )}

            {/* Share menu */}
            {shareOpen && <ShareMenu onClose={() => setShareOpen(false)} />}
        </>
    );
}
