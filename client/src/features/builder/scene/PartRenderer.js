import * as THREE from 'three';

export default class PartRenderer {
  constructor(boardGroup) {
    this.boardGroup = boardGroup;
    this.rendered = new Map();
  }

  material(config) {
    return new THREE.MeshStandardMaterial({
      ...config,
      roughness: config.roughness ?? 0.7,
      metalness: config.metalness ?? 0.1,
    });
  }

  renderInstalledPart(slotKey, slotRecord, part) {
    this.clear(slotKey);

    const group = new THREE.Group();
    const position = slotRecord?.meta?.pos || slotRecord?.mesh?.position || [0, 0, 0];
    group.position.set(position[0], position[1], position[2] + 0.03);
    const kind = part?.kind || part?.category;

    if (slotKey === 'case_shell' || kind === 'Case') {
      // Case is handled by BoardScene, not rendered here
      return null;
    } else if (slotKey === 'mobo' || kind === 'Motherboard') {
      group.add(this.createMotherboard(part));
    } else if (slotKey === 'cpu_socket') {
      group.add(this.createCPU(part));
    } else if (slotKey.startsWith('ram') || kind === 'RAM') {
      group.add(this.createRAM(part));
    } else if (slotKey === 'pcie1' || kind === 'GPU') {
      group.add(this.createGPU(part));
    } else if (slotKey.startsWith('m2') || (kind === 'Storage' && part?.interface === 'NVMe')) {
      group.add(this.createNVMeSSD(part));
    } else if (slotKey === 'sata1' || (kind === 'Storage' && part?.interface === 'SATA')) {
      group.add(this.createSATAHDD(part));
    } else if (slotKey === 'psu_bay' || kind === 'PSU') {
      group.add(this.createPSU(part));
    } else if (slotKey.startsWith('fan_') || kind === 'Fans') {
      group.add(this.createCaseFan(part));
    }

    if (!group.children.length) return null;

    this.boardGroup.add(group);
    this.rendered.set(slotKey, group);
    return group;
  }

  createMotherboard(part) {
    const group = new THREE.Group();

    // Main PCB
    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(3.65, 3.2, 0.08),
      this.material({ color: 0x2d5b3a, roughness: 0.82, metalness: 0.04 })
    );
    group.add(pcb);

