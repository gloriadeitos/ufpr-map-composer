import { useState, useEffect } from 'react';

function getBreakpoint() {
    const w = window.innerWidth;
    return {
        isMobile: w < 640,
        isTablet: w >= 640 && w < 1024,
        isDesktop: w >= 1024,
        width: w,
    };
}

export function useBreakpoint() {
    const [bp, setBp] = useState(getBreakpoint);

    useEffect(() => {
        const handler = () => setBp(getBreakpoint());
        window.addEventListener('resize', handler, { passive: true });
        return () => window.removeEventListener('resize', handler);
    }, []);

    return bp;
}
