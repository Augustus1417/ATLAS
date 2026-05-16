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
  fan_top1: 'Fans',
  fan_rear1: 'Fans',
};

// TDP values for components (in watts) - approximate averages
const COMPONENT_TDP = {
  CPU: {
    'cpu-14700k': 125,
    'cpu-14600k': 125,
    'cpu-7800x3d': 105,
    'cpu-7600': 65,
    default: 95
  },
  GPU: {
    'gpu-rtx-4060': 115,
    'gpu-rtx-4070s': 220,
    'gpu-rx-7800xt': 263,
    'gpu-rtx-4090': 450,
    default: 250
  },
  CPU_COOLER: 0, // Coolers don't consume power, they dissipate it
  MOTHERBOARD: {
    'mobo-z790': 40,
    'mobo-b650m': 35,
    'mobo-itx-b760i': 30,
    default: 40
  },
  RAM: 3, // Per stick
  STORAGE: {
    SSD: 3,
    HDD: 6,
    default: 5
  },
  CASE_FAN: 3, // Per fan
  CASE: 0 // Case itself doesn't consume significant power
};

// Helper function to get TDP for a component
function getComponentTDP(part) {
  if (!part || !part.id) return 0;

  switch (part.kind) {
    case 'CPU':
      return COMPONENT_TDP.CPU[part.id] || COMPONENT_TDP.CPU.default;
    case 'GPU':
      return COMPONENT_TDP.GPU[part.id] || COMPONENT_TDP.GPU.default;
    case 'Motherboard':
      return COMPONENT_TDP.MOTHERBOARD[part.id] || COMPONENT_TDP.MOTHERBOARD.default;
    case 'RAM':
      return COMPONENT_TDP.RAM;
    case 'Storage':
      const isSSD = part.interface && part.interface.includes('NVMe');
      return isSSD ? COMPONENT_TDP.STORAGE.SSD : COMPONENT_TDP.STORAGE.HDD;
    case 'Fans':
      return COMPONENT_TDP.CASE_FAN;
    case 'PSU':
      // PSU doesn't consume power, it supplies it
      return 0;
    case 'Case':
      return COMPONENT_TDP.CASE;
    default:
      return 5; // Default fallback
  }
}

// Calculate total system power consumption
export function calculateSystemPowerConsumption(installedParts) {
  let totalTDP = 0;

  Object.values(installedParts).forEach(part => {
    if (part) {
      totalTDP += getComponentTDP(part);
    }
  });

  // Add some overhead for inefficiencies, peripherals, etc.
  return Math.ceil(totalTDP * 1.2);
}

// Get PSU wattage from installed PSU
export function getPSUWattage(installedParts) {
  const psuPart = installedParts.psu_bay;
  if (!psuPart) return 0;

  // Extract wattage from PSU name or ID
  const wattageMatch = (psuPart.name || psuPart.id).match(/(\d+)\s*W/i);
  if (wattageMatch) {
    return parseInt(wattageMatch[1]);
  }

  // Default values based on PSU ID/name
  if (psuPart.id === 'psu-atx-750') return 750;
  if (psuPart.id === 'psu-atx-850') return 850;
  if (psuPart.id === 'psu-sfx-750') return 750;

  return 600; // Default fallback
}

