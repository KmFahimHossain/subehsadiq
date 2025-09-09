// src/components/Settings.jsx
import { useState } from "react";
import axios from "axios";

const LOCATIONIQ_KEY = "pk.8660570fd4c14401bb19669c575659f9";

export default function Settings({
  onLocationSelect,
  madhab,
  onMadhabChange,
  clockType,
  onClockTypeChange,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search city using LocationIQ
  const searchCity = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get("https://us1.locationiq.com/v1/search", {
        params: {
          key: LOCATIONIQ_KEY,
          q: query,
          format: "json",
          limit: 6,
        },
      });
      setResults(res.data || []);
    } catch (err) {
      console.error("City search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Select a location from results
  const selectPlace = (place) => {
    const loc = {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      displayName: place.display_name,
    };
    localStorage.setItem("userLocation", JSON.stringify(loc));
    onLocationSelect?.(loc);
    setResults([]);
    setQuery("");
  };

  // Use device geolocation
  const useDevice = async () => {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      const loc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        displayName: "Device location",
      };
      localStorage.setItem("userLocation", JSON.stringify(loc));
      onLocationSelect?.(loc);
    } catch (e) {
      alert("Could not get device location");
    }
  };

  // Clear saved location
  const clearSaved = () => {
    localStorage.removeItem("userLocation");
    onLocationSelect?.(null);
  };

  return (
    <div className="settings">
      {/* Preferences */}
      <section className="settings-section">
        <h3 className="settings-title">Preferences</h3>
        <div className="settings-field">
          <label>Madhab</label>
          <select
            value={madhab}
            onChange={(e) => onMadhabChange(e.target.value)}
          >
            <option value="Shafi">Shafi</option>
            <option value="Hanafi">Hanafi</option>
          </select>
        </div>

        <div className="settings-field">
          <label>Time Format</label>
          <select
            value={clockType}
            onChange={(e) => onClockTypeChange(parseInt(e.target.value))}
          >
            <option value={12}>12-hour</option>
            <option value={24}>24-hour</option>
          </select>
        </div>
      </section>

      {/* Location */}
      <section className="settings-section">
        <h3 className="settings-title">Location Options</h3>
        <div className="settings-buttons">
          <button onClick={useDevice}>Use Device Location</button>
          <button onClick={clearSaved}>Clear Saved</button>
        </div>

        {/* Search */}
        <form onSubmit={searchCity} className="settings-form">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Ullapara"
            className="settings-input"
          />
          <button type="submit" className="settings-search-btn">
            Search City
          </button>
        </form>

        {loading && <div>Searching…</div>}

        <ul className="results-list">
          {results.map((p, i) => (
            <li key={i} onClick={() => selectPlace(p)}>
              {p.display_name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
