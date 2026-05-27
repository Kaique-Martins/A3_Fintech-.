import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const getColor = (v) => {
    if (v >= 80)
        return '#10b981';
    if (v >= 60)
        return '#f59e0b';
    return '#ef4444';
};
export const CircularGauge = ({ value, label, size = 110 }) => {
    const [animated, setAnimated] = useState(0);
    useEffect(() => {
        setAnimated(0);
        const timeout = setTimeout(() => setAnimated(value), 50);
        return () => clearTimeout(timeout);
    }, [value]);
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animated / 100) * circumference;
    const color = getColor(value);
    const center = size / 2;
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }, children: [_jsxs("svg", { width: size, height: size, style: { transform: 'rotate(-90deg)' }, children: [_jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: "#e5e7eb", strokeWidth: "8" }), _jsx("circle", { cx: center, cy: center, r: radius, fill: "none", stroke: color, strokeWidth: "8", strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: offset, style: { transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' } }), _jsxs("text", { x: center, y: center + 1, textAnchor: "middle", dominantBaseline: "middle", style: {
                            transform: `rotate(90deg) translate(0, 0)`,
                            transformOrigin: `${center}px ${center}px`,
                            fill: color,
                            fontSize: size > 100 ? '1.4rem' : '1.1rem',
                            fontWeight: 800,
                            fontFamily: 'inherit',
                        }, children: [value, "%"] })] }), _jsx("span", { style: { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }, children: label })] }));
};
