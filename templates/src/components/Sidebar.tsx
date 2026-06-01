import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { glassCard, sf } from '../styles/tokens';
import { PROJECT_TITLE, PROJECT_SUBTITLE } from '../config';

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
