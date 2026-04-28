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
    // Adjust Z offset based on part type for proper depth alignment
    const zOffset = slotKey === 'pcie1' ? 0.0 : slotKey === 'psu_bay' ? 0.0 : 0.03;
    group.position.set(position[0], position[1], position[2] + zOffset);
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
      // GPU main body/shroud - positioned to sit in the PCIe slot
      const card = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.42), this.material({ color: 0x1e242e, roughness: 0.74, metalness: 0.1 }));
      card.position.set(0.0, -0.08, 0.35);
      group.add(card);

      // GPU PCB - extends from the bracket into the card
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.08), this.material({ color: 0x2a4a3a, roughness: 0.8, metalness: 0.05 }));
      pcb.position.set(0.1, -0.05, 0.18);
      group.add(pcb);

      // Rear bracket - mounts to the case backpanel (critical for proper alignment)
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 0.18), this.material({ color: 0xc4d0df, roughness: 0.5, metalness: 0.3 }));
      bracket.position.set(-1.42, -0.08, -0.02);
      group.add(bracket);

      // Bracket cutout for ventilation
      const bracketCutout = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.12), this.material({ color: 0x1a1f28, roughness: 0.7 }));
      bracketCutout.position.set(-1.42, -0.08, -0.02);
      group.add(bracketCutout);

      // Dual fan assembly
      const fanOne = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 24), this.material({ color: 0x1a1f28, roughness: 0.85, metalness: 0.05 }));
      fanOne.rotation.x = Math.PI / 2;
      fanOne.position.set(-0.55, -0.08, 0.52);
      group.add(fanOne);

      // Fan blades for first fan
      for (let i = 0; i < 9; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.08), this.material({ color: 0x2a3545 }));
        blade.position.set(-0.55, -0.08 + Math.cos((i / 9) * Math.PI * 2) * 0.12, 0.52 + Math.sin((i / 9) * Math.PI * 2) * 0.12);
        blade.rotation.z = (i / 9) * Math.PI * 2;
        group.add(blade);
      }

      const fanTwo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 24), this.material({ color: 0x1a1f28, roughness: 0.85, metalness: 0.05 }));
      fanTwo.rotation.x = Math.PI / 2;
      fanTwo.position.set(0.55, -0.08, 0.52);
      group.add(fanTwo);

      // Fan blades for second fan
      for (let i = 0; i < 9; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.08), this.material({ color: 0x2a3545 }));
        blade.position.set(0.55, -0.08 + Math.cos((i / 9) * Math.PI * 2) * 0.12, 0.52 + Math.sin((i / 9) * Math.PI * 2) * 0.12);
        blade.rotation.z = (i / 9) * Math.PI * 2;
        group.add(blade);
      }

      // Center hub for fans
      const hubOne = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), this.material({ color: 0x3a4555, roughness: 0.7, metalness: 0.15 }));
      hubOne.rotation.x = Math.PI / 2;
      hubOne.position.set(-0.55, -0.08, 0.52);
      group.add(hubOne);

      const hubTwo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), this.material({ color: 0x3a4555, roughness: 0.7, metalness: 0.15 }));
      hubTwo.rotation.x = Math.PI / 2;
      hubTwo.position.set(0.55, -0.08, 0.52);
      group.add(hubTwo);

      // Top shroud/cover with angular design
      const shroud = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.15, 0.35), this.material({ color: 0x2a3545, roughness: 0.6, metalness: 0.2 }));
      shroud.position.set(0.0, 0.38, 0.35);
      group.add(shroud);

      // RGB light strip along the edge
      const rgbStrip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.02), this.material({ color: 0x4a9eff, roughness: 0.3, metalness: 0.4, emissive: 0x2a5f9f, emissiveIntensity: 0.3 }));
      rgbStrip.position.set(0.0, 0.32, 0.52);
      group.add(rgbStrip);

      // Power connector at the end
      const powerConnector = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.1), this.material({ color: 0x1a1f28, roughness: 0.8 }));
      powerConnector.position.set(1.25, -0.08, 0.35);
      group.add(powerConnector);
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
      // Main PSU housing
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.4), this.material({ color: 0x1a1f28, roughness: 0.7, metalness: 0.15 }));
      body.position.set(0, 0, -0.1);
      group.add(body);

      // Front fan grill with hex pattern
      const grillPlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.04), this.material({ color: 0x2a313d, roughness: 0.6, metalness: 0.2 }));
      grillPlate.position.set(0, 0, 0.68);
      group.add(grillPlate);

      // Hex hole pattern for grill
      const hexHoleMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.9 });
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
          const offsetX = (col - 1.5) * 0.28;
          const offsetY = (row - 2) * 0.18;
          const hexHole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6), hexHoleMaterial);
          hexHole.rotation.x = Math.PI / 2;
          hexHole.position.set(offsetX, offsetY, 0.7);
          group.add(hexHole);
        }
      }

      // Center fan hub visible through grill
      const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), this.material({ color: 0x1a1f28, roughness: 0.8 }));
      fanHub.rotation.x = Math.PI / 2;
      fanHub.position.set(0, 0, 0.69);
      group.add(fanHub);

      // Fan blades inside
      for (let i = 0; i < 9; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.06), this.material({ color: 0x2a3545 }));
        blade.position.set(0, Math.cos((i / 9) * Math.PI * 2) * 0.1, 0.65 + Math.sin((i / 9) * Math.PI * 2) * 0.1);
        blade.rotation.z = (i / 9) * Math.PI * 2;
        group.add(blade);
      }

      // Rear connector panel
      const connectorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.04), this.material({ color: 0x2a313d, roughness: 0.5, metalness: 0.25 }));
      connectorPanel.position.set(-0.65, 0.2, 0.1);
      group.add(connectorPanel);

      // Power switch
      const powerSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03), this.material({ color: 0x1a1f28, roughness: 0.7 }));
      powerSwitch.position.set(-0.55, 0.25, 0.13);
      group.add(powerSwitch);

      // AC power socket
      const acSocket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.02), this.material({ color: 0x0a0f18, roughness: 0.9 }));
      acSocket.position.set(-0.65, 0.1, 0.13);
      group.add(acSocket);

      // Modular cable ports (for semi-modular PSUs)
      const modularPorts = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.03), this.material({ color: 0x1a1f28, roughness: 0.8 }));
      modularPorts.position.set(-0.45, -0.1, 0.13);
      group.add(modularPorts);

      // PSU label/specs sticker
      const label = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.01), this.material({ color: 0xd4dce8, roughness: 0.6, metalness: 0.1 }));
      label.position.set(0, 0, -0.71);
      group.add(label);

      // Ventilation slots on sides
      const ventSlotMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.95 });
      for (let i = 0; i < 8; i++) {
        const ventLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.08), ventSlotMaterial);
        ventLeft.position.set(-0.76, -0.2 + (i * 0.12), 0);
        group.add(ventLeft);

        const ventRight = ventLeft.clone();
        ventRight.position.set(0.76, -0.2 + (i * 0.12), 0);
        group.add(ventRight);
      }
    } else if (slotKey.startsWith('fan_') || kind === 'Fans') {
      const fanSize = slotKey.includes('rear') ? 0.9 : 1.08;
      const housing = new THREE.Mesh(new THREE.BoxGeometry(fanSize, fanSize, 0.1), this.material({ color: 0x2a3444, roughness: 0.84, metalness: 0.06 }));
      if (slotKey.startsWith('fan_top')) {
        housing.rotation.x = Math.PI / 2;
      }
      group.add(housing);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(fanSize * 0.36, fanSize * 0.36, 0.09, 24), this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 }));
      if (slotKey.startsWith('fan_front') || slotKey.startsWith('fan_rear')) {
        ring.rotation.x = Math.PI / 2;
      }
      group.add(ring);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 12), this.material({ color: 0x465264, roughness: 0.72, metalness: 0.1 }));
      if (slotKey.startsWith('fan_front') || slotKey.startsWith('fan_rear')) {
        hub.rotation.x = Math.PI / 2;
      }
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
