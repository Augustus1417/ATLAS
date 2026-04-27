import { useEffect, useState } from 'react';
import BuildSummary from './BuildSummary';
import { formatCurrency } from './utils/priceMath';

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
    fan_front2: 'Front fan mount',
    fan_top1: 'Top fan mount',
    fan_top2: 'Top fan mount',
    fan_rear1: 'Rear fan mount',
  };

  return labels[slotHint] || slotHint || '';
}

export default function Sidebar({ sections, selectedPart, onPickPart, build }) {
  const [openKey, setOpenKey] = useState(build.activeSectionKey);

  useEffect(() => {
    setOpenKey(build.activeSectionKey);
  }, [build.activeSectionKey]);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="title">ATLAS</div>
        <div className="sub">PC BUILD SYSTEM</div>
      </div>

      <div className="planner-card">
        <label className="planner-label" htmlFor="budget-input">
          BUDGET (PHP)
        </label>
        <input
          id="budget-input"
          className="planner-input"
          type="number"
          min="5000"
          step="500"
          value={build.budgetPhp}
          onChange={(event) => build.setBudgetPhp(Math.max(5000, Number(event.target.value || 0)))}
        />

        <label className="planner-label" htmlFor="workload-select" style={{ marginTop: 10 }}>
          WORKLOAD
        </label>
        <select
          id="workload-select"
          className="planner-input"
          value={build.workload}
          onChange={(event) => build.setWorkload(event.target.value)}
        >
          <option value="gaming">Gaming</option>
          <option value="editing">Editing</option>
          <option value="general">General</option>
          <option value="student">Student</option>
        </select>

        <div className="planner-meta">
          <span>RECOMMENDER</span>
          <strong>{build.recommendationSource.toUpperCase()}</strong>
        </div>
      </div>

      <div className="stepper" aria-label="Build progression">
        {build.stageOrder.map((stage) => {
          const section = sections.find((item) => item.key === stage);
          const stateClass = section?.completed ? 'done' : section?.active ? 'active' : 'pending';
          return (
            <div key={stage} className={`step ${stateClass}`}>
              <span className="step-dot" />
              <span className="step-text">{stage}</span>
            </div>
          );
        })}
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
        />
      ))}

      <div className="build-total">
        <div className="label">BUILD TOTAL</div>
        <div className="value">{formatCurrency(build.total)}</div>
        <div className="budget-left">
          Remaining: {formatCurrency(build.remainingBudget)}
        </div>
      </div>

      <BuildSummary build={build} />
    </aside>
  );
}

function CategoryGroup({ category, open, onToggle, completed, active, selectedPart, onPickPart }) {
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
          category.parts.map((part) => (
            <button
              key={part.id}
              type="button"
              className={selectedPart?.id === part.id ? 'part-card active' : 'part-card'}
              onClick={() => onPickPart(part)}
            >
              <div className="part-row">
                <span className="part-name">{part.name}</span>
                <span className="part-price">
                  {part.recommended ? <span className="rec-pill">REC</span> : null}
                  {formatCurrency(part.price)}
                </span>
              </div>
              <div className="part-row" style={{ marginTop: 6 }}>
                <span className="part-name">{part.kind || part.category}</span>
                <span className="part-name">{formatSlotHint(part.slotHint)}</span>
              </div>
            </button>
          ))}
      </div>
    </section>
  );
}
