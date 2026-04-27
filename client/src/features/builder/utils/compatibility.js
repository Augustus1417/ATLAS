const SLOT_CATEGORY_MAP = {
  case_shell: 'Case',
  mobo: 'Motherboard',
  cpu_socket: 'CPU',
  ram1: 'RAM',
  ram2: 'RAM',
  ram3: 'RAM',
  ram4: 'RAM',
  pcie1: 'GPU',
  pcie2: 'Expansion',
  pcie3: 'Expansion',
  m2_1: 'Storage',
  m2_2: 'Storage',
  sata1: 'Storage',
  psu_bay: 'PSU',
  fan_front1: 'Fans',
  fan_front2: 'Fans',
  fan_top1: 'Fans',
  fan_top2: 'Fans',
  fan_rear1: 'Fans',
};

export function canInstallPart(part, slotKey, context = {}) {
  if (!part || !slotKey) {
    return false;
  }

  const { selectedCase, selectedMotherboard } = context;

  if (part.kind === 'Motherboard') {
    if (!selectedCase) return false;
    if (!selectedCase.supportedFormFactors?.includes(part.formFactor)) {
      return false;
    }
  }

  if (part.kind === 'CPU') {
    if (!selectedMotherboard) return false;
    if (part.socket !== selectedMotherboard.socket) {
      return false;
    }
  }

  if (part.kind === 'RAM') {
    if (!selectedMotherboard) return false;
    if (part.ramType !== selectedMotherboard.ramType) {
      return false;
    }
  }

  if (part.kind === 'GPU') {
    if (!selectedCase) return false;
    if ((part.lengthMm || 0) > (selectedCase.maxGpuLengthMm || 0)) {
      return false;
    }
  }

  if (part.kind === 'PSU') {
    if (!selectedCase) return false;
    if (part.formFactor !== selectedCase.psuFormFactor) {
      return false;
    }
  }

  if (part.kind === 'Fans') {
    if (!selectedCase) return false;
    if (!selectedCase.fanSizes?.includes(part.sizeMm)) {
      return false;
    }
  }

  if (part.slotHint && part.slotHint !== slotKey && part.slotHint !== 'mobo') {
    return false;
  }

  const requiredCategory = SLOT_CATEGORY_MAP[slotKey];
  const partCategory = part.kind || part.category;
  if (!requiredCategory || !partCategory) {
    return true;
  }

  return partCategory === requiredCategory || part.slotHint === slotKey;
}