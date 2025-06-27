import React, { useEffect, useState, useRef } from "react";

const Fade = ({ show, speed = "0.5s", children }) => {
    const [shouldRender, setRender] = useState(show);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (show) {
            clearTimeout(timeoutRef.current);
            setRender(true);
        } else {
            const durationInMs = parseFloat(speed) * 1000;
            timeoutRef.current = setTimeout(() => setRender(false), durationInMs);
        }
        return () => clearTimeout(timeoutRef.current);
    }, [show, speed]);

    return (
        shouldRender && (
        <div
            style={{
                animationName: show ? "fadeIn" : "fadeOut",
                animationDuration: speed,
                animationFillMode: 'forwards'
            }}
        >
            {children}
        </div>
        )
    );
};

export default Fade;