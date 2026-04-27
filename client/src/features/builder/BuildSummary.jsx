import { formatCurrency } from './utils/priceMath';

export default function BuildSummary({ build }) {
  const installedCount = Object.keys(build.installedParts || {}).length;
  const quantityRows = Object.entries(build.installedPartCounts || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="summary-card">
      <div className="summary-title">BUILD SUMMARY</div>
      <div className="summary-row">
        <span>Installed Items</span>
        <strong>{installedCount}</strong>
      </div>
      <div className="summary-row">
        <span>Total</span>
        <strong>{formatCurrency(build.total)}</strong>
      </div>
      {quantityRows.slice(0, 5).map(([name, count]) => (
        <div className="summary-row" key={name}>
          <span>{name}</span>
          <strong>x{count}</strong>
        </div>
      ))}
      <div className="summary-status">{build.status}</div>
    </div>
  );
}
