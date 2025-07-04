import React, { useMemo, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";
import '../css/AnimeBox.css';

const AnimeBox = React.memo(({ data, opacity, refresh }) => {
	const controls = useAnimationControls();

	// useMemo will re-calculate the animation properties only when data, opacity, or refresh changes.
    // This is efficient and ensures we are working with the latest props when a re-render is triggered.
	// The animation parameters depend on `data` and `opacity`.
	const { animate, transition } = useMemo(() => {
		const light = { ...data };
		let alpha = 0;

		// Fallback for color to prevent errors.
		if (!light.color) {
			light.color = "0,0,0";
		}

		if ("alpha" in light) {
			alpha = light.alpha;
		}
		if (light.mode === "follow"){
			alpha = opacity;
		}

		// Convert RGB string and alpha to a hex color string with alpha (#RRGGBBAA)
		const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
		const rgbParts = light.color.split(',').map(s => parseInt(s.trim(), 10));
		const [r, g, b] = rgbParts.length === 3 ? rgbParts : [0, 0, 0]; // Fallback for malformed color
		const alphaHex = toHex(alpha * 255);
		const targetBackgroundColor = `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;

		const animationTransition = {};

		// Default duration if not specified in data, converted to seconds
		const defaultDurationSec = (light.duration || 500) / 1000;
		const defaultDelaySec = (light.delay || 0) / 1000;
		const defaultEndDelaySec = (light.endDelay || 0) / 1000;

		if (light.mode === "blink") {
			animationTransition.duration = defaultDurationSec;
			animationTransition.ease = "easeInOut";
			animationTransition.repeatType = "reverse"; 
			animationTransition.repeat = (light.loopTime ? light.loopTime * 2 : 1) - 1;
			animationTransition.repeat = Math.max(0, animationTransition.repeat);
			animationTransition.delay = defaultDelaySec;
			animationTransition.repeatDelay = defaultEndDelaySec;
		} else if (light.mode === "light") {
			animationTransition.duration = defaultDurationSec;
			animationTransition.ease = "easeInOut";
			animationTransition.repeatType = "loop"; 
			animationTransition.repeat = (light.loopTime || 1) - 1;
			animationTransition.repeat = Math.max(0, animationTransition.repeat);
			animationTransition.delay = defaultDelaySec;
			animationTransition.repeatDelay = defaultEndDelaySec;
		} else if (light.mode === "follow") {
			// Use spring physics for "follow" mode, similar to react-motion
			animationTransition.type = "spring";
			animationTransition.stiffness = 100; // Example value, can be tuned
			animationTransition.damping = 30;    // Example value, can be tuned
			animationTransition.mass = 1;        // Example value, can be tuned
			// Spring transitions don't typically use duration/delay/repeat directly
			animationTransition.duration = undefined;
			animationTransition.delay = undefined;
			animationTransition.repeat = 0;
			animationTransition.repeatType = undefined;
			animationTransition.repeatDelay = undefined;
		} else {
			// Default animation for other modes (single play)
			animationTransition.duration = defaultDurationSec;
			animationTransition.ease = "easeInOut";
			animationTransition.delay = defaultDelaySec;
			animationTransition.repeat = 0; // Play once
			animationTransition.repeatType = "loop";
			animationTransition.repeatDelay = 0;
		}

		return {
			animate: { backgroundColor: targetBackgroundColor },
			transition: animationTransition,
		};
	}, [data, opacity]); // `refresh` is now an imperative trigger, not a memoization dependency.

	// This effect uses the animation controls to start a new animation.
	// It runs whenever a refresh is triggered or the animation parameters change.
	// Because the component is not unmounted, it transitions smoothly from the current state.
	useEffect(() => {
		controls.start(animate, transition);
	}, [refresh, animate, transition, controls]);

	const dynamicStyles = useMemo(() => {
        if (data.noise) {
            return {
                '--noise-intensity': data.noiseIntensity || 0.1,
                '--noise-size': `${data.noiseSize || 150}px`,
            };
        }
        return {};
    }, [data.noise, data.noiseIntensity, data.noiseSize]);


    return (
        <motion.div
            id="lightBox"
			className={data.noise ? 'noise-effect' : ''}
            style={dynamicStyles} 
			animate={controls}
			initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
        ></motion.div>
    );

}, (prevProps, nextProps) => {

    if (prevProps.refresh !== nextProps.refresh) {
        return false;
    }
    if (prevProps.data !== nextProps.data) {
        return false; 
    }
    if (nextProps.data.mode === 'follow' && prevProps.opacity !== nextProps.opacity) {
        return false; 
    }
    return true;
});

export default AnimeBox;