import React, { useEffect, useState } from "react";

const Fade = ({ show, speed = "0.5s", children }) => {
    const [shouldRender, setRender] = useState(show);

    useEffect(() => {
        if (show) setRender(true);
    }, [show]);

    const onAnimationEnd = () => {
        if (!show) setRender(false);
    };

    return (
        shouldRender && (
        <div
            style={{ animation: `${show ? "fadeIn" : "fadeOut"} ${speed}` }}
            onAnimationEnd={onAnimationEnd}
        >
            {children}
        </div>
        )
    );
};

export default Fade;