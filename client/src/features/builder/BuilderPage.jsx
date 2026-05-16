import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Viewport from './Viewport';
import useBuilderState from './hooks/useBuilderState';
import PowerPerformancePanel from './PowerPerformancePanel';

export default function BuilderPage() {
  const builder = useBuilderState();
  const navigate = useNavigate();

  return (
    <div className="builder-container">
      <div className="builder-header">
        <button className="builder-back-btn" onClick={() => navigate('/')}>
          ← Home
        </button>
        <h1 className="builder-title">3D PC Builder</h1>
        <button className="builder-parts-btn" onClick={() => navigate('/parts')}>
          Parts Database →
        </button>
      </div>
      
      <div className="builder-shell">
        <Sidebar sections={builder.sections} selectedPart={builder.selectedPart} onPickPart={builder.pickPart} build={builder} />
        <Viewport
          sections={builder.sections}
          selectedSlot={builder.selectedSlot}
          pendingPart={builder.pendingPart}
          installedParts={builder.installedParts}
          onSelectSlot={builder.selectSlot}
          view={builder.view}
          selectedCase={builder.selectedCase}
          selectedMotherboard={builder.selectedMotherboard}
          build={builder}
        />
        <PowerPerformancePanel
          build={builder}
          compatibility={builder.compatibility}
          powerDraw={builder.powerDraw}
          psuWattage={builder.psuWattage}
          powerUsagePercentage={builder.powerUsagePercentage}
        />
      </div>
    </div>
  );
}