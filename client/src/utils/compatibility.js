// Simple compatibility engine using component meta.json data
export function evaluateBuild(placedMeta) {
  const issues = []
  // placedMeta: { motherboard: {...}, cpu: {...}, gpu: {...}, psu: {...}, ram: {...} }
  const mobo = placedMeta.motherboard
  const cpu = placedMeta.cpu
  const gpu = placedMeta.gpu
  const psu = placedMeta.psu
  const ram = placedMeta.ram

  // socket
  if (mobo && cpu) {
    if (mobo.socket && cpu.socket && mobo.socket.toLowerCase() !== cpu.socket.toLowerCase()) {
      issues.push({ code: 'socket-mismatch', message: `CPU socket ${cpu.socket} does not match motherboard ${mobo.socket}` })
    }
  }

  // RAM type
  if (mobo && ram) {
    if (mobo.ram_type && ram.ram_type && mobo.ram_type.toLowerCase() !== ram.ram_type.toLowerCase()) {
      issues.push({ code: 'ram-type-mismatch', message: `RAM type ${ram.ram_type} incompatible with motherboard ${mobo.ram_type}` })
    }
  }

  // GPU length
  if (gpu && mobo) {
    if (gpu.length_mm && mobo.max_gpu_length_mm && gpu.length_mm > mobo.max_gpu_length_mm) {
      issues.push({ code: 'gpu-length', message: `GPU too long (${gpu.length_mm}mm) for case/mobo clearance ${mobo.max_gpu_length_mm}mm` })
    }
  }

  // PSU wattage
  let totalTdp = 0
  if (cpu && cpu.tdp) totalTdp += cpu.tdp
  if (gpu && gpu.tdp) totalTdp += gpu.tdp
  // assume other components add 40W
  totalTdp += 40
  if (psu && psu.watt) {
    // require 20% headroom
    if (psu.watt < Math.ceil(totalTdp * 1.2)) {
      issues.push({ code: 'psu-watt', message: `PSU wattage ${psu.watt}W insufficient for estimated load ${totalTdp}W (+20% headroom)` })
    }
  }

  return { ok: issues.length === 0, issues, totalTdp }
}

export function estimatePrice(placedMeta) {
  let price = 0
  Object.values(placedMeta).forEach((m) => { if (m && m.price) price += m.price })
  return price
}
