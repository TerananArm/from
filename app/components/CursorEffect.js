'use client';

import { useEffect, useRef, useState } from 'react';

export default function CursorEffect() {
    const cursorRef = useRef(null);
    const trailRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show on desktop
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return;
        }

        const cursor = cursorRef.current;
        const trail = trailRef.current;
        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let trailX = 0, trailY = 0;

        const onMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isVisible) setIsVisible(true);
        };

        const onMouseEnter = () => setIsVisible(true);
        const onMouseLeave = () => setIsVisible(false);

        // Smooth animation loop
        const animate = () => {
            // Cursor follows mouse with slight delay
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;

            // Trail follows cursor with more delay
            trailX += (mouseX - trailX) * 0.08;
            trailY += (mouseY - trailY) * 0.08;

            if (cursor) {
                cursor.style.transform = `translate(${cursorX - 10}px, ${cursorY - 10}px)`;
            }
            if (trail) {
                trail.style.transform = `translate(${trailX - 20}px, ${trailY - 20}px)`;
            }

            requestAnimationFrame(animate);
        };

        // Detect hover on interactive elements
        const onHover = (e) => {
            const target = e.target;
            const isInteractive = target.matches('a, button, input, select, textarea, [role="button"], .cursor-pointer');
            setIsHovering(isInteractive);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseover', onHover);
        document.addEventListener('mouseenter', onMouseEnter);
        document.addEventListener('mouseleave', onMouseLeave);
        animate();

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseover', onHover);
            document.removeEventListener('mouseenter', onMouseEnter);
            document.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [isVisible]);

    // Don't render on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return null;
    }

    return (
        <>
            {/* Main cursor */}
            <div
                ref={cursorRef}
                className={`fixed top-0 left-0 w-5 h-5 rounded-full pointer-events-none z-[99999] mix-blend-difference transition-transform duration-100
                    ${isVisible ? 'opacity-100' : 'opacity-0'}
                    ${isHovering ? 'scale-150 bg-white' : 'scale-100 bg-white'}`}
                style={{ willChange: 'transform' }}
            />
            {/* Trail */}
            <div
                ref={trailRef}
                className={`fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[99998] border-2 border-white/30 transition-transform duration-300
                    ${isVisible ? 'opacity-100' : 'opacity-0'}
                    ${isHovering ? 'scale-150' : 'scale-100'}`}
                style={{ willChange: 'transform' }}
            />
        </>
    );
}
