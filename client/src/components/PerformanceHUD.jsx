import React from 'react'

function Bar({ label, value, max=100, color='#06b6d4' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: '#cfefff' }}>{label}: {Math.round(value)}</div>
      <div style={{ background: '#123', height: 12, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

export default function PerformanceHUD({ stats }) {
  return (
    <div style={{ position: 'absolute', left: 12, bottom: 12, width: 320, padding: 12, background: 'rgba(0,0,0,0.6)', color: '#dff', borderRadius: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Performance</div>
      <Bar label="CPU %" value={stats.cpu} max={100} color="#f97316" />
      <Bar label="GPU %" value={stats.gpu} max={100} color="#ef4444" />
      <Bar label="RAM %" value={stats.ram} max={100} color="#06b6d4" />
      <div style={{ marginTop: 8, fontSize: 12 }}>Mode: {stats.mode}</div>
    </div>
  )
}
