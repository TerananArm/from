'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }) {
    const pathname = usePathname();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [displayChildren, setDisplayChildren] = useState(children);

    useEffect(() => {
        // Start transition
        setIsTransitioning(true);

        // Wait for fade out, then update content
        const timer = setTimeout(() => {
            setDisplayChildren(children);
            setIsTransitioning(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [pathname, children]);

    return (
        <div
            className={`transition-all duration-300 ease-out ${isTransitioning
                    ? 'opacity-0 translate-y-2'
                    : 'opacity-100 translate-y-0'
                }`}
        >
            {displayChildren}
        </div>
    );
}
