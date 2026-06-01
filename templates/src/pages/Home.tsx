import { useState } from 'react';
import Map from '../components/Map';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import MapPanel from '../components/MapPanel';
import MapPanelSheet from '../components/MapPanelSheet';
import { useBreakpoint } from '../hooks/useBreakpoint';
import type { LayerDockItem } from '../types/layers';
import { BASEMAPS } from '../config';
import {
  {{ LAYER_ICON_IMPORTS }}
} from '../utils/Icons';

const LAYERS: LayerDockItem[] = [
    {{ LAYERS_ARRAY }}
];

const DEFAULT_VISIBLE = new Set<string>([{{ DEFAULT_VISIBLE_SET }}]);

const DEFAULT_BASEMAP = BASEMAPS.find((b) => b.default)?.id ?? BASEMAPS[0]?.id ?? 'osm';

export default function Home() {
    const { isMobile } = useBreakpoint();

    const [baseLayer, setBaseLayer] = useState<string>(DEFAULT_BASEMAP);
    const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(
        () => Object.fromEntries(LAYERS.map((l) => [l.id, DEFAULT_VISIBLE.has(l.id)]))
    );
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [legendVisible, setLegendVisible] = useState(false);
    const [downloadVisible, setDownloadVisible] = useState(false);
    const [attrVisible, setAttrVisible] = useState(false);
    const [footerHidden, setFooterHidden] = useState(false);

    const toggleLayer = (id: string) =>
        setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

    const visibleLayers = LAYERS.filter((l) => layerVisibility[l.id]);

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
            <Header
                sidebarOpen={sidebarOpen}
                onSidebarToggle={() => setSidebarOpen((o) => !o)}
                legendVisible={legendVisible}
                onLegendToggle={() => setLegendVisible((v) => !v)}
                downloadVisible={downloadVisible}
                onDownloadToggle={() => setDownloadVisible((v) => !v)}
                attrVisible={attrVisible}
                onAttrToggle={() => setAttrVisible((v) => !v)}
                onBaseLayerChange={setBaseLayer}
                currentBaseLayer={baseLayer}
                layers={LAYERS}
                layerVisibility={layerVisibility}
                onLayerToggle={toggleLayer}
                footerHidden={footerHidden}
                onFooterToggle={() => setFooterHidden((v) => !v)}
            />

            <Map
                baseLayer={baseLayer}
                layers={visibleLayers}
                layerVisibility={layerVisibility}
                legendVisible={legendVisible}
                downloadVisible={downloadVisible}
                attrVisible={attrVisible}
                sidebarOpen={sidebarOpen}
                footerHidden={footerHidden}
            />

            {!isMobile && (
                <MapPanel
                    layers={LAYERS}
                    layerVisibility={layerVisibility}
                    onLayerToggle={toggleLayer}
                    legendVisible={legendVisible}
                    onLegendClose={() => setLegendVisible(false)}
                    downloadVisible={downloadVisible}
                    onDownloadClose={() => setDownloadVisible(false)}
                    attrVisible={attrVisible}
                    onAttrClose={() => setAttrVisible(false)}
                />
            )}

            {isMobile && (
                <MapPanelSheet
                    layers={LAYERS}
                    layerVisibility={layerVisibility}
                    onLayerToggle={toggleLayer}
                    legendVisible={legendVisible}
                    onLegendClose={() => setLegendVisible(false)}
                    downloadVisible={downloadVisible}
                    onDownloadClose={() => setDownloadVisible(false)}
                    attrVisible={attrVisible}
                    onAttrClose={() => setAttrVisible(false)}
                />
            )}

            <Footer
                layers={LAYERS}
                layerVisibility={layerVisibility}
                onToggle={toggleLayer}
                hidden={footerHidden}
            />

            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
    );
}
