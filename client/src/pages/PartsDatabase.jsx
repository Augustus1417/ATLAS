import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { atlasApi } from '../services/atlasApi';
import '../styles/parts-db.css';

export default function PartsDatabase() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [brand, setBrand] = useState('All');
  const [budget, setBudget] = useState('');
  const [currentSpecs, setCurrentSpecs] = useState({ cpu: '', gpu: '', ram: '', storage: '', motherboard: '', psu: '', case: '', cooling: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParts() {
      try {
        const res = await atlasApi.listComponents();
        setParts(res);
        console.log('fetched parts', res);
      } catch (e) {
        console.error('Failed to fetch parts database', e);
      } finally {
        setLoading(false);
      }
    }
    fetchParts();
  }, [navigate]);

  const availableCategories = useMemo(() => {
    const knownOrder = ['Pre-built', 'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling', 'Accessories'];
    const fromData = [...new Set(parts.map((part) => part.category).filter(Boolean))];
    const ordered = knownOrder.filter((cat) => fromData.includes(cat));
    const remainder = fromData.filter((cat) => !knownOrder.includes(cat));
    return ['All', ...ordered, ...remainder];
  }, [parts]);

  const availableBrands = useMemo(() => {
    const fromData = [...new Set(parts.map((part) => part.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return ['All', ...fromData];
  }, [parts]);

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return 'Price unavailable';
    const number = Number(value);
    if (Number.isNaN(number)) return 'Price unavailable';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(number);
  };

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

  const filteredParts = parts.filter((part) => {
    const matchesSearch = part.name.toLowerCase().includes(search.toLowerCase()) || String(part.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || !category || part.category === category;
    const matchesBrand = brand === 'All' || !brand || part.brand === brand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const quickFacts = [
    { label: 'Current CPU', value: currentSpecs.cpu || 'Not set' },
    { label: 'Current GPU', value: currentSpecs.gpu || 'Not set' },
    { label: 'Current RAM', value: currentSpecs.ram || 'Not set' },
    { label: 'Current Storage', value: currentSpecs.storage || 'Not set' },
    { label: 'Motherboard', value: currentSpecs.motherboard || 'Not set' },
    { label: 'PSU', value: currentSpecs.psu || 'Not set' },
    { label: 'Case', value: currentSpecs.case || 'Not set' },
    { label: 'Cooling', value: currentSpecs.cooling || 'Not set' },
  ];

  // Panels default collapsed per request
  const [showQuickFacts, setShowQuickFacts] = useState(false);
  const [showCurrentSpecs, setShowCurrentSpecs] = useState(false);

  return (
    <div className="parts-shell">
      <header className="parts-hero">
        <div>
          <h1>ATLAS COMPONENT LAB</h1>
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
              {availableCategories.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="parts-search-wrap">
            <span>Brand</span>
            <select className="parts-search" value={brand} onChange={(e) => setBrand(e.target.value)}>
              {availableBrands.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
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

        </section>

        <aside className="parts-side-panel">
          <div className="parts-quickfacts-toplabel">Your PC info</div>
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
          ) : (
            <>
              <div className="parts-grid-header">
                <h2>Components</h2>
                <span>{filteredParts.length} results</span>
              </div>

              <div className="parts-grid">
                {filteredParts.map((part) => (
                  <article key={part.component_id} className="db-card">
                    {part.is_active ? <span className="db-status-dot" aria-label="Active component" title="Active component" /> : null}
                    <div className="db-card-header">
                      <span className="db-cat">{part.category}</span>
                      <span className="db-brand">{part.brand}</span>
                    </div>
                    {part.image_url ? (
                      <div className="db-card-image-wrap">
                        <img className="db-card-image" src={part.image_url} alt={part.name} loading="lazy" />
                      </div>
                    ) : null}
                    <div className="db-card-body">
                      <h3>{part.name}</h3>
                      <p className="db-price-line">Price: <strong>{formatPrice(part.price ?? part.latest_price)}</strong></p>
                    </div>
                    <div className="db-card-footer">
                      <div className="db-card-actions">
                        <button className="db-btn db-btn-secondary" onClick={() => requireAuth('/builder')}>Add</button>
                        <button className="db-btn">View</button>
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
