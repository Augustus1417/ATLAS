import { formatCurrency } from './utils/priceMath';

export default function BuildSummary({ build }) {
  const installedCount = Object.keys(build.installedParts || {}).length;

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
      <div className="summary-status">{build.status}</div>
    </div>
  );
}
