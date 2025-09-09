import Settings from "./Settings.jsx";

export default function DrawerDashboard({
  open,
  onClose,
  onLocationSelect,
  mazhab,
  onChange,
  clockType,
}) {
  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose}></div>

      {/* Slide-in panel */}
      <div className="drawer-panel">
        <div className="drawer-header">
          <h2 className="drawer-title">Settings</h2>
          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <Settings
            madhab={mazhab}
            onMadhabChange={(val) => onChange({ mazhab: val })}
            clockType={clockType}
            onClockTypeChange={(val) => onChange({ clockType: val })}
            onLocationSelect={onLocationSelect}
          />
        </div>
      </div>
    </div>
  );
}
