// src/pages/Home.jsx  (replace your current Home.jsx with this)
import { useEffect, useState } from "react";
import PrayerClocksGroup from "../components/PrayerClocksGroup.jsx";
import {
  getPrayerTimes,
  getTimePartsInZone,
  getCurrentAndNextPrayerTZ,
  formatClockFromParts,
  formatHHmmDisplay,
  computeProhibitedTimes,
} from "../services/PrayerTimesService.js";

function formatNextIn(nextInText) {
  if (!nextInText.includes(":")) return nextInText;
  const [hh, mm, ss] = nextInText.split(":").map(Number);
  if (hh > 0) return `${hh}h ${mm}m`;
  if (mm > 0) return `${mm} mins`;
  return `${ss} sec`;
}

function prettify(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^Imsak$/i, "Imsak (Pre-Fajr)")
    .replace(/^Midnight$/i, "Midnight (Half Night)")
    .replace(/^Firstthird$/i, "First Third of Night")
    .replace(/^Lastthird$/i, "Last Third of Night");
}

export default function Home({ location, mazhab, clockType }) {
  const [timings, setTimings] = useState(null);
  const [timeZone, setTimeZone] = useState(null);
  const [nowParts, setNowParts] = useState(null);
  const [prayerStatus, setPrayerStatus] = useState(null);
  const [prohibited, setProhibited] = useState([]);

  // background state (4 images)
  const [bgImage, setBgImage] = useState("/1.png");

  // fetch prayer times when location/mazhab changes
  useEffect(() => {
    if (!location) return;
    (async () => {
      const data = await getPrayerTimes(location.lat, location.lng, 2, mazhab);
      if (data) {
        setTimings(data.timings);
        setTimeZone(data.meta.timezone);
        setProhibited(computeProhibitedTimes(data.timings));
      }
    })();
  }, [location, mazhab]);

  // ticking for current status (uses timezone-aware helper)
  useEffect(() => {
    if (!timeZone || !timings) return;
    const tick = () => {
      const parts = getTimePartsInZone(timeZone);
      setNowParts(parts);
      setPrayerStatus(getCurrentAndNextPrayerTZ(timeZone, { timings }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone, timings]);

  // -------------------------
  // BACKGROUND SELECTION (fixed)
  // -------------------------
  // - Uses time in the target timezone (if available) so background reflects location
  // - Re-runs when location or timeZone changes (so switching location updates immediately)
  // - Polls every minute to keep it in sync
  useEffect(() => {
    const pickBgForHour = (hour) => {
      if (hour >= 0 && hour < 6) return "/1.png"; // night
      if (hour >= 6 && hour < 12) return "/2.png"; // morning
      if (hour >= 12 && hour < 18) return "/3.png"; // afternoon
      return "/4.png"; // evening
    };

    const getHourForZone = (tz) => {
      try {
        if (tz) {
          // create a Date object in the requested timezone by converting the localized string
          const local = new Date().toLocaleString("en-US", { timeZone: tz });
          const zoned = new Date(local);
          return zoned.getHours();
        } else {
          return new Date().getHours();
        }
      } catch (err) {
        // fallback to system hour
        return new Date().getHours();
      }
    };

    const updateBg = () => {
      const hour = getHourForZone(timeZone);
      const bg = pickBgForHour(hour);
      setBgImage(bg);
    };

    // update immediately (this makes location/timezone changes reflect at once)
    updateBg();

    // and keep it updated once a minute
    const id = setInterval(updateBg, 60 * 1000);
    return () => clearInterval(id);
  }, [location, timeZone]); // re-run on location or timezone changes

  const fmt = (hhmm) => formatHHmmDisplay(hhmm, clockType);

  // main style uses the bgImage state and keeps layout from .home-bg
  const mainStyle = {
    backgroundImage: `url(${bgImage})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center center",
    backgroundAttachment: "fixed",
    backgroundSize: "cover", // use 'contain' if you don't want cropping/zoom
    minHeight: "100vh",
    transition: "background-image 0.6s ease-in-out",
  };

  if (!location) {
    return (
      <main className="main-content home-bg" style={mainStyle}>
        <div className="card glass">
          <h2>Please select a location from Dashboard → Settings</h2>
        </div>
      </main>
    );
  }

  if (!timings || !timeZone || !nowParts) {
    return (
      <main className="main-content home-bg" style={mainStyle}>
        <div className="card glass">
          <h2>Loading prayer times…</h2>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content home-bg" style={mainStyle}>
      {/* Clocks */}
      <div className="card glass clocks-card">
        <PrayerClocksGroup
          clockType={clockType}
          mazhab={mazhab}
          timings={timings}
          timeZone={timeZone}
        />
      </div>

      {/* Cards grid */}
      <div className="grid-cards">
        {/* 1. Current info */}
        <div className="card glass">
          <h3 className="card-title">Current Status</h3>
          <div className="info-row">
            <div>
              <b>Current Time:</b>{" "}
              {formatClockFromParts(nowParts, clockType, true)}
            </div>
            <div>
              <b>Current Prayer:</b> {prayerStatus?.currentName || "—"}
              {prayerStatus?.currentEndsAt && (
                <>
                  {" "}
                  <span style={{ marginLeft: 12 }}>
                    <b>Ends at:</b> {fmt(prayerStatus.currentEndsAt)}
                  </span>
                </>
              )}
            </div>
            <div>
              <b>Next Prayer:</b> {prayerStatus?.nextName || "—"}
              {prayerStatus?.nextInText && (
                <span> (in {formatNextIn(prayerStatus.nextInText)})</span>
              )}
            </div>
            <div>
              <b>Location:</b> {location.displayName}
            </div>
          </div>
        </div>

        {/* 2. Hadith */}
        <div className="card glass">
          <h3 className="card-title">
            📖 Virtue of Praying at Its Earliest Time
          </h3>
          <p>
            The Messenger of Allah ﷺ was asked:{" "}
            <i>“Which deed is most beloved to Allah?”</i> <br />
            He replied: <b>“Prayer at its proper (earliest) time.”</b>{" "}
            (Tirmidhi, Sahih) <br />
            Performing Salah at its earliest time shows eagerness to obey Allah
            ﷻ and brings great virtue. <br />
            It reflects putting worship before worldly matters. <br />
            <b>Note:</b> Delaying <b>Isha</b> (until the first third of the
            night) may be recommended if not difficult, <br />
            and <b>Dhuhr</b> may be delayed in extreme heat.
          </p>
        </div>

        {/* 3. Forbidden times */}
        <div className="card glass">
          <h3 className="card-title">
            🚫 Forbidden Times for Voluntary Prayer
          </h3>
          <p>
            The Prophet ﷺ forbade prayer at three specific times of the day:{" "}
            <br />
            <br />
            <b>1. After Fajr until sunrise:</b> From praying Fajr until the sun
            has fully risen above the horizon. <br />
            <b>2. At zenith:</b> When the sun is directly overhead, just before
            Dhuhr enters. <br />
            <b>3. After Asr until sunset:</b> From praying Asr until the sun has
            fully set. <br />
            <br />
            <b>Ruling:</b> During these periods, voluntary (nafl) prayers are
            not allowed. However, obligatory prayers (e.g. if Fajr or Asr was
            missed) must still be performed. <br />
            <b>Scholars:</b> This ruling is agreed upon in the four madhhabs,
            with slight differences in details (e.g. some allow Qada’ of missed
            Sunnah). <br />
            <br />
            <b>Note:</b> The times shown below are calculated for your location
            based on astronomical sunrise, zenith, and sunset today.
          </p>

          <ul>
            {prohibited.map((p, i) => (
              <li key={i}>
                {p.label}: {fmt(p.startHHmm)} → {fmt(p.endHHmm)}
                <div className="label">{p.note}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* 4. Simple timetable */}
        <div className="card glass">
          <h3 className="card-title">📅 Table View</h3>
          <table className="time-table">
            <tbody>
              {Object.entries(timings).map(([name, value], idx) => (
                <tr key={idx}>
                  <td>
                    <b>{prettify(name)}</b>
                  </td>
                  <td>{fmt(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. How calculated */}
        <div className="card glass">
          <h3 className="card-title">🧾 Calculation Method of Prayer Times</h3>
          <p>
            The five daily prayers are determined by the movement of the sun,
            based on Qur’an, Sunnah, and the agreement of scholars. <br />
            <b>Fajr:</b> Begins at true dawn (<i>al-fajr al-sadiq</i>, when a
            horizontal light appears in the horizon) and ends at sunrise. <br />
            <b>Dhuhr:</b> Begins just after solar zenith (when the sun passes
            its highest point) and continues until Asr. <br />
            <b>Asr:</b> Begins when an object's shadow equals its length (Shafi,
            Maliki, Hanbali) or twice its length (Hanafi), and ends at sunset.{" "}
            <br />
            <b>Maghrib:</b> Begins immediately after sunset and continues until
            the red twilight disappears. <br />
            <b>Isha:</b> Begins when twilight vanishes. It is preferred to pray
            before midnight, though valid until Fajr. <br />
            Note: These timings follow the rulings of global fiqh councils. The
            calculations here use astronomical data via the <b>
              Aladhan API
            </b>{" "}
            combined with your selected madhab and location.
          </p>
        </div>
      </div>
    </main>
  );
}
