/**
 * MapPanel.tsx - Desktop glass card (position: absolute, top-right)
 *
 * Shell only. All shared content (legend, download, attribute table, reports) lives in
 * panel/PanelContent.tsx and is reused by the mobile bottom sheet too.
 */
import type { LayerConfig } from '../types/layers';
import { glassCard } from '../styles/tokens';
import {
    usePanelTabs,
    TabBar,
    LegendContent,
    DownloadContent,
    AttrContent,
    ReportsContent,
} from './panel/PanelContent';

interface MapPanelProps {
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

const MapPanel = ({
    layers,
    layerVisibility,
    onToggleLayer,
    onSetLayersVisible,
    legendVisible,
    downloadVisible,
    attrVisible,
    reportsVisible,
    compareActive,
}: MapPanelProps) => {
    const { activePanels, effectiveTab, setActiveTab, showTabs } = usePanelTabs({
        legendVisible, downloadVisible, attrVisible, reportsVisible,
    });

    if (activePanels.length === 0) return null;

    const visibleLayers = layers.filter(l => !l.downloadOnly && !l.compareOnly && layerVisibility[l.id] !== false);
    const legendLayers = layers.filter(l => !l.downloadOnly && !l.compareOnly);
    const downloadableLayers = layers.filter(l => l.file || l.url);
    const isAttr = effectiveTab === 'attr';

    if (legendVisible && !downloadVisible && !attrVisible && visibleLayers.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            ...glassCard,
            background: isAttr ? 'rgba(255,255,255,0.82)' : glassCard.background,
            borderRadius: '14px',
            overflow: 'hidden',
            minWidth: isAttr ? '0' : '160px',
            pointerEvents: (downloadVisible || attrVisible || reportsVisible || compareActive) ? 'auto' : 'none',
        }}>
            {showTabs && (
                <TabBar
                    activePanels={activePanels}
                    effectiveTab={effectiveTab}
                    onTabChange={setActiveTab}
                />
            )}

            {effectiveTab === 'attr' && <AttrContent layers={layers} />}
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
                />
            )}
            {effectiveTab === 'reports' && <ReportsContent />}
        </div>
    );
};

export default MapPanel;
