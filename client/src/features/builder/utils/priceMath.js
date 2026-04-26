export function sumInstalledParts(installedParts) {
  return Object.values(installedParts).reduce((total, part) => total + Number(part?.price || 0), 0);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}
