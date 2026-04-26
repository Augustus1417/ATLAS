export const stageOrder = ['Case', 'Motherboard', 'CPU', 'RAM', 'Storage', 'GPU', 'PSU', 'Fans'];

export const mockCatalog = {
  cases: [
    {
      id: 'case-atx-1',
      kind: 'Case',
      name: 'Titan ATX Mid Tower',
      price: 4700,
      supportedFormFactors: ['ATX', 'mATX', 'Mini-ITX'],
      maxGpuLengthMm: 390,
      psuFormFactor: 'ATX',
      fanSizes: [120, 140],
      slotHint: 'case_shell',
      casePreset: 'atx-mid',
      description: 'Balanced airflow mid-tower for most high-end builds.',
    },
    {
      id: 'case-matx-1',
      kind: 'Case',
      name: 'Pulse mATX Compact',
      price: 3200,
      supportedFormFactors: ['mATX', 'Mini-ITX'],
      maxGpuLengthMm: 330,
      psuFormFactor: 'ATX',
      fanSizes: [120],
      slotHint: 'case_shell',
      casePreset: 'matx-compact',
      description: 'Smaller chassis with moderate GPU clearance.',
    },
    {
      id: 'case-itx-1',
      kind: 'Case',
      name: 'Nebula Mini ITX SFF',
      price: 5600,
      supportedFormFactors: ['Mini-ITX'],
      maxGpuLengthMm: 305,
      psuFormFactor: 'SFX',
      fanSizes: [92, 120],
      slotHint: 'case_shell',
      casePreset: 'itx-sff',
      description: 'Small form factor case with tight thermals and clearance.',
    },
  ],
  motherboards: [
    {
      id: 'mobo-z790',
      kind: 'Motherboard',
      name: 'ASUS ROG Z790 Hero',
      price: 20500,
      socket: 'LGA1700',
      formFactor: 'ATX',
      ramType: 'DDR5',
      maxRamSlots: 4,
      pcieGen: 'PCIe 5.0',
      slotHint: 'mobo',
    },
    {
      id: 'mobo-b650m',
      kind: 'Motherboard',
      name: 'MSI MAG B650M Mortar',
      price: 9800,
      socket: 'AM5',
      formFactor: 'mATX',
      ramType: 'DDR5',
      maxRamSlots: 4,
      pcieGen: 'PCIe 4.0',
      slotHint: 'mobo',
    },
    {
      id: 'mobo-itx-b760i',
      kind: 'Motherboard',
      name: 'Gigabyte B760I Aorus',
      price: 13200,
      socket: 'LGA1700',
      formFactor: 'Mini-ITX',
      ramType: 'DDR5',
      maxRamSlots: 2,
      pcieGen: 'PCIe 4.0',
      slotHint: 'mobo',
    },
  ],
  cpu: [
    { id: 'cpu-14700k', kind: 'CPU', name: 'Intel Core i7-14700K', price: 24800, socket: 'LGA1700', slotHint: 'cpu_socket' },
    { id: 'cpu-14600k', kind: 'CPU', name: 'Intel Core i5-14600K', price: 17900, socket: 'LGA1700', slotHint: 'cpu_socket' },
    { id: 'cpu-7800x3d', kind: 'CPU', name: 'AMD Ryzen 7 7800X3D', price: 22900, socket: 'AM5', slotHint: 'cpu_socket' },
    { id: 'cpu-7600', kind: 'CPU', name: 'AMD Ryzen 5 7600', price: 13200, socket: 'AM5', slotHint: 'cpu_socket' },
  ],
  ram: [
    { id: 'ram-32-ddr5-6000', kind: 'RAM', name: 'Corsair Vengeance 32GB DDR5-6000', price: 6200, ramType: 'DDR5', slotHint: 'ram1' },
    { id: 'ram-64-ddr5-6000', kind: 'RAM', name: 'G.Skill Trident Z5 64GB DDR5-6000', price: 11500, ramType: 'DDR5', slotHint: 'ram1' },
  ],
  storage: [
    { id: 'ssd-1tb-gen4', kind: 'Storage', name: 'WD Black SN850X 1TB', price: 4600, interface: 'NVMe', slotHint: 'm2_1' },
    { id: 'ssd-2tb-gen4', kind: 'Storage', name: 'Samsung 990 Pro 2TB', price: 8900, interface: 'NVMe', slotHint: 'm2_1' },
    { id: 'hdd-4tb', kind: 'Storage', name: 'Seagate BarraCuda 4TB', price: 3900, interface: 'SATA', slotHint: 'sata1' },
  ],
  gpu: [
    { id: 'gpu-rtx-4060', kind: 'GPU', name: 'RTX 4060 8GB', price: 18900, lengthMm: 240, slotHint: 'pcie1' },
    { id: 'gpu-rtx-4070s', kind: 'GPU', name: 'RTX 4070 Super 12GB', price: 37900, lengthMm: 308, slotHint: 'pcie1' },
    { id: 'gpu-rx-7800xt', kind: 'GPU', name: 'Radeon RX 7800 XT', price: 32900, lengthMm: 315, slotHint: 'pcie1' },
    { id: 'gpu-rtx-4090', kind: 'GPU', name: 'RTX 4090 24GB', price: 109000, lengthMm: 355, slotHint: 'pcie1' },
  ],
  psu: [
    { id: 'psu-atx-750', kind: 'PSU', name: 'Seasonic Focus 750W Gold', price: 6500, formFactor: 'ATX', slotHint: 'psu_bay' },
    { id: 'psu-atx-850', kind: 'PSU', name: 'Corsair RM850e', price: 7600, formFactor: 'ATX', slotHint: 'psu_bay' },
    { id: 'psu-sfx-750', kind: 'PSU', name: 'Cooler Master V750 SFX', price: 8400, formFactor: 'SFX', slotHint: 'psu_bay' },
  ],
  fans: [
    { id: 'fan-120-pwm', kind: 'Fans', name: 'Arctic P12 PWM (120mm)', price: 600, sizeMm: 120, slotHint: 'fan_front1' },
    { id: 'fan-140-pwm', kind: 'Fans', name: 'Arctic P14 PWM (140mm)', price: 850, sizeMm: 140, slotHint: 'fan_top1' },
    { id: 'fan-92-pwm', kind: 'Fans', name: 'Noctua NF-A9 PWM (92mm)', price: 1100, sizeMm: 92, slotHint: 'fan_rear1' },
  ],
};

export const workloadPresets = ['gaming', 'editing', 'general', 'student'];

export const defaultBudgetPhp = 60000;

export const initialInstalledParts = {};
