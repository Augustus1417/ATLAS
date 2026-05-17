/** Resolve display/save price from API component shapes. */
export function getPartPrice(component) {
  if (!component) return null;
  if (component.price != null && !Number.isNaN(Number(component.price))) {
    return Number(component.price);
  }
  if (component.latest_price?.price != null) {
    return Number(component.latest_price.price);
  }
  if (component.cheapest_price != null) {
    return Number(component.cheapest_price);
  }
  return null;
}

export function formatPrice(priceOrComponent, { unavailable = 'Price unavailable' } = {}) {
  const value =
    priceOrComponent != null && typeof priceOrComponent === 'object'
      ? getPartPrice(priceOrComponent)
      : priceOrComponent != null
        ? Number(priceOrComponent)
        : null;
  if (value == null || Number.isNaN(value) || value <= 0) {
    return unavailable;
  }
  return `₱${value.toLocaleString('en-PH')}`;
}

const CATEGORY_ALIASES = {
  cpu: 'CPU',
  processor: 'CPU',
  gpu: 'GPU',
  'graphics card': 'GPU',
  graphics: 'GPU',
  motherboard: 'Motherboard',
  mobo: 'Motherboard',
  ram: 'RAM',
  memory: 'RAM',
  storage: 'Storage',
  ssd: 'Storage',
  psu: 'PSU',
  'power supply': 'PSU',
  case: 'Case',
  cooling: 'Cooling',
  cooler: 'Cooling',
};

export function normalizeCategory(category) {
  if (!category) return 'Other';
  const key = String(category).trim().toLowerCase();
  return CATEGORY_ALIASES[key] || category;
}

function isValidHttpUrl(value) {
  return typeof value === 'string' && value.startsWith('http');
}

/** Best listing from recommendation `listings` array (matches cheapest price when possible). */
export function getCheapestListing(component) {
  if (!component?.listings?.length) return null;

  const priced = component.listings.filter(
    (l) => l?.price != null && !Number.isNaN(Number(l.price))
  );
  if (!priced.length) {
    return component.listings.find((l) => isValidHttpUrl(l?.link)) || null;
  }

  const targetPrice = getPartPrice(component);
  if (targetPrice != null) {
    const match = priced.find((l) => Number(l.price) === Number(targetPrice));
    if (match) return match;
  }

  return priced.reduce((best, item) =>
    Number(item.price) < Number(best.price) ? item : best
  );
}

/** Product listing URL from API (pricing_history, recommendations, or listings). */
export function getComponentLink(component) {
  if (!component) return null;

  let link = component.link || component.latest_price?.link;
  if (!isValidHttpUrl(link)) {
    const listing = getCheapestListing(component);
    link = listing?.link;
  }

  return isValidHttpUrl(link) ? link : null;
}

export function getComponentStore(component) {
  if (!component) return null;

  let store = component.store || component.latest_price?.store;
  if (!store) {
    const listing = getCheapestListing(component);
    store = listing?.store;
  }

  return store || null;
}

/** Open retailer link in a new tab; returns false if no link. */
export function openComponentLink(component) {
  const link = getComponentLink(component);
  if (!link) return false;
  window.open(link, '_blank', 'noopener,noreferrer');
  return true;
}

/** Group parts by canonical builder category keys. */
export function normalizePartsByCategory(partsByCategory) {
  const grouped = {};
  for (const [rawKey, parts] of Object.entries(partsByCategory || {})) {
    const key = normalizeCategory(rawKey);
    if (!grouped[key]) grouped[key] = [];
    for (const part of parts || []) {
      grouped[key].push({
        ...part,
        category: normalizeCategory(part.category || rawKey),
        price: getPartPrice(part),
        link: getComponentLink(part),
        store: getComponentStore(part),
      });
    }
  }
  return grouped;
}
