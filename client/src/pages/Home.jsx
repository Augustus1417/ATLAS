import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="home-hero">
        <div className="hero-content">
          <h1>ATLAS <span className="accent">PC</span></h1>
          <p className="hero-subtitle">
            Precision engineering meets AI intelligence. Build your dream machine with absolute confidence.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-builder" onClick={() => navigate('/builder')}>
              Enter 3D Builder
            </button>
            <button className="btn-secondary" onClick={() => navigate('/parts')}>
              View PC Parts
            </button>
          </div>
        </div>
      </header>

      <section className="features-grid">
        <div className="feature-card">
          <h3>AI Powered</h3>
          <p>Get hardware suggestions tailored to your specific workload and budget.</p>
        </div>
        <div className="feature-card">
          <h3>3D Visualization</h3>
          <p>See exactly how your parts fit together before you spend a single cent.</p>
        </div>
        <div className="feature-card">
          <h3>Guaranteed Compatibility</h3>
          <p>Our engine cross-references thousands of rules to ensure a perfect boot every time.</p>
        </div>
      </section>
    </div>
  );
}
