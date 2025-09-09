// src/components/PrayerClocksGroup.jsx
import { useState, useEffect } from "react";
import AnalogClock from "./AnalogClock.jsx";

function getTimeInZone(date, timeZone) {
  const str = date.toLocaleString("en-US", { timeZone });
  return new Date(str);
}

function PrayerClocksGroup({ clockType = 12, timings, timeZone }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayers, setPrayers] = useState([]);

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Parse "HH:MM" safely
  const parseTimeSafe = (hhmm) => {
    try {
      if (!hhmm || typeof hhmm !== "string") return null;
      const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    } catch {
      return null;
    }
  };

  // Build intervals when timings/timeZone change
  useEffect(() => {
    if (!timings) return;

    const fajr = parseTimeSafe(timings.Fajr);
    const sunrise = parseTimeSafe(timings.Sunrise);
    const dhuhr = parseTimeSafe(timings.Dhuhr);
    const asr = parseTimeSafe(timings.Asr);
    const maghrib = parseTimeSafe(timings.Maghrib);
    const isha = parseTimeSafe(timings.Isha);
    const midnight = parseTimeSafe(timings.Midnight);

    if (!fajr || !sunrise || !dhuhr || !asr || !maghrib || !isha || !midnight) {
      setPrayers([]);
      return;
    }

    setPrayers([
      { name: "Fajr", start: fajr, end: sunrise, color: "#f78a54" },
      { name: "Dhuhr", start: dhuhr, end: asr, color: "#ffd369" },
      { name: "Asr", start: asr, end: maghrib, color: "#1a937d" },
      { name: "Maghrib", start: maghrib, end: isha, color: "#94c9b0" },
      { name: "Isha", start: isha, end: midnight, color: "#1d9fabff" },
    ]);
  }, [timings, timeZone]);

  // Helpers
  const timeToDeg = (time, format = 12) => {
    if (!(time instanceof Date) || isNaN(time)) return 0;
    const h = time.getHours(),
      m = time.getMinutes(),
      s = time.getSeconds();
    return format === 12
      ? (h % 12) * 30 + m * 0.5 + (s * 0.5) / 60
      : (h / 24) * 360 + (m / 1440) * 360 + (s / 86400) * 360;
  };

  const formatTimeLabel = (date, hour12 = true, showAmPm = true) => {
    if (!(date instanceof Date) || isNaN(date)) return "--:--";
    let str = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    });
    return hour12 && !showAmPm ? str.replace(/\s?[AP]M$/i, "") : str;
  };

  const clipInterval = (p, startH, endH) => {
    const ws = new Date(p.start);
    ws.setHours(startH, 0, 0, 0);
    const we = new Date(p.start);
    we.setHours(endH, 0, 0, 0);

    // normal case
    let s = p.start < ws ? ws : p.start;
    let e = p.end > we ? we : p.end;

    // 🚨 handle wrap-around (e.g., Isha 20:15 → 01:00 next day)
    if (p.end <= p.start) {
      const firstPart = {
        ...p,
        start: s,
        end: we,
        originalStart: p.start,
        split: true,
      };
      const secondPart = {
        ...p,
        start: ws,
        end: p.end,
        originalStart: p.start,
        split: true,
      };
      return [firstPart, secondPart].filter((x) => x.start < x.end);
    }

    return e <= s ? null : { ...p, start: s, end: e, originalStart: p.start };
  };

  const amPrayers = prayers
    .flatMap((p) => clipInterval(p, 0, 12) || [])
    .filter(Boolean);

  const pmPrayers = prayers
    .flatMap((p) => clipInterval(p, 12, 24) || [])
    .filter(Boolean);

  const ArcClock = ({
    intervals,
    format = 12,
    size = 280,
    label,
    showHand,
  }) => {
    // defensive early returns
    if (!Array.isArray(intervals)) {
      return (
        <div className="arc-placeholder">
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div className="label">No intervals to display</div>
        </div>
      );
    }

    // compute geometry safely
    const r = Math.max(40, size / 2 - 25);
    const center = { x: size / 2, y: size / 2 };

    // safe deg for now
    const zonedNow = getTimeInZone(currentTime, timeZone);
    const degNow = timeToDeg(zonedNow, format);
    const xNow = r * Math.sin((Math.PI * degNow) / 180);
    const yNow = -r * Math.cos((Math.PI * degNow) / 180);

    // Prepare SVG children in try/catch so we don't crash render
    let arcElements = [];
    try {
      arcElements = intervals.map((p, i) => {
        if (!p || !(p.start instanceof Date) || !(p.end instanceof Date))
          return null;

        let startDeg = timeToDeg(p.start, format);
        let endDeg = timeToDeg(p.end, format);
        let sweep = endDeg - startDeg;
        if (sweep <= 0) sweep += 360;
        const largeArc = sweep > 180 ? 1 : 0;

        const x1 = center.x + r * Math.sin((Math.PI * startDeg) / 180);
        const y1 = center.y - r * Math.cos((Math.PI * startDeg) / 180);
        const x2 = center.x + r * Math.sin((Math.PI * endDeg) / 180);
        const y2 = center.y - r * Math.cos((Math.PI * endDeg) / 180);

        const midDeg = (startDeg + sweep / 2) % 360;
        const xm = center.x + r * 1.10 * Math.sin((Math.PI * midDeg) / 180);
        const ym = center.y - r * 1.10 * Math.cos((Math.PI * midDeg) / 180);

        const sx = center.x + r * 1.15 * Math.sin((Math.PI * startDeg) / 180);
        const sy = center.y - r * 1.15 * Math.cos((Math.PI * startDeg) / 180);
        const ex = center.x + r * 1.15 * Math.sin((Math.PI * endDeg) / 180);
        const ey = center.y - r * 1.15 * Math.cos((Math.PI * endDeg) / 180);

        return (
          <g key={i}>
            <path
              d={`M ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2}`}
              stroke={p.color || "#999"}
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
            />
            {/* name inside arc (white) */}
            <text
              x={xm}
              y={ym}
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
              fill="white"
            >
              {p.name}
            </text>
            // START label
            {(format === 24 ||
              (format === 12 &&
                // fully inside AM → show start
                ((p.start.getHours() < 12 && p.end.getHours() < 12) ||
                  // crosses AM → PM → AM shows start (skip if start is 12)
                  (p.start.getHours() < 12 &&
                    p.end.getHours() >= 12 &&
                    p.start.getHours() !== 12) ||
                  // starts exactly at 12 → only show if it's the ORIGINAL prayer start
                  // START label
                  (p.start.getHours() === 12 &&
                    p.originalStart?.getHours() === 12 &&
                    !p.split)))) && (
              <text
                x={sx}
                y={sy}
                fontSize="10"
                textAnchor="middle"
                fill={p.color}
              >
                {formatTimeLabel(p.start, format === 12, false)}
              </text>
            )}
            // END label (show only where it belongs)
            {(format === 24 ||
              (format === 12 &&
                // fully inside AM → show end
                ((p.start.getHours() < 12 && p.end.getHours() < 12) ||
                  // fully inside PM → show end
                  (p.start.getHours() >= 12 && p.end.getHours() >= 12) ||
                  // crosses AM → PM → PM shows end (but skip if end is exactly 12:00)
                  // crosses AM → PM → PM shows end (but skip if end is exactly 12:00 or a split)
                  (p.start.getHours() < 12 &&
                    p.end.getHours() >= 12 &&
                    p.end.getHours() !== 12 &&
                    !p.split)))) && (
              <text
                x={ex}
                y={ey}
                fontSize="10"
                textAnchor="middle"
                fill={p.color}
              >
                {formatTimeLabel(p.end, format === 12, false)}
              </text>
            )}
          </g>
        );
      });
    } catch (err) {
      console.error("ArcClock rendering error:", err);
      // fallback UI if something unexpected happens
      arcElements = [
        <text
          key="err"
          x={center.x}
          y={center.y}
          fontSize="12"
          textAnchor="middle"
          fill="#c33"
        >
          Render error
        </text>,
      ];
    }

    // find color for hand (if inside an interval)
    const activeClip = intervals.find(
      (p) =>
        p && p.start instanceof Date && zonedNow >= p.start && zonedNow < p.end
    );
    const handColor = activeClip ? activeClip.color : "#222";

    return (
      <div style={{ textAlign: "center" }}>
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          <g>
            <circle
              cx={center.x}
              cy={center.y}
              r={r}
              stroke="#ccc"
              strokeWidth="3"
              fill="#ffffff"
            />
            {/* hour numbers inside circle (1..12) */}
            {/* hour numbers inside circle */}
            {(format === 12
              ? Array.from({ length: 12 })
              : Array.from({ length: 24 })
            ).map((_, i) => {
              const total = format === 12 ? 12 : 24;
              const deg = (i / total) * 360;
              const rad = (Math.PI * deg) / 180;
              const nx = center.x + (r - 15) * Math.sin(rad);
              const ny = center.y - (r - 15) * Math.cos(rad);

              return (
                <text
                  key={i}
                  x={nx}
                  y={ny + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#0b0b0b"
                >
                  {format === 12 ? (i === 0 ? 12 : i) : i}
                </text>
              );
            })}
            {/* arcs */}
            {arcElements}
            {/* current time hand */}
            {showHand &&
              ((format === 12 &&
                label === "AM Clock" &&
                zonedNow.getHours() < 12) ||
                (format === 12 &&
                  label === "PM Clock" &&
                  zonedNow.getHours() >= 12) ||
                format === 24) && (
                <>
                  {/* hand only in active clock */}
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={center.x + xNow * 0.8}
                    y2={center.y + yNow * 0.8}
                    stroke={handColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              )}
            {/* pivot circle always visible */}
            <circle cx={center.x} cy={center.y} r="6" fill={handColor} />
            <text
              x={center.x}
              y={center.y - 25} // slight vertical adjust
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#000"
            >
              {label}
            </text>
          </g>
        </svg>
      </div>
    );
  };

  if (!prayers.length) {
    return <div className="label">No prayer schedule available.</div>;
  }

  return (
    <div
      className="prayer-clocks-group"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: "100vh",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      {/* Always single analog clock (1–12) */}
      <AnalogClock
        size={320}
        clockType={12}
        date={getTimeInZone(currentTime, timeZone)}
      />

      <div
        style={{
          marginTop: "0.75rem",
          fontSize: "1.5rem",
          fontWeight: 600,
        }}
      >
        {getTimeInZone(currentTime, timeZone).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: clockType === 12,
        })}
      </div>

      {/* ArcClocks depending on format */}
      {clockType === 12 ? (
        <div
          className="two-clocks"
          style={{
            display: "grid",
            gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 1fr", // ✅ responsive
            gap: "2rem",
            marginTop: "2rem",
            width: "100%",
            maxWidth: "1400px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ArcClock
              intervals={amPrayers}
              format={12}
              size={Math.min(window.innerWidth * 0.6, 450)} // bigger on mobile
              label="AM Clock"
              showHand
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ArcClock
              intervals={pmPrayers}
              format={12}
              size={Math.min(window.innerWidth * 0.6, 450)}
              label="PM Clock"
              showHand
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: "3rem",
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <ArcClock
            intervals={prayers}
            format={24}
            size={Math.min(window.innerWidth * 0.5, 600)}
            label="24h Clock"
            showHand
          />
        </div>
      )}
    </div>
  );
}
export default PrayerClocksGroup;
