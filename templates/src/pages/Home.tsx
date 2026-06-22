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
    const [attrSimpleOpen, setAttrSimpleOpen] = useState(false);
    const [reportsVisible, setReportsVisible] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [mapGalleryOpen, setMapGalleryOpen] = useState(false);

    const toggleLayer = (id: string) =>
        setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

    const setLayersVisible = (ids: string[], visible: boolean) =>
        setLayerVisibility((prev) => {
            const next = { ...prev };
            ids.forEach(id => { next[id] = visible; });
            return next;
        });

    const closeAllPanels = () => {
        setLegendVisible(false);
        setDownloadVisible(false);
        setAttrSimpleOpen(false);
        setReportsVisible(false);
        setMapGalleryOpen(false);
    };

    const handleToggleCompare = () => {
        if (!compareMode) closeAllPanels();
        setCompareMode(v => !v);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
            <Header
                baseLayer={baseLayer}
                onBaseLayerChange={setBaseLayer}
                onToggleSidebar={() => setSidebarOpen((o) => !o)}
                mapGalleryOpen={mapGalleryOpen}
                onMapGalleryToggle={() => setMapGalleryOpen(o => !o)}
                legendVisible={legendVisible}
                onToggleLegend={() => setLegendVisible((v) => !v)}
                downloadVisible={downloadVisible}
                onToggleDownload={() => setDownloadVisible((v) => !v)}
                attrSimpleOpen={attrSimpleOpen}
                onToggleAttrSimple={() => setAttrSimpleOpen((v) => !v)}
                reportsVisible={reportsVisible}
                onToggleReports={() => setReportsVisible((v) => !v)}
                compareMode={compareMode}
                onToggleCompare={handleToggleCompare}
                onCloseAll={closeAllPanels}
            />

            <Map
                baseLayer={baseLayer}
                layers={LAYERS}
                layerVisibility={layerVisibility}
                legendVisible={legendVisible}
                downloadVisible={downloadVisible}
                attrVisible={attrSimpleOpen}
                compareMode={compareMode}
            />

            {!isMobile && (
                <MapPanel
                    layers={LAYERS}
                    layerVisibility={layerVisibility}
                    onToggleLayer={toggleLayer}
                    onSetLayersVisible={setLayersVisible}
                    legendVisible={legendVisible}
                    downloadVisible={downloadVisible}
                    attrVisible={attrSimpleOpen}
                    reportsVisible={reportsVisible}
                    compareActive={compareMode}
                />
            )}

            {isMobile && (
                <MapPanelSheet
                    layers={LAYERS}
                    layerVisibility={layerVisibility}
                    onToggleLayer={toggleLayer}
                    onSetLayersVisible={setLayersVisible}
                    legendVisible={legendVisible}
                    downloadVisible={downloadVisible}
                    attrVisible={attrSimpleOpen}
                    reportsVisible={reportsVisible}
                    compareActive={compareMode}
                />
            )}

            <Footer
                layers={LAYERS}
                layerVisibility={layerVisibility}
                onToggleLayer={toggleLayer}
                baseLayer={baseLayer}
                hidden={compareMode}
            />

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
    );
}
