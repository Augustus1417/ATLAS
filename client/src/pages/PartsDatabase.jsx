import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { atlasApi } from '../services/atlasApi';
import '../styles/parts-db.css';

export default function PartsDatabase() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [budget, setBudget] = useState('');
  const [currentSpecs, setCurrentSpecs] = useState({ cpu: '', gpu: '', ram: '', storage: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchParts() {
      try {
        setLoading(true);
        setError('');
        
        // Use the robust builder API that has fallback support
        const res = await atlasApi.getPartsFlat();
        
        if (res && Array.isArray(res)) {
          setParts(res);
          console.log('Fetched parts from API:', res.length, 'parts');
        } else {
          setError('No parts returned from API');
          setParts([]);
        }
      } catch (e) {
        console.error('Failed to fetch parts database:', e);
        setError(`Failed to load parts: ${e.message}`);
        setParts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchParts();
  }, []);

  // Helper to require auth for actions that need it (builder, dashboard)
  function requireAuth(target) {
    const token = window.localStorage.getItem('atlas_token');
    if (!token) {
      navigate(`/auth?mode=login&next=${encodeURIComponent(target)}`, { replace: true });
      return false;
    }
    navigate(target);
    return true;
  }

  const availableCategories = useMemo(() => [...new Set(parts.map((part) => part.category).filter(Boolean))], [parts]);
  const CATEGORY_OPTIONS = ['All', 'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling', 'Accessories'];
  const categoryCounts = useMemo(() => {
    return parts.reduce((accumulator, part) => {
      const key = part.category || 'Uncategorized';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
  }, [parts]);

  const filteredParts = parts.filter((part) => {
    const matchesSearch = part.name.toLowerCase().includes(search.toLowerCase()) || String(part.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All' || !category || part.category === category;
    return matchesSearch && matchesCat;
  });

  const quickFacts = [
    { label: 'Current CPU', value: currentSpecs.cpu || 'Not set' },
    { label: 'Current GPU', value: currentSpecs.gpu || 'Not set' },
    { label: 'Current RAM', value: currentSpecs.ram || 'Not set' },
    { label: 'Current Storage', value: currentSpecs.storage || 'Not set' },
  ];

  const [showQuickFacts, setShowQuickFacts] = useState(true);
  const [showCurrentSpecs, setShowCurrentSpecs] = useState(true);

  return (
    <div className="parts-shell">
      <header className="parts-hero">
        <div>
          <p className="parts-kicker">ATLAS COMPONENT LAB</p>
          <h1>Find parts, compare options, and start a build.</h1>
        </div>

        <div className="parts-hero-actions">
          <Link to="/" className="parts-secondary">Home</Link>
          <button className="parts-primary" onClick={() => requireAuth('/builder')}>Open Builder</button>
          <button className="parts-secondary" onClick={() => requireAuth('/dashboard')}>Compare Benchmarks</button>
        </div>
      </header>

      

      <section className="parts-layout">
        <section className="parts-toolbar">
          <label className="parts-search-wrap">
            <span>Search</span>
            <input
              type="text"
              className="parts-search"
              placeholder="Search components or brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className="parts-search-wrap">
            <span>Category</span>
            <select className="parts-search" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <label className="parts-search-wrap">
            <span>Budget</span>
            <input
              type="number"
              min="0"
              className="parts-search"
              placeholder="-----"
              value={budget}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') return setBudget('');
                const n = Number(v);
                setBudget(String(Number.isNaN(n) ? '' : Math.max(0, n)));
              }}
            />
          </label>

          <div className="parts-chip-row">
            {availableCategories.map((cat) => (
              <button key={cat} type="button" className={category === cat ? 'parts-chip active' : 'parts-chip'} onClick={() => setCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </section>

        <aside className="parts-side-panel">
          <div className="parts-panel-card parts-summary-card">
            <div className="parts-quickfacts-header" onClick={() => setShowQuickFacts((s) => !s)} role="button" tabIndex={0}>
              <h3>Quick facts</h3>
              <button className="parts-toggle">{showQuickFacts ? '−' : '+'}</button>
            </div>
            {showQuickFacts && (
              <div className="parts-quickfacts-body">
                <ul>
                  {quickFacts.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="parts-panel-card">
            <div className="parts-quickfacts-header" onClick={() => setShowCurrentSpecs((s) => !s)} role="button" tabIndex={0}>
                <h3>Current PC specification</h3>
                <button className="parts-toggle">{showCurrentSpecs ? '−' : '+'}</button>
              </div>
              {showCurrentSpecs && (
                <div className="parts-currentpc-body">

                <div className="parts-spec-grid">
                  {Object.entries(currentSpecs).map(([key, value]) => (
                    <label key={key}>
                      <span>{key.toUpperCase()}</span>
                      <input
                        type="text"
                        value={value}
                        placeholder={`Current ${key.toUpperCase()}`}
                        onChange={(e) => setCurrentSpecs((current) => ({ ...current, [key]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>

                <div className="parts-panel-actions">
                  <button className="parts-primary" type="button">Suggest Upgrades</button>
                  <button className="parts-secondary" type="button" onClick={() => requireAuth('/builder')}>Build This PC</button>
                </div>
              </div>
            )}
          </div>

          <div className="parts-panel-card parts-compare-card">
            <h2>Compare & upgrade</h2>
            <p>Enter your current parts, then compare benchmarks or move straight into the builder.</p>

            <div className="parts-panel-actions">
              <button className="parts-primary" type="button" onClick={() => navigate('/dashboard')}>Compare Benchmarks</button>
              <button className="parts-secondary" type="button" onClick={() => navigate('/builder')}>Start Building</button>
            </div>
          </div>

          

          
        </aside>

        <main className="parts-grid-wrap">
          {loading ? (
            <div className="db-loading">Loading Hardware...</div>
          ) : error ? (
            <div className="db-error" style={{ padding: '20px', background: '#fee', color: '#c00', borderRadius: '4px', margin: '20px' }}>
              <strong>Error loading parts:</strong> {error}
              <p style={{ fontSize: '0.9em', marginTop: '10px' }}>The parts database may be temporarily unavailable. Try refreshing the page.</p>
            </div>
          ) : (
            <>
              <div className="parts-grid-header">
                <h2>Catalog</h2>
                <span>{filteredParts.length} results</span>
              </div>

              <div className="parts-grid">
                {filteredParts.map((part) => (
                  <article key={part.component_id} className="db-card">
                    <div className="db-card-header">
                      <span className="db-cat">{part.category}</span>
                      <span className="db-brand">{part.brand}</span>
                    </div>
                    <div className="db-card-body">
                      <h3>{part.name}</h3>
                      <p className="db-subline">
                        {part.form_factor ? `Form factor: ${part.form_factor}` : 'Form factor not set'}
                      </p>
                      <div className="db-specs">
                        <div className="spec-item"><span className="spec-label">Release year:</span><span className="spec-val">{part.release_year || 'N/A'}</span></div>
                        <div className="spec-item"><span className="spec-label">Active:</span><span className="spec-val">{part.is_active ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>
                    <div className="db-card-footer">
                      <span className="db-price">#{part.component_id}</span>
                      <div className="db-card-actions">
                        <button className="db-btn db-btn-secondary" onClick={() => requireAuth('/builder')}>Add to Builder</button>
                        <button className="db-btn">View Details</button>
                      </div>
                    </div>
                  </article>
                ))}
                {filteredParts.length === 0 && (
                  <div className="db-empty">No components found matching your criteria.</div>
                )}
              </div>
            </>
          )}
        </main>
      </section>
    </div>
  );
}
