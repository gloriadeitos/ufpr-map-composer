/**
 * MapPanelSheet.tsx - Mobile bottom sheet (position: fixed, bottom of screen)
 *
 * Shell only. All shared content (legend, download, attribute table, reports) lives in
 * panel/PanelContent.tsx and is reused by the desktop glass card too.
 *
 * Tap the drag handle to open/collapse.
 * Auto-opens when a panel becomes active (e.g. user taps "Legenda" in header).
 */
import { useEffect, useState } from 'react';
import type { LayerConfig } from '../types/layers';
import { glassCard, sf } from '../styles/tokens';
import {
    usePanelTabs,
    TabBar,
    LegendContent,
    DownloadContent,
    AttrContent,
    ReportsContent,
    tabLabels,
} from './panel/PanelContent';

interface MapPanelSheetProps {
    layers: LayerConfig[];
    layerVisibility: Record<string, boolean>;
    onToggleLayer?: (id: string) => void;
    onSetLayersVisible?: (ids: string[], visible: boolean) => void;
    legendVisible: boolean;
    downloadVisible: boolean;
    attrVisible?: boolean;
    reportsVisible?: boolean;
    compareActive?: boolean;
}

const MapPanelSheet = ({
    layers,
    layerVisibility,
    onToggleLayer,
    onSetLayersVisible,
    legendVisible,
    downloadVisible,
    attrVisible,
    reportsVisible,
    compareActive,
}: MapPanelSheetProps) => {
    const { activePanels, effectiveTab, setActiveTab, showTabs } = usePanelTabs({
        legendVisible, downloadVisible, attrVisible, reportsVisible,
    });
    const [open, setOpen] = useState(true);

    // Auto-open when a panel becomes active
    useEffect(() => {
        if (activePanels.length > 0) setOpen(true);
    }, [activePanels.length]);

    if (activePanels.length === 0) return null;

    const legendLayers = layers.filter(l => !l.downloadOnly && !l.compareOnly);
    const downloadableLayers = layers.filter(l => l.file || l.url);

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            ...glassCard,
            borderRadius: '16px 16px 0 0',
            borderBottom: 'none',
            overflow: 'hidden',
            maxHeight: '80vh',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
            {/* Drag handle / toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 16px 8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    gap: '6px',
                    WebkitTapHighlightColor: 'transparent',
                }}
            >
                {/* Visual handle bar */}
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,0.15)' }} />

                {/* When collapsed: show panel names as hint */}
                {!open && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activePanels.map(p => (
                            <span key={p} style={{
                                fontSize: '11px', fontWeight: 600, color: '#8e8e93',
                                fontFamily: sf, textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                {tabLabels[p]}
                            </span>
                        ))}
                    </div>
                )}
            </button>

            {/* Content - only when open; scrollable wrapper caps height within the 80vh sheet */}
            {open && (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 52px)' }} className="scrollbar-thin">
                    {showTabs && (
                        <TabBar
                            activePanels={activePanels}
                            effectiveTab={effectiveTab}
                            onTabChange={setActiveTab}
                            fluid
                        />
                    )}

                    {effectiveTab === 'attr' && <AttrContent layers={layers} fluid />}
                    {effectiveTab === 'legend' && (
                        <LegendContent
                            layers={legendLayers}
                            allLayers={legendLayers}
                            layerVisibility={layerVisibility}
                            onToggleLayer={onToggleLayer}
                            onSetLayersVisible={onSetLayersVisible}
                            compareActive={compareActive}
                        />
                    )}
                    {effectiveTab === 'download' && (
                        <DownloadContent
                            layers={downloadableLayers}
                            layerVisibility={layerVisibility}
                            onToggleLayer={onToggleLayer}
                            fluid
                        />
                    )}
                    {effectiveTab === 'reports' && <ReportsContent fluid />}
                </div>
            )}
        </div>
    );
};

export default MapPanelSheet;
