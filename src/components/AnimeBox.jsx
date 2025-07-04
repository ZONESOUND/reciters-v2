import React, { useMemo, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";
import '../css/AnimeBox.css';

const AnimeBox = React.memo(({ data, opacity, refresh }) => {
	const controls = useAnimationControls();
	const { animate, transition } = useMemo(() => {
		const light = { ...data };
		let alpha = 0;

		if (!light.color) {
			light.color = "0,0,0";
		}

		if ("alpha" in light) {
			alpha = light.alpha;
		}
		if (light.mode === "follow"){
			alpha = opacity;
		}

		const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
		const rgbParts = light.color.split(',').map(s => parseInt(s.trim(), 10));
		const [r, g, b] = rgbParts.length === 3 ? rgbParts : [0, 0, 0];
		const alphaHex = toHex(alpha * 255);
		const targetBackgroundColor = `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;

		const animationTransition = {};

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
			// 調整回 'spring' 動畫以獲得更平滑、更有機的感覺。
			// 關鍵是調整參數以獲得理想的響應速度。
			// - stiffness: 彈簧的「強度」。值越高，反應越快。
			// - damping: 彈簧的「阻尼」。值越低，回彈越多。
			animationTransition.type = "spring";
			animationTransition.stiffness = 300;
			animationTransition.damping = 25;
			animationTransition.mass = 1;
		} else {
			animationTransition.duration = defaultDurationSec;
			animationTransition.ease = "easeInOut";
			animationTransition.delay = defaultDelaySec;
			animationTransition.repeat = 0;
			animationTransition.repeatType = "loop";
			animationTransition.repeatDelay = 0;
		}

		return {
			animate: { backgroundColor: targetBackgroundColor },
			transition: animationTransition,
		};
	}, [data, opacity]);

	useEffect(() => {
		controls.start(animate, transition);
	}, [refresh, animate, transition, controls]);

	//TODO: check?
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