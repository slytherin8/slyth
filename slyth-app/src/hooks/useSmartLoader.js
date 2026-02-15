import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to manage smart loading states.
 * Returns true only if isFetching is true for longer than the specified delay.
 * 
 * @param {boolean} isFetching - Whether a network request is currently active.
 * @param {number} delay - Time in milliseconds to wait before showing the loader.
 * @returns {boolean} - Whether the loader should be displayed.
 */
export const useSmartLoader = (isFetching, delay = 500) => {
    const [showLoader, setShowLoader] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isFetching) {
            // Only start timer if not already set
            if (!timerRef.current) {
                timerRef.current = setTimeout(() => {
                    setShowLoader(true);
                }, delay);
            }
        } else {
            // Logic completed, clear timer and hide loader
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setShowLoader(false);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isFetching, delay]);

    return showLoader;
};
