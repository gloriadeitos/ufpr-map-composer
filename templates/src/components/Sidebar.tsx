import { FontAwesomeIcon, faXmark, faLinkedin } from '../utils/Icons';
import { PROJECT_TITLE } from '../config';

interface Aluno {
    nome: string;
    linkedin?: string;
    foto?: string;
}

const alunos: Aluno[] = [] /*{{ALUNOS_ARRAY}}*/;

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
