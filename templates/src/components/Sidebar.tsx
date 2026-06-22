import { FontAwesomeIcon, faXmark, faLinkedin } from '../utils/Icons';
import { PROJECT_TITLE } from '../config';

interface Aluno {
    nome: string;
    linkedin?: string;
    foto?: string;
}

const alunos: Aluno[] = {{ ALUNOS_ARRAY }};

const COPYRIGHT = '{{COPYRIGHT_TEXT}}';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full z-30 transition-transform duration-500 ease-in-out w-72 flex flex-col bg-white/80 backdrop-blur-2xl border-l border-gray-200/50 shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50">
                    <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Projeto</p>
                        <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">{PROJECT_TITLE}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors duration-150"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-sm" />
                    </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                    {alunos.map((aluno, i) => (
                        <a
                            key={i}
                            href={aluno.linkedin ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/60 hover:bg-white border border-gray-100 hover:border-gray-200 transition-all duration-150 group"
                        >
                            {aluno.foto && (
                                <img
                                    src={aluno.foto}
                                    alt={aluno.nome}
                                    className="w-10 h-10 rounded-full object-cover shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-gray-900 leading-tight truncate">{aluno.nome}</p>
                                {aluno.linkedin && (
                                    <p className="text-[11px] text-blue-500 mt-0.5 flex items-center gap-1">
                                        <FontAwesomeIcon icon={faLinkedin} className="text-[10px]" />
                                        LinkedIn
                                    </p>
                                )}
                            </div>
                        </a>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-200/50">
                    <p className="text-[11px] text-gray-400 text-center">{COPYRIGHT}</p>
                </div>
            </div>
        </>
    );
};

export default Sidebar;

interface Aluno {
    nome: string;
    linkedin?: string;
    foto?: string;
}

const alunos: Aluno[] = {{ ALUNOS_ARRAY }};

const COPYRIGHT = '{{COPYRIGHT_TEXT}}';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, onClose]);

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 320,
                maxWidth: '90vw',
                zIndex: 200,
                transform: open ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...glassCard,
                borderRadius: '0 16px 16px 0',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                fontFamily: sf,
                padding: '72px 20px 24px',
            }}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: '#666',
                }}
            >
                <FontAwesomeIcon icon={faXmark} />
            </button>

            {/* Project title */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', letterSpacing: -0.5 }}>
                    {PROJECT_TITLE}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {PROJECT_SUBTITLE}
                </div>
            </div>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

            {/* About */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Sobre
                </div>
                <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, margin: 0 }}>
                    WebGIS desenvolvido como ferramenta de visualização e análise espacial para o Cadastro
                    Técnico Multifinalitário. Gerado com o plugin UFPR Map Composer para QGIS.
                </p>
            </div>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

            {/* Team */}
            {alunos.length > 0 && (
                <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Equipe
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {alunos.map((a, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {a.foto && (
                                    <img
                                        src={a.foto}
                                        alt={a.nome}
                                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {a.nome}
                                    </div>
                                    {a.linkedin && (
                                        <a
                                            href={a.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: 11, color: '#0A66C2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <FontAwesomeIcon icon={faLinkedin} /> LinkedIn
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />
                </>
            )}

            {/* Copyright */}
            <div style={{ fontSize: 11, color: '#999', marginTop: 'auto' }}>
                {COPYRIGHT}
            </div>
        </div>
    );
}
