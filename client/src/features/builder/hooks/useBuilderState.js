import { useEffect, useMemo, useState } from 'react';
import { atlasApi } from '../../../services/atlasApi';
import { defaultBudgetPhp, initialInstalledParts, mockCatalog, stageOrder, workloadPresets } from '../../../data/mockParts';
import { canInstallPart, checkCompatibility, calculateSystemPowerConsumption, getPSUWattage } from '../utils/compatibility';
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

const MOBO_MOUNTED_KINDS = new Set(['Motherboard', 'CPU', 'RAM', 'Storage', 'GPU']);

function isMotherboardSlot(slotKey) {
  if (!slotKey) return false;

  return (
    slotKey === 'mobo' ||
    slotKey === 'cpu_socket' ||
    slotKey.startsWith('ram') ||
    slotKey.startsWith('m2') ||
    slotKey === 'pcie1' ||
    slotKey === 'sata1'
  );
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

function inferLiveKind(category, name) {
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  if (text.includes('case') || text.includes('chassis')) return 'Case';
  if (text.includes('motherboard') || text.includes('mobo')) return 'Motherboard';
  if (text.includes('psu') || text.includes('power supply') || text.includes('80 plus')) return 'PSU';
  if (text.includes('ram') || text.includes('ddr4') || text.includes('ddr5') || text.includes('memory')) return 'RAM';
  if (text.includes('ssd') || text.includes('nvme') || text.includes('hdd') || text.includes('hard drive') || text.includes('storage')) return 'Storage';
  if (text.includes('graphics') || text.includes('videocard') || text.includes('video card') || text.includes('gpu') || text.includes('rtx') || text.includes('gtx') || text.includes('radeon')) return 'GPU';
  if (text.includes('cooler') || text.includes('fan') || text.includes('heatsink') || text.includes('aio') || text.includes('liquid cooler')) return 'Fans';
  if (text.includes('processor') || text.includes('cpu') || text.includes('ryzen') || text.includes('core i') || text.includes('intel')) return 'CPU';
  return null;
}

function inferSocketFromName(name) {
  const text = String(name || '').toLowerCase();
  const match = text.match(/(am5|am4|lga1700|lga1851|lga1200|lga1151)/i);
  if (match) return match[1].toUpperCase();
  if (text.includes('ryzen 9') || text.includes('ryzen 7') || text.includes('ryzen 5') || text.includes('ryzen 3')) {
    return text.includes('7000') || text.includes('8000') || text.includes('9000') ? 'AM5' : 'AM4';
  }
  if (text.includes('core ultra') || text.includes('intel core i')) {
    return 'LGA1700';
  }
  return null;
}

function inferFormFactor(name) {
  const text = String(name || '').toLowerCase();
  if (text.includes('mini-itx') || text.includes('mini itx') || text.includes('sff')) return 'Mini-ITX';
  if (text.includes('matx') || text.includes('micro atx')) return 'mATX';
  return 'ATX';
}

function inferRamType(name) {
  const text = String(name || '').toLowerCase();
  return text.includes('ddr5') ? 'DDR5' : 'DDR4';
}

function inferGpuLength(name) {
  const text = String(name || '').toLowerCase();
  if (text.includes('5090') || text.includes('5080') || text.includes('4090')) return 355;
  if (text.includes('4080') || text.includes('4070') || text.includes('7800 xt')) return 320;
  if (text.includes('4060') || text.includes('5060') || text.includes('5050')) return 250;
  if (text.includes('3050') || text.includes('2060')) return 230;
  return 280;
}

function inferCaseProfile(name) {
  const formFactor = inferFormFactor(name);
  const lower = String(name || '').toLowerCase();
  const isItx = formFactor === 'Mini-ITX';
  const isMatx = formFactor === 'mATX';
  return {
    supportedFormFactors: isItx ? ['Mini-ITX'] : isMatx ? ['mATX', 'Mini-ITX'] : ['ATX', 'mATX', 'Mini-ITX'],
    maxGpuLengthMm: isItx ? 305 : isMatx ? 330 : 390,
    psuFormFactor: isItx || lower.includes('sff') ? 'SFX' : 'ATX',
    fanSizes: isItx ? [92, 120] : [120, 140],
    casePreset: isItx ? 'itx-sff' : isMatx ? 'matx-compact' : 'atx-mid',
    description: 'Live catalog component',
  };
}

function inferSlotHint(kind, name) {
  const text = `${kind || ''} ${name || ''}`.toLowerCase();
  if (kind === 'Case') return 'case_shell';
  if (kind === 'Motherboard') return 'mobo';
  if (kind === 'CPU') return 'cpu_socket';
  if (kind === 'RAM') return 'ram1';
  if (kind === 'Storage') return text.includes('sata') ? 'sata1' : 'm2_1';
  if (kind === 'GPU') return 'pcie1';
  if (kind === 'PSU') return 'psu_bay';
  if (kind === 'Fans') return 'fan_front1';
  return 'case_shell';
}

function normalizeLiveComponent(row) {
  const kind = inferLiveKind(row.category, row.name);
  if (!kind) return null;

  const name = String(row.name || '').trim();
  const lower = name.toLowerCase();
  const normalized = {
    id: `component-${row.component_id}`,
    sourceId: row.component_id,
    kind,
    name,
    brand: row.brand || 'Generic',
    category: kind,
    price: Number(row.price || 0),
    image_url: row.image_url || null,
    slotHint: inferSlotHint(kind, name),
  };

  if (kind === 'Case') {
    return { ...normalized, ...inferCaseProfile(name) };
  }
  if (kind === 'Motherboard') {
    const formFactor = inferFormFactor(name);
    return {
      ...normalized,
      socket: inferSocketFromName(name),
      formFactor,
      ramType: inferRamType(name),
      maxRamSlots: formFactor === 'Mini-ITX' ? 2 : 4,
      pcieGen: lower.includes('pcie 5') ? 'PCIe 5.0' : 'PCIe 4.0',
    };
  }
  if (kind === 'CPU') {
    return { ...normalized, socket: inferSocketFromName(name) };
  }
  if (kind === 'RAM') {
    return { ...normalized, ramType: inferRamType(name) };
  }
  if (kind === 'Storage') {
    return { ...normalized, interface: lower.includes('nvme') || lower.includes('m.2') ? 'NVMe' : 'SATA' };
  }
  if (kind === 'GPU') {
    return { ...normalized, lengthMm: inferGpuLength(name) };
  }
  if (kind === 'PSU') {
    return { ...normalized, formFactor: lower.includes('sfx') ? 'SFX' : 'ATX' };
  }
  if (kind === 'Fans') {
    const sizeMatch = name.match(/(92|120|140)\s*mm/i);
    return { ...normalized, sizeMm: sizeMatch ? Number(sizeMatch[1]) : 120 };
  }

  return normalized;
}

function mergePartLists(primary, fallback) {
  const merged = [];
  const seen = new Set();
  [...(primary || []), ...(fallback || [])].forEach((part) => {
    const key = `${normalizeName(part.name)}|${part.kind || part.category}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(part);
  });
  return merged;
}

export default function useBuilderState() {
  const [budgetPhp, setBudgetPhp] = useState(defaultBudgetPhp);
  const [workload, setWorkload] = useState(workloadPresets[0]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedMotherboard, setSelectedMotherboard] = useState(null);
  const [recommendationSource, setRecommendationSource] = useState('local');
  const [backendRecommendations, setBackendRecommendations] = useState([]);
  const [liveComponents, setLiveComponents] = useState([]);

  const [selectedPart, setSelectedPart] = useState(null);
  const [pendingPart, setPendingPart] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('case_shell');
  const [installedParts, setInstalledParts] = useState(initialInstalledParts);
  const [status, setStatus] = useState('Select a case to begin.');
  const [view, setView] = useState('case');

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

  useEffect(() => {
    let cancelled = false;

    atlasApi
      .listComponents({ is_active: true })
      .then((rows) => {
        if (!cancelled) {
          setLiveComponents(Array.isArray(rows) ? rows : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveComponents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const liveCatalog = useMemo(() => {
    const buckets = {
      Case: [],
      Motherboard: [],
      CPU: [],
      RAM: [],
      Storage: [],
      GPU: [],
      PSU: [],
      Fans: [],
    };

    liveComponents.forEach((row) => {
      const normalized = normalizeLiveComponent(row);
      if (normalized && buckets[normalized.kind]) {
        buckets[normalized.kind].push(normalized);
      }
    });

    return buckets;
  }, [liveComponents]);

  const catalog = useMemo(
    () => ({
      cases: mergePartLists(liveCatalog.Case, mockCatalog.cases),
      motherboards: mergePartLists(liveCatalog.Motherboard, mockCatalog.motherboards),
      cpu: mergePartLists(liveCatalog.CPU, mockCatalog.cpu),
      ram: mergePartLists(liveCatalog.RAM, mockCatalog.ram),
      storage: mergePartLists(liveCatalog.Storage, mockCatalog.storage),
      gpu: mergePartLists(liveCatalog.GPU, mockCatalog.gpu),
      psu: mergePartLists(liveCatalog.PSU, mockCatalog.psu),
      fans: mergePartLists(liveCatalog.Fans, mockCatalog.fans),
    }),
    [liveCatalog]
  );

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

  // Enhanced compatibility checking
  const { errors, warnings, info } = useMemo(() => {
    return checkCompatibility(installedParts, { selectedCase, selectedMotherboard });
  }, [installedParts, selectedCase, selectedMotherboard]);

  const powerDraw = useMemo(() => {
    return calculateSystemPowerConsumption(installedParts);
  }, [installedParts]);

  const psuWattage = useMemo(() => {
    return getPSUWattage(installedParts);
  }, [installedParts]);

  const powerUsagePercentage = useMemo(() => {
    if (psuWattage === 0) return 0;
    return Math.min(100, (powerDraw / psuWattage) * 100);
  }, [powerDraw, psuWattage]);

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
    return catalog.motherboards.filter((board) => selectedCase.supportedFormFactors.includes(board.formFactor));
  }, [catalog.motherboards, selectedCase]);

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
      CPU: catalog.cpu.filter((part) => !selectedMotherboard.socket || !part.socket || part.socket === selectedMotherboard.socket),
      RAM: catalog.ram.filter((part) => !selectedMotherboard.ramType || !part.ramType || part.ramType === selectedMotherboard.ramType),
      Storage: catalog.storage,
      GPU: catalog.gpu.filter((part) => !selectedCase.maxGpuLengthMm || !part.lengthMm || part.lengthMm <= selectedCase.maxGpuLengthMm),
      PSU: catalog.psu.filter((part) => !selectedCase.psuFormFactor || !part.formFactor || part.formFactor === selectedCase.psuFormFactor),
      Fans: catalog.fans.filter((part) => !selectedCase.fanSizes?.length || !part.sizeMm || selectedCase.fanSizes.includes(part.sizeMm)),
    };
  }, [catalog, selectedCase, selectedMotherboard]);

  const guidedSections = useMemo(() => {
    const sections = [
      {
        key: 'Case',
        name: 'Case',
        parts: markRecommended(catalog.cases, 'Case'),
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
    [activeSectionKey, completion, guidedSections]
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

  function findFirstCompatibleSlot(part, primarySlot) {
    const kind = part?.kind || part?.category;
    const orderedSlots = [primarySlot, ...(SLOT_PRIORITY_BY_KIND[kind] || []), selectedSlot].filter(Boolean);
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
    setView('mobo');
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
    setView('case');
    setStatus(`${part.name} installed in the selected slot.`);
    return true;
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
        : `Slot selected, but ${pendingPart.name} may not fit here.`
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

  function updateRecommendedParts(parts) {
    setBackendRecommendations(Array.isArray(parts) ? parts : []);
    setRecommendationSource(Array.isArray(parts) && parts.length ? 'backend' : 'local');
  }

  return {
    stageOrder,
    sections: sectionsWithStatus,
    budgetPhp,
    setBudgetPhp,
    workload,
    setWorkload,
    recommendationSource,
    updateRecommendedParts,
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
    pickPart,
    incrementPart,
    decrementPart,
    selectSlot,
    installSelected,
    // Enhanced compatibility and power metrics
    compatibility: { errors, warnings, info },
    powerDraw,
    psuWattage,
    powerUsagePercentage
  };
}