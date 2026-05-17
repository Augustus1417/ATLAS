import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { atlasApi } from '../../services/atlasApi';
import { formatCurrency } from './utils/priceMath';

const QUANTITY_PART_KINDS = new Set(['RAM', 'Storage', 'Fans']);

function formatSlotHint(slotHint) {
  const labels = {
    case_shell: 'Case shell',
    mobo: 'Motherboard',
    cpu_socket: 'CPU socket',
    ram1: 'RAM slot',
    ram2: 'RAM slot',
    ram3: 'RAM slot',
    ram4: 'RAM slot',
    pcie1: 'PCIe slot',
    pcie2: 'Expansion slot',
    pcie3: 'Expansion slot',
    m2_1: 'M.2 slot',
    m2_2: 'M.2 slot',
    sata1: 'SATA bay',
    psu_bay: 'PSU bay',
    fan_front1: 'Front fan mount',
    fan_top1: 'Top fan mount',
    fan_rear1: 'Rear fan mount',
  };

  return labels[slotHint] || slotHint || '';
}

export default function Sidebar({ sections, selectedPart, onPickPart, build }) {
  const [openKey, setOpenKey] = useState(build.activeSectionKey);
  const [syncError, setSyncError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  useEffect(() => {
    setOpenKey(build.activeSectionKey);
  }, [build.activeSectionKey]);

  const handleWorkloadChange = async (value) => {
    build.setWorkload(value);
    setSyncing(true);
    setSyncError('');
    try {
      const recs = await atlasApi.getRecommendationsOptionalAuth({
        budget_php: build.budgetPhp,
        workload: value,
        device_type: 'desktop',
      });
      build.updateRecommendedParts(recs?.parts || []);
    } catch (e) {
      setSyncError(e.message || 'Failed to fetch AI recommendations');
    }
    setSyncing(false);
  };

  const handleBudgetChange = async (value) => {
    const numValue = Math.max(5000, Number(value || 0));
    build.setBudgetPhp(numValue);
    setSyncing(true);
    setSyncError('');
    try {
      const recs = await atlasApi.getRecommendationsOptionalAuth({
        budget_php: numValue,
        workload: build.workload,
        device_type: 'desktop',
      });
      build.updateRecommendedParts(recs?.parts || []);
    } catch (e) {
      setSyncError(e.message || 'Failed to fetch AI recommendations');
    }
    setSyncing(false);
  };

  return (
    <aside className="sidebar">
      <div className="logo logo-row">
        <div>
          <div className="title">ATLAS</div>
          <div className="sub">PC BUILD SYSTEM</div>
        </div>
        <Link to="/" className="builder-home-link">
          Home
        </Link>
      </div>

      <details className="planner-card" open={controlsOpen} onToggle={(event) => setControlsOpen(event.currentTarget.open)}>
        <summary className="planner-summary">
          <span>Budget & workload</span>
          <span>{controlsOpen ? '−' : '+'}</span>
        </summary>

        <div className="planner-card-body">
          <div className="planner-field">
            <label className="planner-label" htmlFor="budget-input">
              Budget (PHP)
            </label>
            <input
              id="budget-input"
              className="planner-input"
              type="number"
              min="5000"
              step="500"
              value={build.budgetPhp}
              onChange={(event) => handleBudgetChange(event.target.value)}
            />
          </div>

          <div className="planner-field">
            <label className="planner-label" htmlFor="workload-select">
              Workload
            </label>
            <select
              id="workload-select"
              className="planner-input"
              value={build.workload}
              onChange={(event) => handleWorkloadChange(event.target.value)}
            >
              <option value="gaming">Gaming</option>
              <option value="editing">Editing</option>
              <option value="general">General</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div className="planner-meta">
            <span>RECOMMENDER</span>
            <strong>{syncing ? 'SYNCING' : build.recommendationSource.toUpperCase()}</strong>
          </div>
          {syncError ? <div className="planner-error">{syncError}</div> : null}
        </div>
      </details>

      <div className="sidebar-actions">
        <Link to="/parts" className="sidebar-link sidebar-link-strong sidebar-link-block">
          View Parts
        </Link>
      </div>

      {sections.map((category, index) => (
        <CategoryGroup
          key={category.key}
          category={category}
          open={openKey === category.key}
          onToggle={() => setOpenKey((current) => (current === category.key ? '' : category.key))}
          completed={category.completed}
          active={category.active}
          selectedPart={selectedPart}
          onPickPart={onPickPart}
          onIncrementPart={build.incrementPart}
          onDecrementPart={build.decrementPart}
          build={build}
        />
      ))}

    </aside>
  );
}

function CategoryGroup({ category, open, onToggle, completed, active, selectedPart, onPickPart, onIncrementPart, onDecrementPart, build }) {
  const autoOpen = open;

  return (
    <section className={`${autoOpen ? 'category open' : 'category'}${active ? ' stage-active' : ''}`} aria-disabled={category.locked}>
      <button className="category-button" onClick={onToggle} type="button" disabled={category.locked}>
        <span>
          {category.name}
          {completed ? <span className="completed-pill">DONE</span> : null}
        </span>
        <span>▶</span>
      </button>
      {category.locked ? <div className="category-hint">{category.hint}</div> : null}
      <div className="part-list">
        {autoOpen &&
          !category.locked &&
          category.parts.map((part) => {
            const installedCount = build.installedPartCounts?.[part.name] || 0;
            const targetLabel = build.pendingPart?.id === part.id ? formatSlotHint(build.selectedSlot) : '';

            return (
              <div
                key={part.id}
                role="button"
                tabIndex={0}
                className={selectedPart?.id === part.id ? 'part-card active' : 'part-card'}
                onClick={() => onPickPart(part)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPickPart(part);
                  }
                }}
              >
                {part.image_url ? (
                  <div className="part-media">
                    <img className="part-image" src={part.image_url} alt={part.name} loading="lazy" />
                  </div>
                ) : null}
                <div className="part-row">
                  <span className="part-name part-name-strong">{part.name}</span>
                  <span className="part-price">
                    {part.recommended ? <span className="rec-pill">REC</span> : null}
                    {installedCount > 0 ? <span className="count-pill">x{installedCount}</span> : null}
                    {formatCurrency(part.price)}
                  </span>
                </div>
                <div className="part-row" style={{ marginTop: 6 }}>
                  <span className="part-name">{part.brand || 'Generic'}</span>
                  <span className="part-name">{formatSlotHint(part.slotHint)}</span>
                </div>
                {QUANTITY_PART_KINDS.has(part.kind || part.category) ? (
                  <div className="qty-controls" role="group" aria-label={`${part.name} quantity controls`}>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDecrementPart(part);
                      }}
                      disabled={installedCount <= 0}
                      aria-label={`Remove one ${part.name}`}
                    >
                      -
                    </button>
                    <span className="qty-value">{installedCount}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        onIncrementPart(part);
                      }}
                      aria-label={`Add one ${part.name}`}
                    >
                      +
                    </button>
                  </div>
                ) : null}
                {targetLabel ? <div className="part-target">Target: {targetLabel}</div> : null}
              </div>
            );
          })}
      </div>
    </section>
  );
}
