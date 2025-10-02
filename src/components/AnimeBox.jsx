import React, { useMemo, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import '../css/AnimeBox.css';

const AnimeBox = React.memo(({ data, opacity, refresh }) => {
	const controls = useAnimationControls();
	const prevModeRef = useRef();
	const { animate, transition } = useMemo(() => {
		const light = { repeat: 1,...data };
		let alpha = 0;

		if (!light.color) {
			light.color = "0,0,0";
		}

		if (light.mode === "follow") {
			alpha = opacity;
			if (typeof light.alpha === 'number') {
				alpha *= light.alpha;
			}
		} else {
			alpha = light.alpha || 1;
		}

		const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
		const rgbParts = light.color.split(',').map(s => parseInt(s.trim(), 10));
		const [r, g, b] = rgbParts.length === 3 ? rgbParts : [0, 0, 0];
		const alphaHex = toHex(alpha * 255);
		const targetBackgroundColor = `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;

		const animationTransition = {};

		const defaultDurationSec = (light.attack || 500) / 1000;
		const defaultDelaySec = (light.deviation || 0) / 1000;
		const defaultEndDelaySec = (light.sustain || 0) / 1000;


		if (light.mode === "blink") {
			animationTransition.duration = defaultDurationSec;
			animationTransition.ease = "easeInOut";
			animationTransition.repeatType = "reverse"; 
			animationTransition.repeat = (light.repeat ? light.repeat * 2 : 1) - 1;
			animationTransition.repeat = Math.max(0, animationTransition.repeat);
			animationTransition.delay = defaultDelaySec;
			animationTransition.repeatDelay = defaultEndDelaySec;
		} else if (light.mode === "light") {
			animationTransition.duration = defaultDurationSec;
			animationTransition.ease = "easeInOut";
			animationTransition.repeatType = "loop"; 
			animationTransition.repeat = (light.repeat || 1) - 1;
			animationTransition.repeat = Math.max(0, animationTransition.repeat);
			animationTransition.delay = defaultDelaySec;
			animationTransition.repeatDelay = defaultEndDelaySec;
		} else if (light.mode === "follow") {
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
		const runAnimationSequence = async () => {
			// 如果 mode 發生變化，在開始新動畫前先慢慢變回黑色
			if (prevModeRef.current && prevModeRef.current !== data.mode) {
				// 等待淡出到黑色的動畫完成
				await controls.start({
					backgroundColor: 'rgba(0,0,0,0)'
				}, {
					duration: 0.5, // 淡出動畫持續 0.3 秒
					ease: "easeOut"
				});
			}
			// 開始新的動畫
			controls.start(animate, transition);
		};
		runAnimationSequence();

		// 更新 ref 以供下次比較
		prevModeRef.current = data.mode;
	}, [refresh, animate, transition, controls, data.mode]);

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