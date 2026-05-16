import { useEffect, useState, useRef } from 'react';
import { formatCurrency } from './utils/priceMath';

export default function PowerPerformancePanel({ build, compatibility, powerDraw, psuWattage, powerUsagePercentage }) {
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const [bootStage, setBootStage] = useState('off'); // off, post, booting, os
  const [bootProgress, setBootProgress] = useState(0);
  const [performanceData, setPerformanceData] = useState({
    cpuLoad: 0,
    gpuLoad: 0,
    ramUsage: 0,
    vramUsage: 0,
    diskIO: 0,
    cpuTemp: 30,
    gpuTemp: 30,
    fanRPM: 0,
    gpuFanRPM: 0
  });
  const [benchmarks, setBenchmarks] = useState({});
  const [workload, setWorkload] = useState('IDLE'); // IDLE, GAMING, RENDER, AI/ML
  const [bottleneck, setBottleneck] = useState(null);

  // Refs for animation
  const animationFrameRef = useRef(0);
  const postTextRef = useRef([]);

  // Initialize POST text lines
  useEffect(() => {
    postTextRef.current = [
      'ATLAS BIOS Version 2.0.0 Copyright (C) 2026',
      'Testing system memory...',
      'Memory Test Passed',
      'Detecting PCI-E Devices...',
      'NVIDIA GPU Detected: [GPU Model]',
      'Storage Device Detected: [Storage Model]',
      'USB Controllers Initialized',
      'Audio Controller Initialized',
      'Network Controller Initialized',
      'Press DEL to enter Setup, F12 for Boot Menu',
      'Booting from Storage Device...'
    ];
  }, []);

  // Calculate benchmarks based on components
  useEffect(() => {
    if (!build.selectedCase || !build.selectedMotherboard) {
      setBenchmarks({});
      return;
    }

    const cpuPart = Object.values(build.installedParts || {}).find(p => p && p.kind === 'CPU');
    const gpuPart = Object.values(build.installedParts || {}).find(p => p && p.kind === 'GPU');

    // Simple benchmark calculations based on component tiers
    const cpuScore = cpuPart ? calculateCPUBenchmark(cpuPart) : 0;
    const gpuScore = gpuPart ? calculateGPUBenchmark(gpuPart) : 0;

    setBenchmarks({
      cpu: cpuScore,
      gpu: gpuScore,
      composite: Math.sqrt(cpuScore * gpuScore),
      fpsCyberpunk: Math.min(200, gpuScore * 2.5),
      fpsHogwarts: Math.min(150, gpuScore * 2),
      fpsCS2: Math.min(300, gpuScore * 3),
      fpsBlackMyth: Math.min(180, gpuScore * 2.2)
    });
  }, [build.installedParts, build.selectedCase, build.selectedMotherboard]);

  // Calculate bottleneck
  useEffect(() => {
    if (!build.selectedCase || !build.selectedMotherboard) {
      setBottleneck(null);
      return;
    }

    const cpuPart = Object.values(build.installedParts || {}).find(p => p && p.kind === 'CPU');
    const gpuPart = Object.values(build.installedParts || {}).find(p => p && p.kind === 'GPU');

    if (cpuPart && gpuPart) {
      const cpuScore = calculateCPUBenchmark(cpuPart);
      const gpuScore = calculateGPUBenchmark(gpuPart);
      const ratio = gpuScore / cpuScore;

      if (ratio > 2.0) {
        setBottleneck({
          type: 'CPU',
          message: 'CPU may be bottlenecking GPU performance',
          suggestion: 'Consider upgrading to a more powerful CPU for better balance'
        });
      } else if (ratio < 0.5) {
        setBottleneck({
          type: 'GPU',
          message: 'GPU may be bottlenecking CPU performance',
          suggestion: 'Consider upgrading to a more powerful GPU for better balance'
        });
      } else {
        setBottleneck(null);
      }
    } else {
      setBottleneck(null);
    }
  }, [build.installedParts, build.selectedCase, build.selectedMotherboard]);

  // Simulation loop for performance data when powered on
  useEffect(() => {
    if (!isPoweredOn || bootStage !== 'os') {
      return;
    }

    const simulatePerformance = () => {
      // Simulate different workloads
      let cpuLoad = 0, gpuLoad = 0, ramUsage = 0, vramUsage = 0, diskIO = 0;
      let cpuTemp = 30, gpuTemp = 30, fanRPM = 0, gpuFanRPM = 0;

      switch (workload) {
        case 'IDLE':
          cpuLoad = 5 + Math.random() * 10;
          gpuLoad = 3 + Math.random() * 7;
          ramUsage = 20 + Math.random() * 10;
          vramUsage = 5 + Math.random() * 10;
          diskIO = 2 + Math.random() * 5;
          break;
        case 'GAMING':
          cpuLoad = 40 + Math.random() * 30;
          gpuLoad = 70 + Math.random() * 25;
          ramUsage = 50 + Math.random() * 20;
          vramUsage = 60 + Math.random() * 30;
          diskIO = 30 + Math.random() * 20;
          break;
        case 'RENDER':
          cpuLoad = 80 + Math.random() * 15;
          gpuLoad = 40 + Math.random() * 20;
          ramUsage = 70 + Math.random() * 20;
          vramUsage = 30 + Math.random() * 15;
          diskIO = 40 + Math.random() * 25;
          break;
        case 'AI/ML':
          cpuLoad = 60 + Math.random() * 25;
          gpuLoad = 80 + Math.random() * 15;
          ramUsage = 60 + Math.random() * 25;
          vramUsage = 70 + Math.random() * 20;
          diskIO = 20 + Math.random() * 15;
          break;
      }

      // Calculate temperatures based on load
      cpuTemp = 30 + (cpuLoad * 0.5);
      gpuTemp = 30 + (gpuLoad * 0.6);

      // Calculate fan RPMs based on temperature
      fanRPM = Math.floor(600 + (cpuTemp - 30) * 25);
      gpuFanRPM = Math.floor(800 + (gpuTemp - 30) * 30);

      setPerformanceData({
        cpuLoad: Math.min(99, cpuLoad),
        gpuLoad: Math.min(99, gpuLoad),
        ramUsage: Math.min(97, ramUsage),
        vramUsage: Math.min(95, vramUsage),
        diskIO: Math.min(90, diskIO),
        cpuTemp: Math.min(95, cpuTemp),
        gpuTemp: Math.min(95, gpuTemp),
        fanRPM: Math.min(3500, fanRPM),
        gpuFanRPM: Math.min(4500, gpuFanRPM)
      });

      animationFrameRef.current = requestAnimationFrame(simulatePerformance);
    };

    simulatePerformance();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPoweredOn, bootStage, workload]);

  // Boot sequence
  useEffect(() => {
    if (isPoweredOn && bootStage === 'off') {
      setBootStage('post');
      setBootProgress(0);

      const bootSimulation = () => {
        if (bootProgress >= 100) {
          setBootStage('booting');
          setTimeout(() => {
            setBootStage('os');
          }, 1500); // 1.5 second booting animation
          return;
        }

        setBootProgress(prev => prev + Math.random() * 5 + 2);
        animationFrameRef.current = requestAnimationFrame(bootSimulation);
      };

      animationFrameRef.current = requestAnimationFrame(bootSimulation);
    } else if (!isPoweredOn && bootStage !== 'off') {
      setBootStage('off');
      setBootProgress(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      setPerformanceData({
        cpuLoad: 0, gpuLoad: 0, ramUsage: 0, vramUsage: 0, diskIO: 0,
        cpuTemp: 30, gpuTemp: 30, fanRPM: 0, gpuFanRPM: 0
      });
      setBenchmarks({});
    }
  }, [isPoweredOn, bootStage]);

  const handlePowerClick = () => {
    setIsPoweredOn(!isPoweredOn);
  };

  const handleWorkloadChange = (e) => {
    setWorkload(e.target.value);
  };

  if (!build.selectedCase) {
    return (
      <div className="power-performance-panel">
        <div className="power-disabled">
          Select a case to enable power controls
        </div>
      </div>
    );
  }

  return (
    <div className="power-performance-panel">
      <div className="power-controls">
        <button
          onClick={handlePowerClick}
          className={isPoweredOn ? 'power-on' : 'power-off'}
        >
          {isPoweredOn ? 'POWER OFF' : 'POWER ON'}
        </button>

        <div className="power-info">
          <div className="power-stats">
            <div>Power Draw: {powerDraw}W</div>
            <div>PSU Capacity: {psuWattage}W</div>
            <div>Usage: {Math.round(powerUsagePercentage)}%</div>
          </div>

          {compatibility.errors.length > 0 && (
            <div className="compat-errors">
              <h3>Compatibility Errors:</h3>
              <ul>
                {compatibility.errors.map((err, idx) => (
                  <li key={idx} className="error-item">
                    <strong>{err.message}</strong>
                    {err.suggestion && (
                      <>
                        <br />
                        <small>{err.suggestion}</small>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {compatibility.warnings.length > 0 && (
            <div className="compat-warnings">
              <h3>Compatibility Warnings:</h3>
              <ul>
                {compatibility.warnings.map((warn, idx) => (
                  <li key={idx} className="warning-item">
                    <strong>{warn.message}</strong>
                    {warn.suggestion && (
                      <>
                        <br />
                        <small>{warn.suggestion}</small>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* POST Boot Screen */}
      {bootStage === 'post' && (
        <div className="post-overlay">
          <div className="post-content">
            <div className="post-header">
              <span>ATLAS BIOS</span>
              <span className="post-timer">{bootProgress.toFixed(0)}%</span>
            </div>
            <div className="post-text">
              {postTextRef.current.slice(0, Math.floor(postTextRef.current.length * bootProgress / 100)).map((line, idx) => (
                <div key={idx} className="post-line">{line}</div>
              ))}
            </div>
            <div className="post-footer">
              {bootProgress >= 100 ? 'Press DEL to enter Setup' : 'Initializing...'}
            </div>
          </div>
        </div>
      )}

      {/* Performance Panel (shown after boot) */}
      {bootStage === 'os' && (
        <div className="performance-panel">
          <div className="performance-header">
            <h2>System Performance Monitor</h2>
            <div className="workload-selector">
              <label>
                Workload:
                <select value={workload} onChange={handleWorkloadChange}>
                  <option value="IDLE">IDLE</option>
                  <option value="GAMING">GAMING</option>
                  <option value="RENDER">RENDER</option>
                  <option value="AI/ML">AI/ML</option>
                </select>
              </label>
            </div>
          </div>

          <div className="performance-tabs">
            <div className="tab active" data-tab="live">Live Usage</div>
            <div className="tab" data-tab="benchmarks">Benchmarks</div>
            <div className="tab" data-tab="temperatures">Temperatures & Fans</div>
            {bottleneck && <div className="tab" data-tab="bottleneck">Bottleneck Analysis</div>}
          </div>

          <div className="tab-content">
            {/* Live Usage Tab */}
            <div className="tab-pane active" data-tab="live">
              <div className="gauges-grid">
                <div className="gauge">
                  <div className="gauge-label">CPU Load</div>
                  <div className="gauge-value">{performanceData.cpuLoad.toFixed(1)}%</div>
                  <div className="gauge-bar">
                    <div className="gauge-fill" style={{ width: `${performanceData.cpuLoad}%` }}></div>
                  </div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">GPU Load</div>
                  <div className="gauge-value">{performanceData.gpuLoad.toFixed(1)}%</div>
                  <div className="gauge-bar">
                    <div className="gauge-fill" style={{ width: `${performanceData.gpuLoad}%` }}></div>
                  </div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">RAM Usage</div>
                  <div className="gauge-value">{performanceData.ramUsage.toFixed(1)}%</div>
                  <div className="gauge-bar">
                    <div className="gauge-fill" style={{ width: `${performanceData.ramUsage}%` }}></div>
                  </div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">VRAM Usage</div>
                  <div className="gauge-value">{performanceData.vramUsage.toFixed(1)}%</div>
                  <div className="gauge-bar">
                    <div className="gauge-fill" style={{ width: `${performanceData.vramUsage}%` }}></div>
                  </div>
                </div>
                <div className="gauge">
                  <div className="gauge-label">Disk I/O</div>
                  <div className="gauge-value">{performanceData.diskIO.toFixed(1)}%</div>
                  <div className="gauge-bar">
                    <div className="gauge-fill" style={{ width: `${performanceData.diskIO}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmarks Tab */}
            <div className="tab-pane" data-tab="benchmarks">
              {Object.keys(benchmarks).length > 0 ? (
                <div className="benchmarks-grid">
                  <div className="benchmark-item">
                    <div className="benchmark-label">CPU Score</div>
                    <div className="benchmark-value">{Math.round(benchmarks.cpu)}</div>
                  </div>
                  <div className="benchmark-item">
                    <div className="benchmark-label">GPU Score</div>
                    <div className="benchmark-value">{Math.round(benchmarks.gpu)}</div>
                  </div>
                  <div className="benchmark-item">
                    <div className="benchmark-label">Composite Score</div>
                    <div className="benchmark-value">{Math.round(benchmarks.composite)}</div>
                  </div>
                  <div className="benchmark-item">
                    <div className="benchmark-label">Cyberpunk 2077 FPS</div>
                    <div className="benchmark-value">{Math.round(benchmarks.fpsCyberpunk)}</div>
                  </div>
                  <div className="benchmark-item">
                    <div className="benchmark-label">Hogwarts Legacy FPS</div>
                    <div className="benchmark-value">{Math.round(benchmarks.fpsHogwarts)}</div>
                  </div>
                  <div className="benchmark-item">
                    <div className="benchmark-label">CS2 FPS</div>
                    <div className="benchmark-value">{Math.round(benchmarks.fpsCS2)}</div>
                  </div>
                  <div className="benchmark-item">
                    <div className="benchmark-label">Black Myth: Wukong FPS</div>
                    <div className="benchmark-value">{Math.round(benchmarks.fpsBlackMyth)}</div>
                  </div>
                </div>
              ) : (
                <div className="benchmark-placeholder">Select components to see benchmark estimates</div>
              )}
            </div>

            {/* Temperatures & Fans Tab */}
            <div className="tab-pane" data-tab="temperatures">
              <div className="temp-fan-grid">
                <div className="temp-item">
                  <div className="temp-label">CPU Temperature</div>
                  <div className="temp-value">{performanceData.cpuTemp.toFixed(0)}°C</div>
                  <div className="temp-bar">
                    <div className="temp-fill" style={{ width: `${Math.min(100, performanceData.cpuTemp)}%` }}></div>
                  </div>
                </div>
                <div className="temp-item">
                  <div className="temp-label">GPU Temperature</div>
                  <div className="temp-value">{performanceData.gpuTemp.toFixed(0)}°C</div>
                  <div className="temp-bar">
                    <div className="temp-fill" style={{ width: `${Math.min(100, performanceData.gpuTemp)}%` }}></div>
                  </div>
                </div>
                <div className="fan-item">
                  <div className="fan-label">System Fan RPM</div>
                  <div className="fan-value">{performanceData.fanRPM.toFixed(0)} RPM</div>
                  <div className="fan-bar">
                    <div className="fan-fill" style={{ width: `${Math.min(100, (performanceData.fanRPM / 3500) * 100)}%` }}></div>
                  </div>
                </div>
                <div className="fan-item">
                  <div className="fan-label">GPU Fan RPM</div>
                  <div className="fan-value">{performanceData.gpuFanRPM.toFixed(0)} RPM</div>
                  <div className="fan-bar">
                    <div className="fan-fill" style={{ width: `${Math.min(100, (performanceData.gpuFanRPM / 4500) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottleneck Analysis Tab */}
            {bottleneck && (
              <div className="tab-pane" data-tab="bottleneck">
                <div className="bottleneck-analysis">
                  <div className="bottleneck-icon">{bottleneck.type === 'CPU' ? '🔧' : '🎮'}</div>
                  <div className="bottleneck-content">
                    <h3>{bottleneck.type === 'CPU' ? 'CPU Bottleneck Detected' : 'GPU Bottleneck Detected'}</h3>
                    <p>{bottleneck.message}</p>
                    <p className="suggestion">{bottleneck.suggestion}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for benchmark calculations
function calculateCPUBenchmark(cpuPart) {
  // Simplified benchmark scoring based on CPU model
  switch (cpuPart.id) {
    case 'cpu-14700k': return 185;
    case 'cpu-14600k': return 165;
    case 'cpu-7800x3d': return 175;
    case 'cpu-7600': return 120;
    default: return 100;
  }
}

function calculateGPUBenchmark(gpuPart) {
  // Simplified benchmark scoring based on GPU model
  switch (gpuPart.id) {
    case 'gpu-rtx-4060': return 85;
    case 'gpu-rtx-4070s': return 140;
    case 'gpu-rx-7800xt': return 160;
    case 'gpu-rtx-4090': return 280;
    default: return 100;
  }
}