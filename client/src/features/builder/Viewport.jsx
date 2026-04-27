import { useEffect, useMemo, useRef, useState } from 'react';
import PcSceneController from './scene/PcSceneController';
import { formatCurrency } from './utils/priceMath';

export default function Viewport({
  selectedSlot,
  pendingPart,
  installedParts,
  status,
  onSelectSlot,
  view,
  selectedCase,
  selectedMotherboard,
  graphicsMode,
  setGraphicsMode,
}) {
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const handlersRef = useRef({ onSelectSlot });
  const [hoverLabel, setHoverLabel] = useState('HOVER A SLOT');
  const [hoverDesc, setHoverDesc] = useState('Move your mouse over any slot on the motherboard to inspect it.');

  useEffect(() => {
    handlersRef.current = { onSelectSlot };
  }, [onSelectSlot]);

  const callbacks = useMemo(
    () => ({
      onHoverSlot(slot) {
        if (!slot) {
          setHoverLabel('HOVER A SLOT');
          setHoverDesc('Move your mouse over any slot on the case or motherboard to inspect it.');
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

  useEffect(() => {
    controllerRef.current?.setGraphicsMode(graphicsMode);
  }, [graphicsMode]);

  return (
    <main className="viewport">
      <canvas ref={canvasRef} />

      <div className="graphics-buttons">
        <button
          type="button"
          className={graphicsMode === 'stylized' ? 'vbtn active' : 'vbtn'}
          onClick={() => setGraphicsMode('stylized')}
        >
          STYLIZED
        </button>
        <button
          type="button"
          className={graphicsMode === 'real' ? 'vbtn active' : 'vbtn'}
          onClick={() => setGraphicsMode('real')}
        >
          REAL MODE
        </button>
      </div>

      <div className="status-pill">{status}</div>

      <div className="slot-info">
        <div className="slot-title">{hoverLabel}</div>
        <div className="slot-desc">
          {hoverDesc}
          {pendingPart ? '\n\n→ Select a compatible slot to install this part.' : ''}
        </div>
      </div>

      <div className="hud">
        CASE: {selectedCase?.name || 'none'}
        <br />
        MOBO: {selectedMotherboard?.name || 'none'}
        <br />
        PENDING: {pendingPart ? `${pendingPart.name} (${formatCurrency(pendingPart.price)})` : 'none'}
      </div>
    </main>
  );
}
