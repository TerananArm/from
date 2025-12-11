'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export default function SmoothScroll({ children }) {
    const lenisRef = useRef(null);

    useEffect(() => {
        // Initialize Lenis with premium settings
        lenisRef.current = new Lenis({
            duration: 1.2, // Slow, buttery smooth
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential easing
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.8, // Slower scroll
            touchMultiplier: 1.5,
            infinite: false,
        });

        // Animation frame loop
        function raf(time) {
            lenisRef.current?.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Cleanup
        return () => {
            lenisRef.current?.destroy();
        };
    }, []);

    return <>{children}</>;
}
