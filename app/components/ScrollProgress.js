'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setProgress(scrollPercent);
        };

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        return () => window.removeEventListener('scroll', updateProgress);
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-transparent">
            <div
                className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 transition-all duration-150 ease-out shadow-lg shadow-red-500/30"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
