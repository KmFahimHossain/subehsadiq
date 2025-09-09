function Header({ onOpenDashboard }) {
  return (
    <header className="appbar">
      <div
        className="brand"
        style={{ cursor: "pointer" }}
        onClick={() => window.location.reload()}
      >
        <img src="/logo.png" alt="App logo" className="brand-logo" />
        <span className="brand-title">Subeh Sadiq</span>
      </div>

      <button className="btn-dashboard" onClick={onOpenDashboard}>
        ☰ Dashboard
      </button>
    </header>
  );
}
export default Header;
