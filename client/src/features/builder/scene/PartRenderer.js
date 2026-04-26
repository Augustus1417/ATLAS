import * as THREE from 'three';

export default class PartRenderer {
  constructor(boardGroup) {
    this.boardGroup = boardGroup;
    this.rendered = new Map();
    this.graphicsMode = 'stylized';
  }

  setGraphicsMode(mode) {
    this.graphicsMode = mode || 'stylized';
  }

  material(config) {
    const modeBoost = this.graphicsMode === 'real' ? 0.04 : 0;
    return new THREE.MeshStandardMaterial({
      ...config,
      roughness: Math.min(1, (config.roughness ?? 0.7) + modeBoost),
      metalness: Math.max(0, (config.metalness ?? 0.1) - modeBoost * 0.5),
    });
  }

  renderInstalledPart(slotKey, slotRecord, part) {
    this.clear(slotKey);

    const group = new THREE.Group();
    const position = slotRecord?.meta?.pos || slotRecord?.mesh?.position || [0, 0, 0];
    group.position.set(position[0], position[1], position[2] + 0.03);
    const kind = part?.kind || part?.category;

    if (slotKey === 'case_shell' || kind === 'Case') {
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, 6.9, 0.12),
        this.material({ color: 0x5a6677, roughness: 0.9, metalness: 0.03, transparent: true, opacity: 0.08 }),
      );
      group.add(shell);
    } else if (slotKey === 'mobo' || kind === 'Motherboard') {
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(3.65, 3.2, 0.08), this.material({ color: 0x2d5b3a, roughness: 0.82, metalness: 0.04 }));
      group.add(pcb);

      const socket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.09), this.material({ color: 0x3a3f48, roughness: 0.72, metalness: 0.16 }));
      socket.position.set(-0.75, 0.62, 0.09);
      group.add(socket);

      const pcie = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.1), this.material({ color: 0x222a34, roughness: 0.86, metalness: 0.05 }));
      pcie.position.set(-0.35, -0.62, 0.08);
      group.add(pcie);

      [0.72, 0.96].forEach((xOffset) => {
        const ramRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.32, 0.1), this.material({ color: 0x2a313d, roughness: 0.82, metalness: 0.08 }));
        ramRail.position.set(xOffset, 0.18, 0.08);
        group.add(ramRail);
      });
    } else if (slotKey === 'cpu_socket') {
      const packageBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.08), this.material({ color: 0x3f444b, roughness: 0.65, metalness: 0.14 }));
      const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.03), this.material({ color: 0xadb6bf, roughness: 0.5, metalness: 0.2 }));
      ihs.position.z = 0.055;
      group.add(packageBase);
      group.add(ihs);
    } else if (slotKey.startsWith('ram') || kind === 'RAM') {
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.3, 0.3), this.material({ color: 0x20262d, roughness: 0.82, metalness: 0.08 }));
      const spreader = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.1, 0.28), this.material({ color: 0x5b3f43, roughness: 0.64, metalness: 0.16 }));
      group.add(pcb);
      group.add(spreader);
      for (let i = 0; i < 4; i += 1) {
        const chip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.06), this.material({ color: 0x171b22, roughness: 0.72, metalness: 0.1 }));
        chip.position.set(0, -0.43 + i * 0.28, 0.15);
        group.add(chip);
      }
    } else if (slotKey === 'pcie1' || kind === 'GPU') {
      const card = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.88, 0.32), this.material({ color: 0x1e242e, roughness: 0.74, metalness: 0.1 }));
      group.add(card);

      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.5), this.material({ color: 0x8f98a8, roughness: 0.62, metalness: 0.15 }));
      bracket.position.set(-1.08, 0, 0.02);
      group.add(bracket);

      const fanOne = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 20), this.material({ color: 0x2a313b, roughness: 0.82, metalness: 0.05 }));
      fanOne.rotation.x = Math.PI / 2;
      fanOne.position.set(-0.45, 0, 0.18);
      group.add(fanOne);

      const fanTwo = fanOne.clone();
      fanTwo.position.set(0.45, 0, 0.18);
      group.add(fanTwo);
    } else if (slotKey.startsWith('m2') || (kind === 'Storage' && part?.interface === 'NVMe')) {
      const stick = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.1), this.material({ color: 0x26303c, roughness: 0.8, metalness: 0.08 }));
      stick.position.x = -0.12;
      group.add(stick);
      for (let i = 0; i < 4; i += 1) {
        const nand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.07), this.material({ color: 0x191d24, roughness: 0.72, metalness: 0.08 }));
        nand.position.set(-0.5 + i * 0.34, 0, 0.05);
        group.add(nand);
      }
    } else if (slotKey === 'sata1' || (kind === 'Storage' && part?.interface === 'SATA')) {
      const drive = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.52, 0.18), this.material({ color: 0x515a67, roughness: 0.82, metalness: 0.08 }));
      group.add(drive);
    } else if (slotKey === 'psu_bay' || kind === 'PSU') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.95, 1.45), this.material({ color: 0x22272f, roughness: 0.84, metalness: 0.08 }));
      group.add(body);

      const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 20), this.material({ color: 0x4f5969, roughness: 0.72, metalness: 0.1 }));
      grill.rotation.x = Math.PI / 2;
      grill.position.set(0, 0, 0.73);
      group.add(grill);
    } else if (slotKey.startsWith('fan_') || kind === 'Fans') {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.1), this.material({ color: 0x2a3444, roughness: 0.84, metalness: 0.06 }));
      group.add(housing);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.09, 24), this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 }));
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.11, 12), this.material({ color: 0x465264, roughness: 0.72, metalness: 0.1 }));
      hub.rotation.x = Math.PI / 2;
      group.add(hub);
    }

    if (!group.children.length) return null;

    this.boardGroup.add(group);
    this.rendered.set(slotKey, group);
    return group;
  }

  clear(slotKey) {
    const existing = this.rendered.get(slotKey);
    if (!existing) return;
    this.boardGroup.remove(existing);
    this.rendered.delete(slotKey);
  }

  clearAll() {
    [...this.rendered.keys()].forEach((slotKey) => this.clear(slotKey));
  }
}
