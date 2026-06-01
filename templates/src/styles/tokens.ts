import type { CSSProperties } from 'react';

export const sf =
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";
export const mono = "'SF Mono', 'Fira Mono', 'Cascadia Code', monospace";

export const glassCard: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.97)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
};

export const glassCardDark: CSSProperties = {
    background: 'rgba(28, 28, 30, 0.88)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.2)',
};

export const glassDock: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow:
        '0 8px 32px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.8)',
};
