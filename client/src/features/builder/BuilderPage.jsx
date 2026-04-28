import Sidebar from './Sidebar';
import Viewport from './Viewport';
import useBuilderState from './hooks/useBuilderState';

export default function BuilderPage() {
  const builder = useBuilderState();

  return (
    <div className="builder-shell">
      <Sidebar sections={builder.sections} selectedPart={builder.selectedPart} onPickPart={builder.pickPart} build={builder} />
      <Viewport
        selectedSlot={builder.selectedSlot}
        pendingPart={builder.pendingPart}
        installedParts={builder.installedParts}
        status={builder.status}
        onSelectSlot={builder.selectSlot}
        view={builder.view}
        selectedCase={builder.selectedCase}
        selectedMotherboard={builder.selectedMotherboard}
      />
    </div>
  );
}
