export default function PowerPerformancePanel({ build, compatibility, powerDraw, psuWattage, powerUsagePercentage }) {
  return (
    <div className="power-panel">
      <div className="power-stats">
        <div className="stat-row">
          <span className="stat-label">Power Draw:</span>
          <span className="stat-value">{powerDraw}W</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">PSU Capacity:</span>
          <span className="stat-value">{psuWattage}W</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Usage:</span>
          <span className="stat-value">{Math.round(powerUsagePercentage)}%</span>
        </div>
      </div>

      {compatibility?.warnings?.length > 0 && (
        <div className="compat-warnings">
          <h3>⚠️ Warnings</h3>
          <ul>
            {compatibility.warnings.map((warning, idx) => (
              <li key={idx}>
                {typeof warning === 'string' ? warning : warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {compatibility?.errors?.length > 0 && (
        <div className="compat-errors">
          <h3>❌ Errors</h3>
          <ul>
            {compatibility.errors.map((error, idx) => (
              <li key={idx}>
                {typeof error === 'string' ? error : error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