export function checkCompatibility(installedParts, context = {}) {
  const { selectedCase, selectedMotherboard } = context;
  const errors = [];
  const warnings = [];
  const info = [];

  // Basic slot compatibility (existing logic)
  Object.keys(installedParts).forEach(slotKey => {
    const part = installedParts[slotKey];
    if (!part) return;

    // Motherboard form factor compatibility with case
    if (part.kind === 'Motherboard' && selectedCase) {
      if (!selectedCase.supportedFormFactors?.includes(part.formFactor)) {
        errors.push({
          type: 'ERROR',
          message: `${part.name} (${part.formFactor}) is not compatible with ${selectedCase.name} (supports: ${selectedCase.supportedFormFactors.join(', ')})`,
          suggestion: `Choose a ${part.formFactor} case or a different motherboard.`
        });
      }
    }

    // CPU socket compatibility with motherboard
    if (part.kind === 'CPU' && selectedMotherboard) {
      if (part.socket !== selectedMotherboard.socket) {
        errors.push({
          type: 'ERROR',
          message: `${part.name} (socket ${part.socket}) is not compatible with ${selectedMotherboard.name} (socket ${selectedMotherboard.socket})`,
          suggestion: `Choose a CPU with socket ${selectedMotherboard.socket} or a motherboard with socket ${part.socket}.`
        });
      }
    }

    // RAM type compatibility with motherboard
    if (part.kind === 'RAM' && selectedMotherboard) {
      if (part.ramType !== selectedMotherboard.ramType) {
        errors.push({
          type: 'ERROR',
          message: `${part.name} (${part.ramType}) is not compatible with ${selectedMotherboard.name} (${selectedMotherboard.ramType})`,
          suggestion: `Choose ${selectedMotherboard.ramType} RAM or a motherboard that supports ${part.ramType}.`
        });
      }

      // Check RAM slot limits
      const ramSlots = Object.keys(installedParts).filter(key =>
        key.startsWith('ram') && installedParts[key] !== null
      ).length;

      if (ramSlots > (selectedMotherboard.maxRamSlots || 4)) {
        warnings.push({
          type: 'WARNING',
          message: `You have installed ${ramSlots} RAM sticks but ${selectedMotherboard.name} only supports ${selectedMotherboard.maxRamSlots} sticks.`,
          suggestion: `Remove excess RAM sticks to stay within the limit of ${selectedMotherboard.maxRamSlots}.`
        });
      }
    }

    // GPU length compatibility with case
    if (part.kind === 'GPU' && selectedCase) {
      const gpuLength = part.lengthMm || 0;
      const maxLength = selectedCase.maxGpuLengthMm || 0;

      if (gpuLength > maxLength) {
        errors.push({
          type: 'ERROR',
          message: `${part.name} (${gpuLength}mm) is too long for ${selectedCase.name} (max: ${maxLength}mm)`,
          suggestion: `Choose a GPU shorter than ${maxLength}mm or a case with better GPU clearance.`
        });
      } else if (gpuLength > maxLength * 0.9) {
        warnings.push({
          type: 'WARNING',
          message: `${part.name} (${gpuLength}mm) is very close to the maximum GPU length for ${selectedCase.name} (${maxLength}mm)`,
          suggestion: `Verify fitment before purchase or consider a shorter GPU for easier installation.`
        });
      }
    }

    // PSU form factor compatibility with case
    if (part.kind === 'PSU' && selectedCase) {
      if (part.formFactor !== selectedCase.psuFormFactor) {
        errors.push({
          type: 'ERROR',
          message: `${part.name} (${part.formFactor}) is not compatible with ${selectedCase.name} (requires: ${selectedCase.psuFormFactor})`,
          suggestion: `Choose a PSU with form factor ${selectedCase.psuFormFactor} or a case that supports ${part.formFactor}.`
        });
      }
    }

    // Fan size compatibility with case
    if (part.kind === 'Fans' && selectedCase) {
      if (!selectedCase.fanSizes?.includes(part.sizeMm)) {
        warnings.push({
          type: 'WARNING',
          message: `${part.name} (${part.sizeMm}mm) may not be compatible with ${selectedCase.name} (supported sizes: ${selectedCase.fanSizes?.join(', ') || 'unknown'})`,
          suggestion: `Verify fan mount compatibility or choose a ${selectedCase.fanSizes?.join('mm or ')}mm fan.`
        });
      }
    }
  });

  // Power supply adequacy check
  const psuWattage = getPSUWattage(installedParts);
  const totalPowerDraw = calculateSystemPowerConsumption(installedParts);

  if (psuWattage > 0 && totalPowerDraw > 0) {
    const powerUsagePercentage = (totalPowerDraw / psuWattage) * 100;

    if (powerUsagePercentage > 90) {
      errors.push({
        type: 'ERROR',
        message: `Estimated power draw (${totalPowerDraw}W) exceeds PSU capacity (${psuWattage}W) by ${Math.round(powerUsagePercentage - 90)}%`,
        suggestion: `Upgrade to a PSU with at least ${Math.ceil(totalPowerDraw * 1.2)}W or reduce power consumption by changing components.`
      });
    } else if (powerUsagePercentage > 80) {
      warnings.push({
        type: 'WARNING',
        message: `Estimated power draw (${totalPowerDraw}W) is ${Math.round(powerUsagePercentage)}% of PSU capacity (${psuWattage}W)`,
        suggestion: `Consider a higher wattage PSU for better efficiency and headroom, especially if planning future upgrades.`
      });
    } else {
      info.push({
        type: 'INFO',
        message: `Power draw: ${totalPowerDraw}W / ${psuWattage}W (${Math.round(powerUsagePercentage)}% utilization)`,
        suggestion: `Your PSU provides adequate headroom for this configuration.`
      });
    }
  }

  // Component count validations
  const ramCount = Object.keys(installedParts).filter(key =>
    key.startsWith('ram') && installedParts[key] !== null
  ).length;

  if (ramCount > 0 && ramCount % 2 !== 0 && selectedMotherboard) {
    // Odd number of RAM sticks might not be optimal for dual channel
    warnings.push({
      type: 'WARNING',
      message: `You have installed ${ramCount} RAM stick(s). For optimal dual-channel performance, consider using 2 or 4 sticks.`,
      suggestion: `Install RAM in pairs (2 or 4 sticks) for best memory performance.`
    });
  }

  // GPU power warning (if high-end GPU with potentially inadequate PSU)
  const gpuPart = Object.values(installedParts).find(p => p && p.kind === 'GPU');
  if (gpuPart && psuWattage > 0) {
    const gpuTDP = getComponentTDP(gpuPart);
    if (gpuTDP > 300 && psuWattage < 600) {
      warnings.push({
        type: 'WARNING',
        message: `Your ${gpuPart.name} (${gpuTDP}W TDP) may be pushing the limits of your ${psuWattage}W PSU under heavy load.`,
        suggestion: `Consider a PSU of 650W or higher for stable operation with this GPU.`
      });
    }
  }

  return { errors, warnings, info };
}

// Legacy function for backward compatibility
export function canInstallPart(part, slotKey, context = {}) {
  const { errors } = checkCompatibility({ [slotKey]: part }, context);
  return errors.length === 0;
}