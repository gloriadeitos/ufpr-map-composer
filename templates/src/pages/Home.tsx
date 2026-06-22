import { useState } from 'react';
import Map from '../components/Map';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import AttributeTable from '../components/AttributeTable';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { FontAwesomeIcon, faChevronUp, faChevronDown } from '../utils/Icons';
import type { LayerDockItem } from '../types/layers';
import { BASEMAPS, COMPARE_MODE, SHOW_TEAM } from '../config';
import { faLayerGroup /*{{LAYER_ICON_IMPORTS}}*/ } from '../utils/Icons';

const LAYERS: LayerDockItem[] = [] /*{{LAYERS_ARRAY}}*/;

const DEFAULT_VISIBLE = new Set<string>([/*{{DEFAULT_VISIBLE_SET}}*/]);

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
    const canCompare = COMPARE_MODE;
    const [mapGalleryOpen, setMapGalleryOpen] = useState(false);
    const [attrTableOpen, setAttrTableOpen] = useState(false);
    const [attrTableHeight, setAttrTableHeight] = useState(220);
    const [attrTableResizing, setAttrTableResizing] = useState(false);
    const [expandedPanelWidth, setExpandedPanelWidth] = useState(0);

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
        if (!canCompare) return;
        if (!compareMode) closeAllPanels();
        setCompareMode(v => !v);
    };

    const footerHidden = sidebarOpen || (isMobile && (legendVisible || downloadVisible || reportsVisible || attrSimpleOpen));

    return (
        <div className="flex flex-col h-screen">
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

            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex flex-1 relative overflow-hidden min-h-0">
                    {SHOW_TEAM && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

                    <main className="flex-1 w-full min-h-0">
                        <div className="h-full w-full">
                            <Map
                                baseLayer={baseLayer}
                                layers={LAYERS}
                                layerVisibility={layerVisibility}
                                legendVisible={legendVisible}
                                downloadVisible={downloadVisible}
                                attrVisible={attrSimpleOpen}
                                reportsVisible={reportsVisible}
                                onToggleLayer={toggleLayer}
                                onSetLayersVisible={setLayersVisible}
                                sidebarOpen={sidebarOpen}
                                footerHidden={footerHidden}
                                compareMode={compareMode}
                                onExpandedPanelWidth={setExpandedPanelWidth}
                            />
                        </div>
                    </main>
                </div>

                {attrTableOpen && !compareMode && (
                    <AttributeTable
                        layers={LAYERS}
                        height={attrTableHeight}
                        onHeightChange={setAttrTableHeight}
                        onClose={() => setAttrTableOpen(false)}
                        onResizeStart={() => setAttrTableResizing(true)}
                        onResizeEnd={() => setAttrTableResizing(false)}
                    />
                )}
            </div>

            {/* Seta de toggle da tabela de atributos */}
            <div
                className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden sm:block"
                style={{
                    bottom: attrTableOpen && !compareMode ? attrTableHeight : 0,
                    transition: attrTableResizing ? 'none' : 'bottom 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
                    opacity: sidebarOpen ? 0 : 1,
                    pointerEvents: sidebarOpen ? 'none' : undefined,
                }}
            >
                <button
                    onClick={() => setAttrTableOpen(v => !v)}
                    className={`pointer-events-auto flex items-center justify-center w-12 h-5 rounded-t-lg border-t border-x transition-colors duration-150 ${attrTableOpen && !compareMode
                        ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        : 'bg-white/80 border-gray-300/70 backdrop-blur-sm text-gray-600 hover:bg-white'
                        }`}
                    title={attrTableOpen ? 'Fechar tabela' : 'Abrir tabela de atributos'}
                >
                    <FontAwesomeIcon icon={attrTableOpen && !compareMode ? faChevronDown : faChevronUp} className="text-[9px]" />
                </button>
            </div>

            <Footer
                layers={LAYERS.filter(l => !l.downloadOnly && !(l as any).compareOnly)}
                layerVisibility={layerVisibility}
                onToggleLayer={toggleLayer}
                baseLayer={baseLayer}
                tableOffset={attrTableOpen && !compareMode ? attrTableHeight : 0}
                tableResizing={attrTableResizing}
                hidden={footerHidden}
                rightOffset={expandedPanelWidth}
            />
        </div>
    );
}
