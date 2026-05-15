import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

function Card({ title, children, action }) {
  return (
    <div className="dash-card">
      <h4>{title}</h4>
      <div className="dash-card-body">{children}</div>
      {action ? <div className="dash-card-action">{action}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-root">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand-wrap">
          <div className="sidebar-brand">ATLAS</div>
          <div className="sidebar-sub">SYSTEM CORE</div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Analytics</button>
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

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-tabs">
            <span>Operations</span>
            <span className="active">Intelligence</span>
            <span>Nodes</span>
          </div>
          <div className="header-actions">
            <input className="search" placeholder="Search system..." />
            <a className="support-link" href="/">Support</a>
            <button className="btn-small">Deploy</button>
            <div className="avatar-chip">A</div>
          </div>
        </header>

        <section className="dashboard-hero">
          <h1>Welcome back, <span className="accent">Architect</span>.</h1>
          <p>Your neural processing nodes are operating at 98.4% efficiency. Ready to initialize a new hardware deployment?</p>
        </section>

        <section className="dashboard-top-cards">
          <Card title="Get a Recommendation" action={<button className="btn-primary" onClick={() => navigate('/wizard')}>Initialize AI</button>}>
            <p>Let our Neural Net analyze your workflow and generate a hardware configuration.</p>
          </Card>

          <Card title="PC Builder" action={<button className="btn-secondary" onClick={() => navigate('/builder')}>Open Architect</button>}>
            <p>Access the node library to manually construct high-performance systems.</p>
          </Card>

          <Card title="Compare Benchmarks" action={<button className="btn-secondary">View Intelligence</button>}>
            <p>Run head-to-head simulations to ensure maximum efficiency for your datasets.</p>
          </Card>
        </section>

        <section className="recent-builds">
          <div className="section-head">
            <h3>My Recent Builds</h3>
            <a href="/" className="section-link">VIEW ALL OPERATIONS</a>
          </div>
          <ul className="build-list">
            <li className="build-item">
              <div className="build-meta">Obsidian Core Alpha</div>
              <div className="build-value">PHP 142,500.00</div>
              <button className="build-open">Open</button>
            </li>
            <li className="build-item">
              <div className="build-meta">Neural Renderer V4</div>
              <div className="build-value">PHP 285,000.00</div>
              <button className="build-open">Open</button>
            </li>
            <li className="build-item">
              <div className="build-meta">Ghost Node SFF</div>
              <div className="build-value">PHP 89,200.00</div>
              <button className="build-open">Open</button>
            </li>
          </ul>
        </section>

        <button className="floating-action" onClick={() => navigate('/builder')} aria-label="Open builder">
          +
        </button>
      </main>
    </div>
  );
}
