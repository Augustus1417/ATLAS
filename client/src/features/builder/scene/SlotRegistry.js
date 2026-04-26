export default class SlotRegistry {
  constructor() {
    this.slots = new Map();
  }

  register(slotKey, mesh, meta) {
    this.slots.set(slotKey, { mesh, meta });
  }

  clear() {
    this.slots.clear();
  }

  get(slotKey) {
    return this.slots.get(slotKey);
  }

  values() {
    return [...this.slots.values()];
  }

  meshes() {
    return this.values().map((entry) => entry.mesh);
  }
}
