import React from 'react';
import '../styles/builder.css';

function Field({ label, placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input placeholder={placeholder} />
    </div>
  );
}

export default function CoreModule() {
  return (
    <div className="core-root">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand-wrap">
          <div className="sidebar-brand">ATLAS</div>
          <div className="sidebar-sub">SYSTEM CORE</div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item">Dashboard</button>
          <button className="nav-item active">Analytics</button>
          <button className="nav-item">System Health</button>
          <button className="nav-item">Neural Net</button>
          <button className="nav-item">Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="upgrade-node">UPGRADE NODE</button>
          <a href="/" className="sidebar-link">Documentation</a>
          <a href="/" className="sidebar-link">Log Out</a>
        </div>
      </aside>

      <main className="core-main">
        <header className="dashboard-topbar">
          <div className="dashboard-tabs">
            <span>Operations</span>
            <span className="active">Intelligence</span>
            <span>Nodes</span>
          </div>
          <div className="header-actions">
            <span className="support-link">Support</span>
            <button className="btn-small">DEPLOY</button>
            <div className="avatar-chip">A</div>
          </div>
        </header>

        <div className="core-grid">
          <section className="core-form">
            <div className="core-header-block">
              <h2>PC Builder Core</h2>
              <div className="module-pills">
                <span>MODULE: ALPHA-9</span>
                <span>STATUS: LIVE</span>
              </div>
            </div>

            <Field label="Central Processing Unit" placeholder="Search CPU models (e.g. Intel i9, Ryzen 9)..." />
            <Field label="Graphics Accelerator" placeholder="Select Graphics Card" />
            <Field label="Main Logic Board" placeholder="Select Motherboard Chipset..." />

            <div className="row">
              <Field label="Memory (RAM)" placeholder="Select Capacity" />
              <Field label="NVMe Storage" placeholder="Select Drive" />
            </div>

            <Field label="Power Delivery (PSU)" placeholder="Select PSU Capacity" />
          </section>

          <aside className="core-side">
            <div className="visual-card">
              <div>
                <p className="visual-kicker">LIVE VISUALIZATION</p>
                <h3>ACTIVE CORE BUILD</h3>
              </div>
            </div>

            <div className="neural-summary">
              <h4>Neural Summary</h4>
              <ul>
                <li><span>Processor Unit</span><strong>Core i9-14900K</strong></li>
                <li><span>Graphics Core</span><strong>RTX 4090 OC Edition</strong></li>
                <li><span>Memory Matrix</span><strong>64GB DDR5 (2x32)</strong></li>
                <li><span>Power Matrix</span><strong>1200W Titanium</strong></li>
              </ul>
              <div className="compat">COMPATIBILITY: <strong>VALIDATED</strong></div>
              <div className="efficiency-note">All components are electronically compatible.</div>
            </div>

            <div className="summary-warning">EFFICIENCY NOTE <span>PSU overhead is minimal for this load.</span></div>

            <div className="core-footer-card">
              <div>
                <span className="footer-label">TOTAL ESTIMATED COST</span>
                <div className="price">$4,299.00</div>
              </div>
              <div className="power-draw">
                <span className="footer-label">EST. POWER DRAW</span>
                <strong>845W</strong>
              </div>
            </div>

            <div className="core-actions">
              <button className="btn-secondary-auth">CLEAR BUILD</button>
              <button className="btn-authorize">SAVE BUILD</button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
