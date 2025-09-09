// src/components/AnalogClock.jsx
import "./AnalogClock.css";

export default function AnalogClock({ date, size = 260 }) {
  const zoned = date instanceof Date ? date : new Date();

  const h = zoned.getHours();
  const m = zoned.getMinutes();
  const s = zoned.getSeconds();

  // angles (always 12h face)
  const hourDeg = ((h % 12) + m / 60 + s / 3600) * 30;
  const minuteDeg = (m + s / 60) * 6;
  const secondDeg = s * 6;

  // geometry
  const pad = 26;
  const full = size + pad * 2;
  const r = size / 2;
  const cx = pad + r;
  const cy = pad + r;

  // hand lengths
  const hourLen = r * 0.55;
  const minuteLen = r * 0.78;
  const secondLen = r * 0.9;

  // ticks + numbers (always 12 numbers)
  const hourTicks = Array.from({ length: 12 }, (_, i) => {
    const deg = (i / 12) * 360;
    const rad = (Math.PI * deg) / 180;

    const inner = r - 14;
    const outer = r;
    const x1 = cx + inner * Math.sin(rad);
    const y1 = cy - inner * Math.cos(rad);
    const x2 = cx + outer * Math.sin(rad);
    const y2 = cy - outer * Math.cos(rad);

    const label = i === 0 ? 12 : i;
    const tx = cx + (r + 16) * Math.sin(rad);
    const ty = cy - (r + 16) * Math.cos(rad);

    // Bigger labels for 12, 3, 6, 9
    const extraClass = [0, 3, 6, 9].includes(i) ? "big-label" : "";

    return (
      <g key={`h-${i}`}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} className="tick hour" />
        <text
          x={tx}
          y={ty + 4}
          textAnchor="middle"
          className={`hour-label ${extraClass}`}
        >
          {label}
        </text>
      </g>
    );
  });

  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const deg = i * 6;
    const rad = (Math.PI * deg) / 180;

    const isMajor = i % 5 === 0;
    const inner = r - (isMajor ? 10 : 6);
    const outer = r;

    const x1 = cx + inner * Math.sin(rad);
    const y1 = cy - inner * Math.cos(rad);
    const x2 = cx + outer * Math.sin(rad);
    const y2 = cy - outer * Math.cos(rad);

    return (
      <line
        key={`m-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={`tick ${isMajor ? "hour" : "minute"}`}
      />
    );
  });

  const toXY = (deg, len) => {
    const rad = (Math.PI * deg) / 180;
    return [cx + len * Math.sin(rad), cy - len * Math.cos(rad)];
  };
  const [hx, hy] = toXY(hourDeg, hourLen);
  const [mx, my] = toXY(minuteDeg, minuteLen);
  const [sx, sy] = toXY(secondDeg, secondLen);

  return (
    <div className="analog-clock" style={{ width: full, height: full }}>
      <svg width={full} height={full}>
        <circle cx={cx} cy={cy} r={r} className="clock-ring" />
        {minuteTicks}
        {hourTicks}
        <line x1={cx} y1={cy} x2={hx} y2={hy} className="hand-hour" />
        <line x1={cx} y1={cy} x2={mx} y2={my} className="hand-minute" />
        <line x1={cx} y1={cy} x2={sx} y2={sy} className="hand-second" />
        <circle cx={cx} cy={cy} r="6" className="center-dot" />
      </svg>
    </div>
  );
}
