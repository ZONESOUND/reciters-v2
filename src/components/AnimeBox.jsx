import React, { useMemo } from "react";
import Anime from "react-anime";
import { Motion, spring} from "react-motion";
import '../css/AnimeBox.css';
// import {rgbToHsl} from "../usages/colorUsage"; // Unused
// import styled from 'styled-components'; // Unused

const AnimeBox = React.memo(({ data, opacity, refresh }) => {
	// useMemo will re-calculate the animation properties only when the data or opacity changes.
    // This is efficient and ensures we are working with the latest props when a re-render is triggered.
	const animeProp = useMemo(() => {
		const defaultProp = {
			easing: "easeInOutQuad",
			loop: 2,
			duration: 500,
			direction: "alternate",
			delay: 0,
			endDelay: 0,
			background: "rgba(0,0,0,1)"
		};

		// IMPORTANT: Create a copy of the data prop to avoid mutation.
		const light = { ...data };
		let alpha = 0;

		// Add a fallback for color to prevent errors.
		if (!light.color) {
			light.color = "0,0,0";
		}
		light.colorTemp = light.color;

		if ("alpha" in light) {
			alpha = light.alpha;
		}
		if (light.mode === "follow"){
			alpha = opacity;
		}

		if (!("background" in light)) {
			light.direction = light.mode === "blink" ? "alternate" : "normal";
			light.loop = light.mode === "light" ? light.loopTime : light.loopTime*2;
		}
		light.background = `rgba(${light.colorTemp},${alpha})`;

		// Combine with defaults, ensuring computed properties override defaults.
		return { ...defaultProp, ...light };
	}, [data, opacity]);

	const genRgbStyle = (colorStr, stiffness) => {
		// Fallback for invalid color string
		const bg = colorStr || 'rgba(0,0,0,0)';
	  	let bgColor = bg.substring(5, bg.length-1).split(",");
	  	const config = {stiffness: stiffness, damping: 30};
	  	return {
	  		style: {
		  		r: spring(parseFloat(bgColor[0]) || 0, config),
		  		g: spring(parseFloat(bgColor[1]) || 0, config),
		  		b: spring(parseFloat(bgColor[2]) || 0, config),
		  		a: spring(parseFloat(bgColor[3]) || 0, config),
		  	}
		  }
	};

	const rgbMotion = ({r, g, b, a}) => {
        return (
        	<div id="lightBox"
	          style={{
	            background:`rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`
	          }}>
          </div>);
    };

	const { style } = genRgbStyle(animeProp.background, animeProp.duration);

	const motion = (
		<Motion style={style}>
			{rgbMotion}
		</Motion>
	);

	// Using a key based on the refresh prop ensures that the Anime component
    // is re-mounted and the animation re-runs when a new effect is triggered.
	const anime = (
		<Anime key={refresh.toString()} {...animeProp}>
			<div id="lightBox"></div>
		</Anime>
	);

	return animeProp.mode === "blink" ? anime : motion;

}, (prevProps, nextProps) => {
    // This custom comparison function mimics the logic of shouldComponentUpdate.
    // It returns `true` if the props are considered "equal", preventing a re-render.

    // 1. If refresh is different, we need to re-render to start a new animation.
    if (prevProps.refresh !== nextProps.refresh) {
        return false; // Not equal
    }

    // 2. If mode is "follow", we also need to re-render when opacity changes.
    if (nextProps.data.mode === 'follow' && prevProps.opacity !== nextProps.opacity) {
        return false; // Not equal
    }

    // 3. In all other cases, the props are considered equal, so we skip the re-render.
    return true; // Equal
});

export default AnimeBox;