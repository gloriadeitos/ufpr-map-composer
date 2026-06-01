import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLink, faEnvelope, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { QRCodeSVG } from 'qrcode.react';
import { glassCard, sf } from '../styles/tokens';
import { PROJECT_TITLE } from '../config';

interface ShareMenuProps {
    onClose: () => void;
}

export default function ShareMenu({ onClose }: ShareMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const url = window.location.href;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const copyLink = () => {
        navigator.clipboard.writeText(url).catch(() => { });
        onClose();
    };

    const shareWhatsapp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${PROJECT_TITLE} — ${url}`)}`, '_blank');
        onClose();
    };

    const shareTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(PROJECT_TITLE)}&url=${encodeURIComponent(url)}`, '_blank');
        onClose();
    };

    const shareEmail = () => {
        window.open(`mailto:?subject=${encodeURIComponent(PROJECT_TITLE)}&body=${encodeURIComponent(`Confira este mapa: ${url}`)}`, '_blank');
        onClose();
    };

    const btnStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(0,0,0,0.03)',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: sf,
        color: '#1c1c1e',
        width: '100%',
        textAlign: 'left',
    };

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed',
                top: 68,
                right: 12,
                width: 260,
                zIndex: 110,
                ...glassCard,
                borderRadius: 16,
                padding: 16,
                fontFamily: sf,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>Compartilhar</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 15 }}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>

            {/* QR code */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <QRCodeSVG value={url} size={120} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={btnStyle} onClick={copyLink}>
                    <FontAwesomeIcon icon={faLink} style={{ color: '#007AFF' }} />
                    Copiar link
                </button>
                <button style={btnStyle} onClick={shareWhatsapp}>
                    <FontAwesomeIcon icon={faWhatsapp} style={{ color: '#25D366' }} />
                    WhatsApp
                </button>
                <button style={btnStyle} onClick={shareTwitter}>
                    <FontAwesomeIcon icon={faTwitter} style={{ color: '#1DA1F2' }} />
                    Twitter / X
                </button>
                <button style={btnStyle} onClick={shareEmail}>
                    <FontAwesomeIcon icon={faEnvelope} style={{ color: '#999' }} />
                    E-mail
                </button>
            </div>
        </div>
    );
}
