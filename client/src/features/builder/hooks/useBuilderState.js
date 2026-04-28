import { useEffect, useMemo, useState } from 'react';
import { atlasApi } from '../../../services/atlasApi';
import { defaultBudgetPhp, initialInstalledParts, mockCatalog, stageOrder, workloadPresets } from '../../../data/mockParts';
import { canInstallPart } from '../utils/compatibility';
import { sumInstalledParts } from '../utils/priceMath';

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesLooselyMatch(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

const SLOT_PRIORITY_BY_KIND = {
  RAM: ['ram1', 'ram2', 'ram3', 'ram4'],
  Storage: ['m2_1', 'm2_2', 'sata1'],
  Fans: ['fan_front1', 'fan_front2', 'fan_top1', 'fan_top2', 'fan_rear1'],
  CPU: ['cpu_socket'],
  GPU: ['pcie1'],
  PSU: ['psu_bay'],
  Motherboard: ['mobo'],
  Case: ['case_shell'],
};

const MOBO_MOUNTED_KINDS = new Set(['Motherboard', 'CPU', 'RAM', 'Storage', 'GPU']);

function isMotherboardSlot(slotKey) {
  if (!slotKey) return false;
  return slotKey === 'mobo' || slotKey === 'cpu_socket' || slotKey.startsWith('ram') || slotKey.startsWith('m2') || slotKey === 'pcie1' || slotKey === 'sata1';
}

export default function useBuilderState() {
  const [budgetPhp, setBudgetPhp] = useState(defaultBudgetPhp);
  const [workload, setWorkload] = useState(workloadPresets[0]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedMotherboard, setSelectedMotherboard] = useState(null);
  const [recommendationSource, setRecommendationSource] = useState('local');
  const [backendRecommendations, setBackendRecommendations] = useState([]);

  const [selectedPart, setSelectedPart] = useState(null);
  const [pendingPart, setPendingPart] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [installedParts, setInstalledParts] = useState(initialInstalledParts);
  const [status, setStatus] = useState('Set your budget, then pick a case to begin.');
  const [view, setView] = useState('case');
  const [graphicsMode, setGraphicsMode] = useState('stylized');

  const total = useMemo(() => sumInstalledParts(installedParts), [installedParts]);
  const remainingBudget = Math.max(0, budgetPhp - total);

  const backendRecommendationsByCategory = useMemo(() => {
    const map = {};
    backendRecommendations.forEach((item) => {
      const key = item.category;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    });
    return map;
  }, [backendRecommendations]);

  const completion = useMemo(() => {
    const values = Object.values(installedParts || {});
    return {
      Case: !!selectedCase,
      Motherboard: !!selectedMotherboard,
      CPU: values.some((part) => part?.kind === 'CPU'),
      RAM: values.some((part) => part?.kind === 'RAM'),
      Storage: values.some((part) => part?.kind === 'Storage'),
      GPU: values.some((part) => part?.kind === 'GPU'),
      PSU: values.some((part) => part?.kind === 'PSU'),
      Fans: values.some((part) => part?.kind === 'Fans'),
    };
  }, [installedParts, selectedCase, selectedMotherboard]);

  const installedPartCounts = useMemo(() => {
    const counts = {};
    Object.values(installedParts || {}).forEach((part) => {
      if (!part?.name) return;
      counts[part.name] = (counts[part.name] || 0) + 1;
    });
    return counts;
  }, [installedParts]);

  const activeSectionKey = useMemo(() => {
    for (const stage of stageOrder) {
      if (!completion[stage]) {
        return stage;
      }
    }
    return stageOrder[stageOrder.length - 1];
  }, [completion]);

  function markRecommended(parts, categoryKey) {
    if (recommendationSource !== 'backend') {
      return parts.map((part, index) => ({
        ...part,
        recommended: index < 2,
        recommendationKind: index < 2 ? 'local' : null,
      }));
    }

    const backendItems = backendRecommendationsByCategory[categoryKey] || [];
    return parts.map((part) => ({
      ...part,
      recommended: backendItems.some((item) => namesLooselyMatch(part.name, item.name)),
      recommendationKind: backendItems.some((item) => namesLooselyMatch(part.name, item.name)) ? 'backend' : null,
    }));
  }

  const filteredMotherboards = useMemo(() => {
    if (!selectedCase) return [];
    return mockCatalog.motherboards.filter((board) => selectedCase.supportedFormFactors.includes(board.formFactor));
  }, [selectedCase]);

  const localRecommendations = useMemo(() => {
    if (!selectedCase || !selectedMotherboard) {
      return {
        CPU: [],
        RAM: [],
        Storage: [],
        GPU: [],
        PSU: [],
        Fans: [],
      };
    }

    return {
      CPU: mockCatalog.cpu.filter((part) => part.socket === selectedMotherboard.socket),
      RAM: mockCatalog.ram.filter((part) => part.ramType === selectedMotherboard.ramType),
      Storage: mockCatalog.storage,
      GPU: mockCatalog.gpu.filter((part) => part.lengthMm <= selectedCase.maxGpuLengthMm),
      PSU: mockCatalog.psu.filter((part) => part.formFactor === selectedCase.psuFormFactor),
      Fans: mockCatalog.fans.filter((part) => selectedCase.fanSizes.includes(part.sizeMm)),
    };
  }, [selectedCase, selectedMotherboard]);

  const guidedSections = useMemo(() => {
    const sections = [
      {
        key: 'Case',
        name: 'Case',
        parts: markRecommended(mockCatalog.cases, 'Case'),
        locked: false,
        hint: 'Select a chassis style and size first.',
      },
      {
        key: 'Motherboard',
        name: 'Motherboard',
        parts: markRecommended(filteredMotherboards, 'Motherboard'),
        locked: !selectedCase,
        hint: selectedCase ? 'Choose a motherboard that fits your selected case.' : 'Pick a case first to unlock motherboard options.',
      },
    ];

    if (!selectedMotherboard) {
      return sections;
    }

    sections.push(
      {
        key: 'CPU',
        name: 'CPU',
        parts: markRecommended(localRecommendations.CPU, 'CPU'),
        locked: false,
        hint: 'Recommended for your motherboard socket.',
      },
      {
        key: 'RAM',
        name: 'RAM',
        parts: markRecommended(localRecommendations.RAM, 'RAM'),
        locked: false,
        hint: 'Recommended memory type for your motherboard.',
      },
      {
        key: 'Storage',
        name: 'Storage',
        parts: markRecommended(localRecommendations.Storage, 'Storage'),
        locked: false,
        hint: 'NVMe or SATA options based on your build.',
      },
      {
        key: 'GPU',
        name: 'GPU',
        parts: markRecommended(localRecommendations.GPU, 'GPU'),
        locked: false,
        hint: 'Filtered by case GPU clearance.',
      },
      {
        key: 'PSU',
        name: 'PSU',
        parts: markRecommended(localRecommendations.PSU, 'PSU'),
        locked: false,
        hint: 'Power supplies compatible with case PSU bay.',
      },
      {
        key: 'Fans',
        name: 'Fans',
        parts: markRecommended(localRecommendations.Fans, 'Fans'),
        locked: false,
        hint: 'Cooling options supported by your case fan mounts.',
      },
    );

    return sections;
  }, [backendRecommendationsByCategory, filteredMotherboards, localRecommendations, recommendationSource, selectedCase, selectedMotherboard]);

  const sectionsWithStatus = useMemo(
    () =>
      guidedSections.map((section) => {
        const completedSection = !!completion[section.key];
        const activeSection = section.key === activeSectionKey;
        return {
          ...section,
          completed: completedSection,
          active: activeSection,
        };
      }),
    [activeSectionKey, completion, guidedSections],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchBackendRecommendation() {
      if (!selectedMotherboard) {
        setBackendRecommendations([]);
        setRecommendationSource('local');
        return;
      }

      try {
        const token = window.localStorage.getItem('atlas_token');
        const response = await atlasApi.getRecommendationsOptionalAuth(
          {
            budget_php: budgetPhp,
            workload,
            device_type: 'desktop',
          },
          token,
        );

        if (cancelled) return;

        const parts = response?.parts || [];
        setBackendRecommendations(parts);
        setRecommendationSource(parts.length ? 'backend' : 'local');
      } catch {
        if (cancelled) return;
        setBackendRecommendations([]);
        setRecommendationSource('local');
      }
    }

    fetchBackendRecommendation();
    return () => {
      cancelled = true;
    };
  }, [budgetPhp, workload, selectedMotherboard]);

  useEffect(() => {
    const pendingKind = pendingPart?.kind || pendingPart?.category;
    const selectedKind = selectedPart?.kind || selectedPart?.category;
    const activeKind = pendingKind || selectedKind;

    const shouldUseMoboView = Boolean(selectedCase) && (
      activeSectionKey === 'Motherboard' ||
      MOBO_MOUNTED_KINDS.has(activeKind) ||
      isMotherboardSlot(selectedSlot)
    );

    const targetView = shouldUseMoboView ? 'mobo' : 'case';
    if (view !== targetView) {
      setView(targetView);
    }
  }, [activeSectionKey, pendingPart, selectedPart, selectedSlot, selectedCase, view]);

  function resetDownstreamFromCase(nextCase) {
    setSelectedCase(nextCase);
    setSelectedMotherboard(null);
    setPendingPart(null);
    setInstalledParts({ case_shell: nextCase });
    setSelectedSlot('mobo');
    setView('case');
  }

  function resetDownstreamFromMotherboard(board) {
    setSelectedMotherboard(board);
    setPendingPart(null);
    setInstalledParts((current) => ({
      case_shell: current.case_shell,
      mobo: board,
    }));
    setSelectedSlot('cpu_socket');
  }

  function commitInstall(part, slotKey) {
    if (!part || !slotKey) {
      return false;
    }

    if (!canInstallPart(part, slotKey, { selectedCase, selectedMotherboard })) {
      return false;
    }

    setInstalledParts((current) => ({
      ...current,
      [slotKey]: part,
    }));
    setPendingPart(null);
    setSelectedSlot(slotKey);
    setStatus(`${part.name} installed in the selected slot.`);
    return true;
  }

  function findFirstCompatibleSlot(part, primarySlot) {
    const kind = part?.kind || part?.category;
    const orderedSlots = [
      primarySlot,
      ...(SLOT_PRIORITY_BY_KIND[kind] || []),
      selectedSlot,
    ].filter(Boolean);

    const uniqueSlots = [...new Set(orderedSlots)];

    for (const slotKey of uniqueSlots) {
      if (installedParts?.[slotKey]) {
        continue;
      }
      if (canInstallPart(part, slotKey, { selectedCase, selectedMotherboard })) {
        return slotKey;
      }
    }

    return null;
  }

  function pickPart(part) {
    if (part.kind === 'Case') {
      resetDownstreamFromCase(part);
      setSelectedPart(part);
      setStatus(`${part.name} selected. Pick a compatible motherboard next.`);
      return;
    }

    if (part.kind === 'Motherboard') {
      resetDownstreamFromMotherboard(part);
      setSelectedPart(part);
      setStatus(`${part.name} selected. Recommended CPU, RAM, Storage, GPU, PSU, and Fans are now available.`);
      return;
    }

    setSelectedPart(part);

    const preferredSlot = findFirstCompatibleSlot(part, part.slotHint || selectedSlot);
    if (preferredSlot && commitInstall(part, preferredSlot)) {
      return;
    }

    setPendingPart(part);
    if (preferredSlot) {
      setSelectedSlot(preferredSlot || selectedSlot);
      setStatus(`${part.name} selected, but it cannot be installed in the selected slot. Select a compatible slot.`);
    } else {
      setStatus(`${part.name} selected. Choose a compatible slot to install it.`);
    }
  }

  function selectSlot(slotKey) {
    setSelectedSlot(slotKey);

    if (!pendingPart) {
      setStatus('Slot selected.');
      return;
    }

    if (commitInstall(pendingPart, slotKey)) {
      return;
    }

    setStatus(
      canInstallPart(pendingPart, slotKey, { selectedCase, selectedMotherboard })
        ? `Slot selected and ready for ${pendingPart.name}.`
        : `Slot selected, but ${pendingPart.name} may not fit here.`,
    );
  }

  function installSelected() {
    if (!pendingPart || !selectedSlot) {
      setStatus('Select a part and a slot first.');
      return false;
    }

    if (!commitInstall(pendingPart, selectedSlot)) {
      setStatus(`Cannot install ${pendingPart.name} in the selected slot.`);
      return false;
    }

    return true;
  }

  function incrementPart(part) {
    if (!part) return false;
    pickPart(part);
    return true;
  }

  function decrementPart(part) {
    if (!part) return false;

    const kind = part.kind || part.category;
    if (kind === 'Case' || kind === 'Motherboard') {
      setStatus(`Pick a different ${kind.toLowerCase()} to replace the current one.`);
      return false;
    }

    const installedSlots = Object.entries(installedParts || {})
      .filter(([, installed]) => installed?.name === part.name && (installed?.kind || installed?.category) === kind)
      .map(([slotKey]) => slotKey);

    if (!installedSlots.length) {
      setStatus(`${part.name} is not currently installed.`);
      return false;
    }

    const priority = SLOT_PRIORITY_BY_KIND[kind] || [];
    const ordered = [...priority, ...installedSlots].filter((slotKey, index, array) => array.indexOf(slotKey) === index);
    const targetSlot = [...ordered].reverse().find((slotKey) => installedSlots.includes(slotKey)) || installedSlots[installedSlots.length - 1];

    setInstalledParts((current) => {
      const next = { ...current };
      delete next[targetSlot];
      return next;
    });

    setPendingPart(null);
    setSelectedSlot(targetSlot);
    setSelectedPart(part);
    setStatus(`${part.name} removed from the build.`);
    return true;
  }

  return {
    stageOrder,
    sections: sectionsWithStatus,
    budgetPhp,
    setBudgetPhp,
    workload,
    setWorkload,
    recommendationSource,
    activeSectionKey,
    completion,
    installedPartCounts,
    selectedCase,
    selectedMotherboard,
    selectedPart,
    pendingPart,
    selectedSlot,
    installedParts,
    total,
    remainingBudget,
    status,
    view,
    setView,
    graphicsMode,
    setGraphicsMode,
    pickPart,
    incrementPart,
    decrementPart,
    selectSlot,
    installSelected,
  };
}
