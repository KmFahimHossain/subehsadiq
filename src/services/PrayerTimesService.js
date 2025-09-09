// src/services/PrayerTimesService.js
import axios from "axios";
const BASE_URL = "https://api.aladhan.com/v1/timings";

/**
 * Fetch daily prayer times from AlAdhan API
 * @param {number} lat - latitude
 * @param {number} lng - longitude
 * @param {number} method - calculation method (default 2 → ISNA)
 * @param {string} madhab - "Shafi" or "Hanafi" (affects Asr)
 */

export async function getPrayerTimes(lat, lng, method = 2, madhab = "Shafi") {
  try {
    const school = madhab === "Hanafi" ? 1 : 0;
    const response = await axios.get(BASE_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        method,
        school,
      },
    });
    if (response?.data?.data) return response.data.data; // { timings, date, meta }
    return null;
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return null;
  }
}

export function getTimePartsInZone(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: +map.hour,
    minute: +map.minute,
    second: +map.second,
  };
}

/** hh:mm → minutes since midnight */
export function minutesFromHHmm(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** minutes since midnight → "HH:mm" (24h) */
export function hhmmFromMinutes(mins) {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

/** Format a clock from time parts, respecting 12h/24h */
export function formatClockFromParts(
  parts,
  clockType = 24,
  withSeconds = false
) {
  if (!parts) return "—";
  const d = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    )
  );
  const opts = { hour: "2-digit", minute: "2-digit", hour12: clockType === 12 };
  if (withSeconds) opts.second = "2-digit";
  return new Intl.DateTimeFormat(undefined, {
    ...opts,
    timeZone: "UTC",
  }).format(d);
}

/** Format a "HH:mm" string into display time per clockType */
export function formatHHmmDisplay(hhmm, clockType = 24) {
  const mins = minutesFromHHmm(hhmm);
  if (mins === null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date(Date.UTC(2000, 0, 1, h, m, 0));
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: clockType === 12,
    timeZone: "UTC",
  }).format(d);
}

export function buildPrayerWindows(t) {
  const Fajr = minutesFromHHmm(t.Fajr);
  const Sunrise = minutesFromHHmm(t.Sunrise);
  const Dhuhr = minutesFromHHmm(t.Dhuhr);
  const Asr = minutesFromHHmm(t.Asr);
  const Maghrib = minutesFromHHmm(t.Maghrib);
  const Isha = minutesFromHHmm(t.Isha);
  const Midnight = minutesFromHHmm(t.Midnight); // ⬅️ got directly from API

  return {
    Fajr: { start: Fajr, end: Sunrise },
    Dhuhr: { start: Dhuhr, end: Asr },
    Asr: { start: Asr, end: Maghrib },
    Maghrib: { start: Maghrib, end: Isha },
    Isha: { start: Isha, end: Midnight }, // ✅ use API-provided Midnight
  };
}


export function getCurrentAndNextPrayerTZ(timeZone, timings) {
  if (!timings?.timings) return null;
  const t = timings.timings || timings; // allow both shapes
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  const windows = buildPrayerWindows(t);
  const slots = order
    .map((name, i) => {
      const w = windows[name];
      if (!w?.start || !w?.end) return null;
      return { name, startM: w.start, endM: w.end };
    })
    .filter(Boolean);

  const nowParts = getTimePartsInZone(timeZone);
  const nowM = nowParts.hour * 60 + nowParts.minute + nowParts.second / 60;

  const cur = slots.find((s) => nowM >= s.startM && nowM < s.endM) || null;
  let nxt = slots.find((s) => s.startM > nowM) || null;
  if (!nxt && slots.length) {
    // Wrap to next day Fajr
    const f = slots[0];
    nxt = { ...f, startM: f.startM + 24 * 60, endM: f.endM + 24 * 60 };
  }

  const toNextMin = nxt ? Math.max(0, Math.round(nxt.startM - nowM)) : null;
  const nextInText =
    toNextMin != null
      ? `${String(Math.floor(toNextMin / 60)).padStart(2, "0")}:${String(
          toNextMin % 60
        ).padStart(2, "0")}:00`
      : null;

  const currentEndsAt = cur ? hhmmFromMinutes(cur.endM) : null;

  return {
    currentName: cur?.name || null,
    nextName: nxt?.name || null,
    nextInText,
    currentEndsAt, // "HH:mm" (24h)
  };
}

export function computeProhibitedTimes(t) {
  if (!t) return [];
  const Fajr = minutesFromHHmm(t.Fajr);
  const Sunrise = minutesFromHHmm(t.Sunrise);
  const Dhuhr = minutesFromHHmm(t.Dhuhr);
  const Asr = minutesFromHHmm(t.Asr);
  const Maghrib = minutesFromHHmm(t.Maghrib);
  const ZAWAL_BUFFER = 5;

  const items = [
    {
      label: "After Fajr until Sunrise",
      startHHmm: hhmmFromMinutes(Fajr),
      endHHmm: hhmmFromMinutes(Sunrise),
      note: "Voluntary prayers are generally prohibited until the sun rises.",
    },
    {
      label: "At Zawāl (around zenith)",
      startHHmm: hhmmFromMinutes(Dhuhr - ZAWAL_BUFFER),
      endHHmm: hhmmFromMinutes(Dhuhr),
      note: "A very short time just before Dhuhr begins.",
    },
    {
      label: "After Asr until Maghrib",
      startHHmm: hhmmFromMinutes(Asr),
      endHHmm: hhmmFromMinutes(Maghrib),
      note: "Voluntary prayers are generally prohibited until sunset.",
    },
  ];
  return items;
}
