import { useEffect, useState, useCallback } from "react";
import "./theme.css";
import Header from "./components/Header.jsx";
import DrawerDashboard from "./components/DrawerDashboard.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefs, setPrefs] = useState({
    mazhab: "Shafi",
    clockType: 24,
  });
  const [location, setLocation] = useState(null);

  // Load saved location from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("userLocation");
    if (saved) setLocation(JSON.parse(saved));
  }, []);

  const handleLocationSelect = (loc) => {
    setLocation(loc);
    localStorage.setItem("userLocation", JSON.stringify(loc));
  };

  const applyChange = useCallback((next) => {
    setPrefs((prev) => ({ ...prev, ...next }));
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
      }}
    >
      <Header onOpenDashboard={() => setDrawerOpen((prev) => !prev)} />

      {/* Main content */}
      <Home
        location={location}
        mazhab={prefs.mazhab}
        clockType={prefs.clockType}
      />

      <Footer />

      {/* Drawer with settings */}
      <DrawerDashboard
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mazhab={prefs.mazhab}
        clockType={prefs.clockType}
        onChange={applyChange}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}
