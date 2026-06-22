import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon, faBook, faFilePdf, faDownload } from '../utils/Icons';

const BASE = import.meta.env.BASE_URL;

const REPORTS = [
    {
        label: 'Relatório de Processamento Final',
        file: 'RELATORIO PROCESSAMENTO FINAL.pdf',
        folder: 'Relatorios',
    },
    {
        label: 'Relatório PEC-PCD Planialtimétrico',
        file: 'RELATORIO-PEC-PCD_FINAL_PLANIALTIMETRICO_REV1.pdf',
        folder: 'Relatorios',
    },
    {
        label: 'Prancha 1',
        file: 'prancha_1.pdf',
        folder: 'Pranchas',
    },
    {
        label: 'Prancha 2',
        file: 'prancha_2.pdf',
        folder: 'Pranchas',
    },
    {
        label: 'Prancha 3',
        file: 'prancha_3.pdf',
        folder: 'Pranchas',
    },
];

interface ReportsMenuProps {
    onOpen?: () => void;
}

const ReportsMenu = ({ onOpen }: ReportsMenuProps) => {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, right: 0 });

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!dropRef.current?.contains(t) && !btnRef.current?.contains(t)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggle = () => {
        if (!open) {
            onOpen?.();
            const rect = btnRef.current?.getBoundingClientRect();
            if (rect) setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
        }
        setOpen(o => !o);
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={toggle}
                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 ${open ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                title="Relatórios e Pranchas"
            >
                <FontAwesomeIcon icon={faBook} className="text-sm" />
            </button>

            {open && createPortal(
                <div
                    ref={dropRef}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        right: pos.right,
                        zIndex: 9999,
                        width: '280px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        background: 'rgba(255,255,255,0.96)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    <div style={{ padding: '10px 16px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#8e8e93', textTransform: 'uppercase' }}>
                        Relatórios e Pranchas
                    </div>
                    {REPORTS.map(r => (
                        <a
                            key={r.file}
                            href={`${BASE}Produtos/${r.folder}/${encodeURIComponent(r.file)}`}
                            download={r.file}
                            onClick={() => setOpen(false)}
                            style={{ textDecoration: 'none' }}
                            className="flex items-center gap-3 px-4 py-3 border-t border-gray-100/80 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-100 cursor-pointer"
                        >
                            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-500 shrink-0">
                                <FontAwesomeIcon icon={faFilePdf} className="text-base" />
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 500, lineHeight: '1.3', flex: 1 }}>{r.label}</span>
                            <FontAwesomeIcon icon={faDownload} className="text-xs text-gray-400 shrink-0" />
                        </a>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

export default ReportsMenu;