    // CPU Socket with detailed pins
    const socketBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.95, 0.09),
      this.material({ color: 0x3a3f48, roughness: 0.72, metalness: 0.16 })
    );
    socketBase.position.set(-0.75, 0.62, 0.09);
    group.add(socketBase);

    // CPU socket pins (simplified grid)
    const pinGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.02);
    const pinMaterial = this.material({ color: 0xc4973a, roughness: 0.55, metalness: 0.25 });
    for (let x = -0.4; x <= 0.4; x += 0.05) {
      for (let y = -0.4; y <= 0.4; y += 0.05) {
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.set(-0.75 + x, 0.62 + y, 0.12);
        group.add(pin);
      }
    }

    // PCIe Slots
    const pcie = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.1),
      this.material({ color: 0x222a34, roughness: 0.86, metalness: 0.05 })
    );
    pcie.position.set(-0.35, -0.62, 0.08);
    group.add(pcie);

    // PCIe slot details (gold contacts)
    for (let i = 0; i < 40; i++) {
      const contact = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.008, 0.005),
        this.material({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 })
      );
      contact.position.set(-0.35 + 0.05 * i, -0.62, 0.085);
      group.add(contact);
    }

    // RAM Slots
    [0.72, 0.96].forEach((xOffset) => {
      const ramRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.32, 0.1),
        this.material({ color: 0x2a313d, roughness: 0.82, metalness: 0.08 })
      );
      ramRail.position.set(xOffset, 0.18, 0.08);
      group.add(ramRail);

      // RAM slot clips
      const clip = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.3, 0.08),
        this.material({ color: 0x666666, roughness: 0.6, metalness: 0.2 })
      );
      clip.position.set(xOffset, -0.4, 0.1);
      group.add(clip);
    });

    // M.2 Slot
    const m2Slot = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.08, 0.12),
      this.material({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 })
    );
    m2Slot.position.set(-0.2, -0.92, 0.1);
    group.add(m2Slot);

    // 24-pin Power Connector
    const powerConn = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.08, 0.06),
      this.material({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.1 })
    );
    powerConn.position.set(1.2, -1.2, 0.1);
    group.add(powerConn);

    // VRM Heatsink
    const vrmBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.03),
      this.material({ color: 0x1b1f25, roughness: 0.7, metalness: 0.1 })
    );
    vrmBase.position.set(-1.2, 1.0, 0.11);
    group.add(vrmBase);

    // VRM fins
    for (let i = 0; i < 10; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.5, 0.03),
        this.material({ color: 0x1b1f25, roughness: 0.7, metalness: 0.1 })
      );
      fin.position.set(-1.2 + i * 0.08, 1.0, 0.13);
      group.add(fin);
    }

    // Chipset Heatsink
    const chipset = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.04),
      this.material({ color: 0x1b1f25, roughness: 0.7, metalness: 0.1 })
    );
    chipset.position.set(-1.8, 1.2, 0.11);
    group.add(chipset);

    // I/O Shield Area
    const ioShield = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.92, 0.02),
      this.material({ color: 0xbdc8d8, roughness: 0.62, metalness: 0.22 })
    );
    ioShield.position.set(-0.05, 0.46, -0.1);
    group.add(ioShield);

    // I/O Ports (simplified)
    const ioPorts = [
      { x: -0.12, y: 0.26, w: 0.16, h: 0.12 }, // USB-A
      { x: 0.08, y: 0.26, w: 0.16, h: 0.12 },  // USB-A
      { x: -0.12, y: 0.08, w: 0.16, h: 0.12 }, // USB 2.0
      { x: 0.08, y: 0.08, w: 0.16, h: 0.12 },   // USB 2.0
      { x: -0.12, y: -0.1, w: 0.16, h: 0.12 },  // Ethernet
      { x: 0.08, y: -0.1, w: 0.16, h: 0.12 },   // Audio
    ];

    const ioPortMaterial = this.material({ color: 0x11151d, roughness: 0.72, metalness: 0.1 });
    ioPorts.forEach((port) => {
      const portMesh = new THREE.Mesh(
        new THREE.BoxGeometry(port.w, port.h, 0.02),
        ioPortMaterial
      );
      portMesh.position.set(-0.05 + port.x, 0.46 + port.y, -0.09);
      group.add(portMesh);
    });

    // SATA Ports
    for (let i = 0; i < 4; i++) {
      const sataPort = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.03),
        this.material({ color: 0x666666, roughness: 0.8, metalness: 0.2 })
      );
      sataPort.position.set(1.5, -1.0 + i * 0.15, 0.09);
      group.add(sataPort);
    }

    return group;
  }

  createCPU(part) {
    const group = new THREE.Group();

    // CPU Package
    const packageBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.08),
      this.material({ color: 0x3f444b, roughness: 0.65, metalness: 0.14 })
    );
    group.add(packageBase);

    // Integrated Heat Spreader (IHS)
    const ihs = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.72, 0.03),
      this.material({ color: 0xadb6bf, roughness: 0.5, metalness: 0.2 })
    );
    ihs.position.z = 0.055;
    group.add(ihs);

    // CPU Die (visible on top)
    const die = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.01),
      this.material({ color: 0x888888, roughness: 0.6, metalness: 0.3 })
    );
    die.position.z = 0.07;
    group.add(die);

    // Pin Grid Array (bottom)
    const pinGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.01);
    const pinMaterial = this.material({ color: 0xc4973a, roughness: 0.55, metalness: 0.25 });
    const pinsPerSide = 40;
    const pinSpacing = 0.8 / (pinsPerSide - 1);

    for (let i = 0; i < pinsPerSide; i++) {
      for (let j = 0; j < pinsPerSide; j++) {
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        const offset = -0.4 + i * pinSpacing;
        pin.position.set(-0.45 + offset, -0.45 + offset, -0.045);
        group.add(pin);
      }
    }

    return group;
  }

  createCPUCooler(part) {
    const group = new THREE.Group();

    // Heat pipes (copper)
    const heatPipeMaterial = this.material({ color: 0xb87333, roughness: 0.4, metalness: 0.6 });
    for (let i = 0; i < 2; i++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8),
        heatPipeMaterial
      );
      pipe.position.set(-0.15 + i * 0.3, 0.2, 0);
      pipe.rotation.z = Math.PI / 2;
      group.add(pipe);
    }

    // Fin stack (aluminum)
    const finMaterial = this.material({ color: 0xadb6bf, roughness: 0.5, metalness: 0.3 });
    for (let i = 0; i < 20; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.4, 0.005),
        finMaterial
      );
      fin.position.set(0, -0.2 + i * 0.04, 0);
      group.add(fin);
    }

    // Fan housing
    const fanHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.02, 24),
      this.material({ color: 0x2a3444, roughness: 0.84, metalness: 0.06 })
    );
    fanHousing.position.set(0, 0.25, 0);
    group.add(fanHousing);

    // Fan blades
    const bladeMaterial = this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 });
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.02, 0.005),
        bladeMaterial
      );
      blade.position.set(0, 0.25, 0);
      blade.rotation.z = i * (Math.PI * 2 / 7);
      group.add(blade);
    }

    // Fan hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12),
      this.material({ color: 0x465264, roughness: 0.72, metalness: 0.1 })
    );
    hub.position.set(0, 0.25, 0);
    group.add(hub);

    return group;
  }

  createRAM(part) {
    const group = new THREE.Group();

    // PCB
    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 1.3, 0.3),
      this.material({ color: 0x20262d, roughness: 0.82, metalness: 0.08 })
    );
    group.add(pcb);

    // Heat spreader
    const spreader = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 1.1, 0.28),
      this.material({ color: 0x5b3f43, roughness: 0.64, metalness: 0.16 })
    );
    group.add(spreader);

    // Memory chips
    const chipMaterial = this.material({ color: 0x171b22, roughness: 0.72, metalness: 0.1 });
    for (let i = 0; i < 8; i++) {
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.09, 0.06),
        chipMaterial
      );
      chip.position.set(0, -0.43 + i * 0.28, 0.15);
      group.add(chip);
    }

    // Gold contacts
    const contactMaterial = this.material({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
    for (let i = 0; i < 10; i++) {
      const contact = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.08, 0.02),
        contactMaterial
      );
      contact.position.set(0, -0.55 + i * 0.12, -0.16);
      group.add(contact);
    }

    return group;
  }

  createGPU(part) {
    const group = new THREE.Group();

    // Graphics card PCB
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.88, 0.32),
      this.material({ color: 0x1e242e, roughness: 0.74, metalness: 0.1 })
    );
    group.add(card);

    // GPU Shroud
    const shroud = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.8, 0.28),
      this.material({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.05 })
    );
    shroud.position.set(0, 0, 0.02);
    group.add(shroud);

    // GPU Fans (3 fans)
    const fanPositions = [-0.6, 0, 0.6];
    fanPositions.forEach((xPos) => {
      // Fan housing
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.08, 20),
        this.material({ color: 0x2a313b, roughness: 0.82, metalness: 0.05 })
      );
      housing.rotation.x = Math.PI / 2;
      housing.position.set(xPos, 0, 0.18);
      group.add(housing);

      // Fan blades (7 blades per fan)
      const bladeMaterial = this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 });
      for (let i = 0; i < 7; i++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.015, 0.003),
          bladeMaterial
        );
        blade.position.set(xPos, 0, 0.18);
        blade.rotation.z = i * (Math.PI * 2 / 7);
        group.add(blade);
      }

      // Fan hub
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12),
        this.material({ color: 0x465264, roughness: 0.72, metalness: 0.1 })
      );
      hub.position.set(xPos, 0, 0.18);
      group.add(hub);
    });

    // GPU I/O Bracket
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.8, 0.5),
      this.material({ color: 0x8f98a8, roughness: 0.62, metalness: 0.15 })
    );
    bracket.position.set(-1.08, 0, 0.02);
    group.add(bracket);

    // Display ports on bracket
    const portMaterial = this.material({ color: 0x11151d, roughness: 0.72, metalness: 0.1 });
    // DisplayPorts (3)
    for (let i = 0; i < 3; i++) {
      const dp = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.06, 0.005),
        portMaterial
      );
      dp.position.set(-1.08, -0.2 + i * 0.2, 0.025);
      group.add(dp);
    }
    // HDMI
    const hdmi = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.06, 0.005),
      portMaterial
    );
    hdmi.position.set(-1.08, 0.3, 0.025);
    group.add(hdmi);

    // PCIe Gold Fingers
    const fingerMaterial = this.material({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
    for (let i = 0; i < 80; i++) {
      const finger = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.03, 0.002),
        fingerMaterial
      );
      finger.position.set(-1.08 + i * 0.027, -0.4, 0.01);
      group.add(finger);
    }

    // GPU Die (visible through fan)
    const die = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.01),
      this.material({ color: 0x888888, roughness: 0.6, metalness: 0.3 })
    );
    die.position.set(-0.2, 0.15, 0.17);
    group.add(die);

    // VRAM chips
    const vramMaterial = this.material({ color: 0x171b22, roughness: 0.72, metalness: 0.1 });
    for (let i = 0; i < 8; i++) {
      const vram = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.05, 0.02),
        vramMaterial
      );
      vram.position.set(0.3, -0.3 + i * 0.1, 0.1);
      group.add(vram);
    }

    return group;
  }

  createNVMeSSD(part) {
    const group = new THREE.Group();

    // SSD Stick
    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.07, 0.1),
      this.material({ color: 0x26303c, roughness: 0.8, metalness: 0.08 })
    );
    stick.position.x = -0.12;
    group.add(stick);

    // Controller chip
    const controller = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 0.06),
      this.material({ color: 0x191d24, roughness: 0.72, metalness: 0.08 })
    );
    controller.position.set(-0.5, 0, 0.03);
    group.add(controller);

    // NAND chips
    const nandMaterial = this.material({ color: 0x191d24, roughness: 0.72, metalness: 0.08 });
    for (let i = 0; i < 8; i++) {
      const nand = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.07),
        nandMaterial
      );
      nand.position.set(-0.5 + i * 0.34, 0, 0.05);
      group.add(nand);
    }

    // Gold connector
    const connector = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.07, 0.01),
      this.material({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 })
    );
    connector.position.set(0.5, 0, 0.05);
    group.add(connector);

    return group;
  }

  createSATAHDD(part) {
    const group = new THREE.Group();

    // Hard drive body
    const drive = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.52, 0.18),
      this.material({ color: 0x515a67, roughness: 0.82, metalness: 0.08 })
    );
    group.add(drive);

    // Drive lid
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.5, 0.02),
      this.material({ color: 0x424d56, roughness: 0.8, metalness: 0.1 })
    );
    lid.position.z = 0.09;
    group.add(lid);

    // SATA connector
    const sataConn = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.12, 0.02),
      this.material({ color: 0x666666, roughness: 0.8, metalness: 0.2 })
    );
    sataConn.position.set(-0.36, 0, 0.1);
    group.add(sataConn);

    // Power connector
    const powerConn = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.05, 0.02),
      this.material({ color: 0x666666, roughness: 0.8, metalness: 0.2 })
    );
    powerConn.position.set(-0.36, -0.22, 0.1);
    group.add(powerConn);

    // Drive details (platters visible through top)
    const platterMaterial = this.material({ color: 0x888888, roughness: 0.6, metalness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const platter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.005, 24),
        platterMaterial
      );
      platter.position.set(0, -0.15 + i * 0.08, 0.02);
      platter.rotation.x = Math.PI / 2;
      group.add(platter);
    }

    return group;
  }

  createPSU(part) {
    const group = new THREE.Group();

    // Main PSU body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.95, 1.45),
      this.material({ color: 0x22272f, roughness: 0.84, metalness: 0.08 })
    );
    group.add(body);

    // PSU Fan Grille
    const grill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.03, 20),
      this.material({ color: 0x4f5969, roughness: 0.72, metalness: 0.1 })
    );
    grill.rotation.x = Math.PI / 2;
    grill.position.set(0, 0, 0.73);
    group.add(grill);

    // Fan blades inside PSU
    const bladeMaterial = this.material({ color: 0x2a313b, roughness: 0.82, metalness: 0.05 });
    for (let i = 0; i < 6; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.02, 0.005),
        bladeMaterial
      );
      blade.position.set(0, 0, 0.73);
      blade.rotation.z = i * (Math.PI * 2 / 6);
      group.add(blade);
    }

    // Modular port panel
    const portPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.6, 0.02),
      this.material({ color: 0x22272f, roughness: 0.84, metalness: 0.08 })
    );
    portPanel.position.set(0, -0.3, 0.74);
    group.add(portPanel);

    // Modular port connectors (color-coded)
    const portTypes = [
      { color: 0xff6b6b, label: 'PCIe' },   // Red
      { color: 0x4ecdc4, label: 'SATA' },    // Teal
      { color: 0x45b7d1, label: 'CPU' },    // Blue
      { color: 0xffbe0b, label: 'PERIPH' }, // Yellow
    ];

    portTypes.forEach((type, index) => {
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.08, 0.01),
        this.material({ color: type.color, roughness: 0.4, metalness: 0.6 })
      );
      port.position.set(-0.08 + index * 0.05, -0.3, 0.745);
      group.add(port);
    });

    // PSU label/sticker
    const label = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.3, 0.01),
      this.material({ color: 0x333333, roughness: 0.9, metalness: 0.05 })
    );
    label.position.set(0, 0.2, 0.74);
    group.add(label);

    return group;
  }

  createCaseFan(part) {
    const group = new THREE.Group();

    // Fan housing
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.95, 0.1),
      this.material({ color: 0x2a3444, roughness: 0.84, metalness: 0.06 })
    );
    group.add(housing);

    // Fan ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.09, 24),
      this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Fan hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.11, 12),
      this.material({ color: 0x465264, roughness: 0.72, metalness: 0.1 })
    );
    hub.rotation.x = Math.PI / 2;
    group.add(hub);

    // Fan blades (7 blades)
    const bladeMaterial = this.material({ color: 0x202936, roughness: 0.78, metalness: 0.08 });
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.02, 0.003),
        bladeMaterial
      );
      blade.position.set(0, 0, 0);
      blade.rotation.z = i * (Math.PI * 2 / 7);
      group.add(blade);
    }

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