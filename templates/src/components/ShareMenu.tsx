import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
    FontAwesomeIcon,
    faShareNodes,
    faCopy,
    faCheck,
    faQrcode,
    faWhatsapp,
    faFacebook,
    faXTwitter,
    faTelegram,
    faLinkedin,
} from '../utils/Icons';

const sf = "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif";

const ShareMenu = ({ onOpen }: { onOpen?: () => void }) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropTop, setDropTop] = useState(0);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) {
            setShowQR(false);
            onOpen?.();
            const header = buttonRef.current?.closest('header');
            const anchor = header ?? buttonRef.current;
            if (anchor) {
                setDropTop(anchor.getBoundingClientRect().bottom + 10);
            }
        }
    };

    const url = window.location.href;
    const title = 'WebSIG';

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setOpen(false);
                setShowQR(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const nativeShare = () => {
        if (navigator.share) navigator.share({ title, url });
    };

    const socialLinks = [
        { label: 'WhatsApp', icon: faWhatsapp, color: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(title + '\n' + url)}` },
        { label: 'Facebook', icon: faFacebook, color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
        { label: 'LinkedIn', icon: faLinkedin, color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
        { label: 'X / Twitter', icon: faXTwitter, color: '#000', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
        { label: 'Telegram', icon: faTelegram, color: '#26A5E4', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    ];

    const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    return (
        <div>
            <button
                ref={buttonRef}
                onClick={toggle}
                className={`flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-xl transition-all duration-150 ${open ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                title="Compartilhar"
            >
                <FontAwesomeIcon icon={faShareNodes} className="text-sm" />
            </button>

            {open && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        top: dropTop,
                        right: 10,
                        zIndex: 9999,
                        width: showQR ? '240px' : '220px',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.94)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        fontFamily: sf,
                    }}
                >
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Compartilhar</p>
                        <p style={{ fontSize: '11px', color: '#8e8e93', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</p>
                    </div>

                    {showQR && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)', gap: '8px' }}>
                            <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)' }}>
                                <QRCodeSVG value={url} size={160} bgColor="#ffffff" fgColor="#1c1c1e" />
                            </div>
                            <p style={{ fontSize: '11px', color: '#8e8e93', margin: 0 }}>Aponte a camera para abrir</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <button onClick={copyLink} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: copied ? 'rgba(52,199,89,0.12)' : 'rgba(0,0,0,0.04)', transition: 'background 0.15s' }}>
                            <FontAwesomeIcon icon={copied ? faCheck : faCopy} style={{ fontSize: '16px', color: copied ? '#34C759' : '#3c3c43' }} />
                            <span style={{ fontSize: '11px', fontWeight: 500, color: copied ? '#34C759' : '#3c3c43' }}>{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                        <button onClick={() => setShowQR(q => !q)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: showQR ? 'rgba(0,122,255,0.12)' : 'rgba(0,0,0,0.04)', transition: 'background 0.15s' }}>
                            <FontAwesomeIcon icon={faQrcode} style={{ fontSize: '16px', color: showQR ? '#007AFF' : '#3c3c43' }} />
                            <span style={{ fontSize: '11px', fontWeight: 500, color: showQR ? '#007AFF' : '#3c3c43' }}>QR Code</span>
                        </button>
                        {hasNativeShare && (
                            <button onClick={nativeShare} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', transition: 'background 0.15s' }}>
                                <FontAwesomeIcon icon={faShareNodes} style={{ fontSize: '16px', color: '#3c3c43' }} />
                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#3c3c43' }}>Mais</span>
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '8px 0 4px' }}>
                        {socialLinks.map(s => (
                            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', textDecoration: 'none', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FontAwesomeIcon icon={s.icon} style={{ fontSize: '15px', color: '#fff' }} />
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1c1c1e' }}>{s.label}</span>
                            </a>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ShareMenu;
