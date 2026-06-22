import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon, faLandmark, faUsers, faList, faLayerGroup, faTable, faBars, faBook } from '../utils/Icons';
import { PROJECT_TITLE, PROJECT_SUBTITLE, COMPARE_MODE, COMPARE_LEFT_TITLE, COMPARE_RIGHT_TITLE, SHOW_DOCS, SHOW_SHARE, SHOW_TEAM } from '../config';
import MapLayerGallery from './MapLayerGallery';
import ShareMenu from './ShareMenu';

const CompareIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="5.5" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9.5" y="3" width="5.5" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
);

interface HeaderProps {
    baseLayer: string;
    onBaseLayerChange: (layer: string) => void;
    onToggleSidebar: () => void;
    mapGalleryOpen: boolean;
    onMapGalleryToggle: () => void;
    legendVisible: boolean;
    onToggleLegend: () => void;
    downloadVisible: boolean;
    onToggleDownload: () => void;
    attrSimpleOpen: boolean;
    onToggleAttrSimple: () => void;
    reportsVisible: boolean;
    onToggleReports: () => void;
    compareMode: boolean;
    onToggleCompare: () => void;
    onCloseAll: () => void;
}

const Header = ({
    baseLayer,
    onBaseLayerChange,
    onToggleSidebar,
    mapGalleryOpen,
    onMapGalleryToggle,
    legendVisible,
    onToggleLegend,
    downloadVisible,
    onToggleDownload,
    attrSimpleOpen,
    onToggleAttrSimple,
    reportsVisible,
    onToggleReports,
    compareMode,
    onToggleCompare,
    onCloseAll,
}: HeaderProps) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const mobileDropdownRef = useRef<HTMLDivElement>(null);
    const [menuTop, setMenuTop] = useState(0);

    useEffect(() => {
        if (!mobileMenuOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                menuRef.current && !menuRef.current.contains(target) &&
                mobileDropdownRef.current && !mobileDropdownRef.current.contains(target)
            ) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [mobileMenuOpen]);

    const anyActive = legendVisible || downloadVisible || attrSimpleOpen || reportsVisible || compareMode;

    const menuItems = [
        { label: 'Legenda', icon: faList, active: legendVisible, onToggle: onToggleLegend },
        { label: 'Camadas', icon: faLayerGroup, active: downloadVisible, onToggle: onToggleDownload },
        { label: 'Atributos', icon: faTable, active: attrSimpleOpen, onToggle: onToggleAttrSimple },
        ...(SHOW_DOCS ? [{ label: 'Documentos', icon: faBook, active: reportsVisible, onToggle: onToggleReports }] : []),
        ...(SHOW_TEAM ? [{ label: 'Equipe', icon: faUsers, active: false, onToggle: () => { onCloseAll(); setMobileMenuOpen(false); onToggleSidebar(); } }] : []),
    ];

    return (
        <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200/40 shadow-sm">
            <div className="mx-auto px-4 py-2.5 flex justify-between items-center">

                {/* Logo + titulo */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
                        <FontAwesomeIcon icon={faLandmark} className="text-white text-base" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight leading-none">
                            {PROJECT_TITLE}
                        </h1>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-none">{PROJECT_SUBTITLE}</p>
                    </div>
                </div>

                {/* Acoes - Desktop */}
                <div className="hidden sm:flex items-center gap-2">
                    <MapLayerGallery
                        baseLayer={baseLayer}
                        onBaseLayerChange={onBaseLayerChange}
                        isOpen={mapGalleryOpen}
                        onToggle={onMapGalleryToggle}
                    />
                    <button
                        onClick={onToggleAttrSimple}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${attrSimpleOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        title="Tabela de atributos"
                    >
                        <FontAwesomeIcon icon={faTable} className="text-sm" />
                    </button>
                    <button
                        onClick={onToggleDownload}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${downloadVisible ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        title="Camadas"
                    >
                        <FontAwesomeIcon icon={faLayerGroup} className="text-sm" />
                    </button>
                    <button
                        onClick={onToggleLegend}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${legendVisible ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        title="Legenda"
                    >
                        <FontAwesomeIcon icon={faList} className="text-sm" />
                    </button>
                    {SHOW_DOCS && (
                        <button
                            onClick={onToggleReports}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${reportsVisible ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                            title="Documentos"
                        >
                            <FontAwesomeIcon icon={faBook} className="text-sm" />
                        </button>
                    )}
                    {COMPARE_MODE && (
                        <button
                            onClick={onToggleCompare}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${compareMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                            title="Modo comparacao"
                        >
                            <CompareIcon />
                        </button>
                    )}
                    {SHOW_TEAM && (
                        <button
                            onClick={() => { onCloseAll(); setMobileMenuOpen(false); onToggleSidebar(); }}
                            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all duration-150"
                            title="Equipe"
                        >
                            <FontAwesomeIcon icon={faUsers} className="text-sm" />
                        </button>
                    )}
                    {SHOW_SHARE && <ShareMenu onOpen={() => { onCloseAll(); setMobileMenuOpen(false); }} />}
                </div>

                {/* Acoes - Mobile: hamburguer */}
                <div className="flex sm:hidden items-center gap-2 relative" ref={menuRef}>
                    <MapLayerGallery
                        baseLayer={baseLayer}
                        onBaseLayerChange={onBaseLayerChange}
                        isOpen={mapGalleryOpen}
                        onToggle={onMapGalleryToggle}
                    />
                    {SHOW_SHARE && <ShareMenu onOpen={() => { onCloseAll(); setMobileMenuOpen(false); }} />}
                    {COMPARE_MODE && (
                        <button
                            onClick={onToggleCompare}
                            className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${compareMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                            title="Modo comparacao"
                        >
                            <CompareIcon />
                        </button>
                    )}
                    {/* Botao hamburguer */}
                    <button
                        ref={hamburgerRef}
                        onClick={() => {
                            if (!mobileMenuOpen) {
                                const header = hamburgerRef.current?.closest('header');
                                if (header) setMenuTop(header.getBoundingClientRect().bottom + 10);
                            }
                            setMobileMenuOpen(o => !o);
                        }}
                        className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ${mobileMenuOpen || anyActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                        title="Menu"
                    >
                        <FontAwesomeIcon icon={faBars} className="text-base" />
                        {anyActive && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                    </button>

                    {/* Dropdown menu - portal */}
                    {mobileMenuOpen && createPortal(
                        <div
                            ref={mobileDropdownRef}
                            style={{
                                position: 'fixed',
                                top: menuTop,
                                right: 10,
                                zIndex: 9999,
                                width: '224px',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
                                border: '1px solid rgba(0,0,0,0.08)',
                                background: 'rgba(255,255,255,0.94)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                            }}
                        >
                            {menuItems.map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => { item.onToggle(); setMobileMenuOpen(false); }}
                                    className={`flex items-center gap-4 w-full px-5 py-4 text-left text-[15px] font-medium transition-colors duration-150 border-b border-gray-100/80 last:border-b-0 ${item.active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 active:bg-gray-100'}`}
                                >
                                    <span className={`flex items-center justify-center w-9 h-9 rounded-xl ${item.active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <FontAwesomeIcon icon={item.icon} className="text-base" />
                                    </span>
                                    {item.label}
                                    {item.active && <span className="ml-auto w-2 h-2 rounded-full bg-blue-500" />}
                                </button>
                            ))}
                        </div>,
                        document.body
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
