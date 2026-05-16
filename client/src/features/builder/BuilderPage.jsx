import Sidebar from './Sidebar';
import Viewport from './Viewport';
import useBuilderState from './hooks/useBuilderState';
import PowerPerformancePanel from './PowerPerformancePanel';

export default function BuilderPage() {
  const builder = useBuilderState();

  return (
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
  );
}