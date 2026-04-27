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
      // The case itself is modeled by BoardScene; avoid rendering a second overlay panel.
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

      const coolerBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), this.material({ color: 0x2a2f37, roughness: 0.74, metalness: 0.12 }));
      coolerBase.position.z = 0.11;
      group.add(coolerBase);

      const coolerTower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.48), this.material({ color: 0x495569, roughness: 0.72, metalness: 0.2 }));
      coolerTower.position.z = 0.36;
      group.add(coolerTower);

      const coolerFan = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 18), this.material({ color: 0x1e242d, roughness: 0.82, metalness: 0.06 }));
      coolerFan.rotation.y = Math.PI / 2;
      coolerFan.position.set(0, 0, 0.36);
      group.add(coolerFan);
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
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.98, 2.9), this.material({ color: 0x1e242e, roughness: 0.74, metalness: 0.1 }));
      card.position.z = 1.2;
      group.add(card);

      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.16), this.material({ color: 0x8f98a8, roughness: 0.62, metalness: 0.15 }));
      bracket.position.set(0, 0, -0.25);
      group.add(bracket);

      const fanOne = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 20), this.material({ color: 0x2a313b, roughness: 0.82, metalness: 0.05 }));
      fanOne.rotation.x = Math.PI / 2;
      fanOne.position.set(0, 0, 0.62);
      group.add(fanOne);

      const fanTwo = fanOne.clone();
      fanTwo.position.set(0, 0, 1.78);
      group.add(fanTwo);

      const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 2.88), this.material({ color: 0x242d39, roughness: 0.84, metalness: 0.05 }));
      sidePlate.position.set(0, -0.39, 1.2);
      group.add(sidePlate);
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
      const drive = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.13), this.material({ color: 0x515a67, roughness: 0.82, metalness: 0.08 }));
      group.add(drive);

      const label = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.01), this.material({ color: 0xd7dde8, roughness: 0.92, metalness: 0.01 }));
      label.position.z = 0.07;
      group.add(label);
    } else if (slotKey === 'psu_bay' || kind === 'PSU') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.2, 2.0), this.material({ color: 0x22272f, roughness: 0.84, metalness: 0.08 }));
      body.position.z = -0.08;
      group.add(body);

      const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 20), this.material({ color: 0x4f5969, roughness: 0.72, metalness: 0.1 }));
      grill.rotation.x = Math.PI / 2;
      grill.position.set(0, 0, 0.9);
      group.add(grill);
    } else if (slotKey.startsWith('fan_') || kind === 'Fans') {
      const fanSize = slotKey.includes('rear') ? 0.9 : 1.08;
      const housing = new THREE.Mesh(new THREE.BoxGeometry(fanSize, fanSize, 0.1), this.material({ color: 0x2a3444, roughness: 0.84, metalness: 0.06 }));
      group.add(housing);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(fanSize * 0.36, fanSize * 0.36, 0.09, 24), this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 }));
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 12), this.material({ color: 0x465264, roughness: 0.72, metalness: 0.1 }));
      hub.rotation.x = Math.PI / 2;
      group.add(hub);

      if (slotKey.includes('top')) {
        group.rotation.z = Math.PI / 2;
      }
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
