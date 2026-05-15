import { useEffect, useMemo, useRef, useState } from 'react';
import PcSceneController from './scene/PcSceneController';
import BuildSummary from './BuildSummary';
import { formatCurrency } from './utils/priceMath';

export default function Viewport({
  sections,
  selectedSlot,
  pendingPart,
  installedParts,
  onSelectSlot,
  view,
  selectedCase,
  selectedMotherboard,
  build,
}) {
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const handlersRef = useRef({ onSelectSlot });
  const [hoverLabel, setHoverLabel] = useState('');
  const [hoverDesc, setHoverDesc] = useState('');

  useEffect(() => {
    handlersRef.current = { onSelectSlot };
  }, [onSelectSlot]);

  const callbacks = useMemo(
    () => ({
      onHoverSlot(slot) {
        if (!slot) {
          setHoverLabel('');
          setHoverDesc('');
          return;
        }
        setHoverLabel(slot.label);
        setHoverDesc(slot.desc);
      },
      onSelectSlot(slot) {
        handlersRef.current.onSelectSlot(slot.slotKey || slot.key);
        setHoverLabel(slot.label);
        setHoverDesc(slot.desc);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    const controller = new PcSceneController(canvasRef.current, callbacks);
    controllerRef.current = controller;
    controller.mount();

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [callbacks]);

  useEffect(() => {
    controllerRef.current?.setSelectedSlot(selectedSlot);
  }, [selectedSlot]);

  useEffect(() => {
    controllerRef.current?.setPendingPart(pendingPart);
  }, [pendingPart]);

  useEffect(() => {
    controllerRef.current?.setInstalledParts(installedParts);
  }, [installedParts]);

  useEffect(() => {
    controllerRef.current?.setView(view);
  }, [view]);

  useEffect(() => {
    controllerRef.current?.setCasePreset(selectedCase?.casePreset || 'atx-mid');
  }, [selectedCase]);

  useEffect(() => {
    controllerRef.current?.setMotherboard(selectedMotherboard || null);
  }, [selectedMotherboard]);

  return (
    <main className="viewport">
      <canvas ref={canvasRef} />

      <aside className="builder-rail">
        <div className="builder-checklist-card">
          <div className="builder-checklist-title">CHECKLIST</div>
          <div className="builder-checklist-list">
            {sections.map((section) => (
              <div key={section.key} className={section.completed ? 'check-item done' : section.active ? 'check-item active' : 'check-item'}>
                <span className="check-dot" />
                <span className="check-label">{section.key}</span>
              </div>
            ))}
          </div>
        </div>

        <BuildSummary build={build} />
      </aside>

      {hoverLabel ? (
        <div className="slot-info is-active">
          <div className="slot-title">{hoverLabel}</div>
          <div className="slot-desc">
            {hoverDesc}
            {pendingPart ? '\n\n→ Select a compatible slot to install this part.' : ''}
          </div>
        </div>
      ) : null}
    </main>
  );
}
