import * as THREE from 'three';

export default class BoardScene {
  constructor(scene, slotRegistry) {
    this.scene = scene;
    this.slotRegistry = slotRegistry;
    this.group = new THREE.Group();
    this.casePreset = 'atx-mid';
    this.motherboard = null;
  }

  setCasePreset(casePreset) {
    this.casePreset = casePreset;
  }

  setMotherboard(motherboard) {
    this.motherboard = motherboard;
  }

  build() {
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.slotRegistry.clear();

    const scaleByPreset = {
      'atx-mid': { x: 1.0, y: 1.0, z: 1.0 },
      'matx-compact': { x: 0.88, y: 0.9, z: 0.9 },
      'itx-sff': { x: 0.75, y: 0.78, z: 0.78 },
    };

    const scale = scaleByPreset[this.casePreset] || scaleByPreset['atx-mid'];

    const width = 5.6 * scale.x;
    const height = 7.4 * scale.y;
    const depth = 3.6 * scale.z;
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const halfD = depth * 0.5;
    const frameThickness = 0.14;
    const rearPanelZ = -halfD + 0.12;

    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x20293a,
      roughness: 0.9,
      metalness: 0.04,
      emissive: 0x0b1018,
      emissiveIntensity: 0.08,
    });

    const faceMaterials = {
      front: new THREE.MeshStandardMaterial({ color: 0x76879d, roughness: 0.92, metalness: 0.03 }),
      rear: new THREE.MeshStandardMaterial({ color: 0x65748a, roughness: 0.92, metalness: 0.03 }),
      left: new THREE.MeshStandardMaterial({ color: 0x68788f, roughness: 0.92, metalness: 0.03 }),
      right: new THREE.MeshStandardMaterial({ color: 0x68788f, roughness: 0.92, metalness: 0.03 }),
      top: new THREE.MeshStandardMaterial({ color: 0x6f8097, roughness: 0.92, metalness: 0.03 }),
      bottom: new THREE.MeshStandardMaterial({ color: 0x5d6d84, roughness: 0.94, metalness: 0.02 }),
    };

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), shellMaterial);
    backPanel.position.set(0, 0, -halfD + 0.06);
    this.group.add(backPanel);

    const rearPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.96, height * 0.92, 0.06),
      faceMaterials.rear,
    );
    rearPanel.position.set(0, 0, -halfD + 0.12);
    this.group.add(rearPanel);

    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, depth), faceMaterials.left);
    leftPanel.position.set(-halfW + 0.04, 0, 0);
    this.group.add(leftPanel);

    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, depth), faceMaterials.right);
    rightPanel.position.set(halfW - 0.04, 0, 0);
    this.group.add(rightPanel);

    const topVentStripes = new THREE.Group();
    for (let i = 0; i < 18; i += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.92, 0.02, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0d121b, roughness: 0.94, metalness: 0.01 }),
      );
      stripe.position.set(0, halfH - 0.02, -halfD + 0.16 + i * 0.18);
      topVentStripes.add(stripe);
    }
    this.group.add(topVentStripes);

    const rearFeatureMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9e2ef,
      roughness: 0.68,
      metalness: 0.14,
      emissive: 0x203855,
      emissiveIntensity: 0.2,
    });
    const rearHoleMaterial = new THREE.MeshStandardMaterial({ color: 0x0f1622, roughness: 0.92, metalness: 0.02 });

    const rearIoPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62 * scale.x, 1.0 * scale.y, 0.03), rearFeatureMaterial);
    rearIoPlate.position.set(-1.02 * scale.x, 0.95 * scale.y, rearPanelZ - 0.05);
    this.group.add(rearIoPlate);

    const rearIoHole = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale.x, 0.86 * scale.y, 0.02), rearHoleMaterial);
    rearIoHole.position.set(rearIoPlate.position.x, rearIoPlate.position.y, rearIoPlate.position.z + 0.01);
    this.group.add(rearIoHole);

    const pcieStackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.74 * scale.x, 1.2 * scale.y, 0.03), rearFeatureMaterial);
    pcieStackFrame.position.set(-0.2 * scale.x, -0.05 * scale.y, rearPanelZ - 0.05);
    this.group.add(pcieStackFrame);

    for (let i = 0; i < 7; i += 1) {
      const pcieSlot = new THREE.Mesh(new THREE.BoxGeometry(0.58 * scale.x, 0.1 * scale.y, 0.02), rearHoleMaterial);
      pcieSlot.position.set(pcieStackFrame.position.x, pcieStackFrame.position.y - 0.52 * scale.y + i * 0.17 * scale.y, pcieStackFrame.position.z + 0.01);
      this.group.add(pcieSlot);
    }

    const rearFanFrame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52 * scale.y, 0.52 * scale.y, 0.03, 20),
      rearFeatureMaterial,
    );
    rearFanFrame.rotation.x = Math.PI / 2;
    rearFanFrame.position.set(0.8 * scale.x, 1.12 * scale.y, rearPanelZ - 0.05);
    this.group.add(rearFanFrame);

    const rearFanHole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42 * scale.y, 0.42 * scale.y, 0.02, 20),
      rearHoleMaterial,
    );
    rearFanHole.rotation.x = Math.PI / 2;
    rearFanHole.position.set(rearFanFrame.position.x, rearFanFrame.position.y, rearFanFrame.position.z + 0.01);
    this.group.add(rearFanHole);

    const topPanel = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), shellMaterial);
    topPanel.position.set(0, halfH - 0.06, 0);
    this.group.add(topPanel);

    const bottomPanel = topPanel.clone();
    bottomPanel.position.set(0, -halfH + 0.06, 0);
    this.group.add(bottomPanel);

    const topAccent = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.03, depth * 0.9), faceMaterials.top);
    topAccent.position.set(0, halfH - 0.01, 0);
    this.group.add(topAccent);

    const bottomAccent = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.03, depth * 0.9), faceMaterials.bottom);
    bottomAccent.position.set(0, -halfH + 0.01, 0);
    this.group.add(bottomAccent);

    const rearStrutLeft = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameThickness), shellMaterial);
    rearStrutLeft.position.set(-halfW + frameThickness * 0.5, 0, -halfD + frameThickness * 0.5);
    this.group.add(rearStrutLeft);

    const rearStrutRight = rearStrutLeft.clone();
    rearStrutRight.position.x = halfW - frameThickness * 0.5;
    this.group.add(rearStrutRight);

    const frontStrutLeft = rearStrutLeft.clone();
    frontStrutLeft.position.z = halfD - frameThickness * 0.5;
    this.group.add(frontStrutLeft);

    const frontStrutRight = rearStrutRight.clone();
    frontStrutRight.position.z = halfD - frameThickness * 0.5;
    this.group.add(frontStrutRight);

    // Keep the front of the case open so the interior remains visible during assembly.

    const psuShroud = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.92, height * 0.22, depth * 0.62),
      faceMaterials.bottom,
    );
    psuShroud.position.set(0, -halfH + height * 0.13, halfD - depth * 0.28);
    this.group.add(psuShroud);

    const frontIntakeBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, height * 0.56, depth * 0.64),
      new THREE.MeshStandardMaterial({ color: 0x2f405b, roughness: 0.88, metalness: 0.06 }),
    );
    frontIntakeBracket.position.set(halfW - 0.08, height * 0.02, 0);
    this.group.add(frontIntakeBracket);

    const frontVentMaterial = new THREE.MeshStandardMaterial({ color: 0x72839b, roughness: 0.88, metalness: 0.03 });
    for (let i = 0; i < 10; i += 1) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2 * scale.y, depth * 0.54), frontVentMaterial);
      vent.position.set(halfW - 0.048, -0.95 * scale.y + i * 0.22 * scale.y, 0);
      this.group.add(vent);
    }

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3.8 * scale.x, 3.35 * scale.y, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x295033, roughness: 0.76, metalness: 0.06 }),
    );
    const boardMountX = -0.05 * scale.x;
    const boardMountY = 0.22 * scale.y;
    const boardMountZ = -halfD + 0.36 * scale.z;
    board.position.set(boardMountX, boardMountY, boardMountZ);
    this.group.add(board);

    const moboTray = new THREE.Mesh(
      new THREE.BoxGeometry(4.2 * scale.x, 3.8 * scale.y, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x202e45, roughness: 0.86, metalness: 0.05 }),
    );
    moboTray.position.set(board.position.x, board.position.y, board.position.z - 0.08);
    this.group.add(moboTray);

    const standoffMaterial = new THREE.MeshStandardMaterial({ color: 0xb49154, roughness: 0.68, metalness: 0.12 });
    const standoffOffsets = [
      [-1.55, 1.35],
      [1.55, 1.35],
      [-1.55, -1.35],
      [1.55, -1.35],
      [0, 1.35],
      [0.8, -0.25],
    ];
    standoffOffsets.forEach(([xOffset, yOffset]) => {
      const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), standoffMaterial);
      standoff.rotation.x = Math.PI / 2;
      standoff.position.set(board.position.x + xOffset * scale.x, board.position.y + yOffset * scale.y, board.position.z - 0.03);
      this.group.add(standoff);
    });

    for (let i = 0; i < 7; i += 1) {
      const trace = new THREE.Mesh(
        new THREE.BoxGeometry(3.05 * scale.x, 0.012 * scale.y, 0.13),
        new THREE.MeshStandardMaterial({ color: 0x87ad63, roughness: 0.95, metalness: 0.01 }),
      );
      trace.position.set(board.position.x, board.position.y - 1.35 * scale.y + i * 0.46 * scale.y, board.position.z + 0.02);
      this.group.add(trace);
    }

    const socketFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.95 * scale.x, 0.95 * scale.y, 0.11),
      new THREE.MeshStandardMaterial({ color: 0x2f353d, roughness: 0.72, metalness: 0.2 }),
    );
    socketFrame.position.set(board.position.x - 0.75 * scale.x, board.position.y + 0.62 * scale.y, board.position.z + 0.11);
    this.group.add(socketFrame);

    const socketContact = new THREE.Mesh(
      new THREE.BoxGeometry(0.72 * scale.x, 0.72 * scale.y, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xc4973a, roughness: 0.55, metalness: 0.25 }),
    );
    socketContact.position.set(socketFrame.position.x, socketFrame.position.y, socketFrame.position.z + 0.05);
    this.group.add(socketContact);

    [-0.25, 0.25].forEach((offset) => {
      const vrmBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 * scale.x, 0.88 * scale.y, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x1b1f25, roughness: 0.7, metalness: 0.1 }),
      );
      vrmBlock.position.set(board.position.x - 1.28 * scale.x + offset * scale.x, board.position.y + 1.05 * scale.y, board.position.z + 0.14);
      this.group.add(vrmBlock);
    });

    [0.72, 0.96].forEach((xOffset) => {
      const ramRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.18 * scale.x, 1.35 * scale.y, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x242a33, roughness: 0.74, metalness: 0.12 }),
      );
      ramRail.position.set(board.position.x + xOffset * scale.x, board.position.y + 0.18 * scale.y, board.position.z + 0.09);
      this.group.add(ramRail);
    });

    const pcieRail = new THREE.Mesh(
      new THREE.BoxGeometry(2.0 * scale.x, 0.15 * scale.y, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x202733, roughness: 0.78, metalness: 0.08 }),
    );
    pcieRail.position.set(board.position.x - 0.35 * scale.x, board.position.y - 0.62 * scale.y, board.position.z + 0.08);
    this.group.add(pcieRail);

    const rearInterfaceX = -halfW + 0.82 * scale.x;

    const ioShield = new THREE.Mesh(
      new THREE.BoxGeometry(0.52 * scale.x, 0.92 * scale.y, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xbdc8d8, roughness: 0.62, metalness: 0.22 }),
    );
    ioShield.position.set(-1.02 * scale.x, board.position.y + 0.46 * scale.y, rearPanelZ - 0.05);
    this.group.add(ioShield);

    // Motherboard rear I/O cluster (USB/LAN/audio blocks) for clear rear-panel readability.
    const ioPortMaterial = new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.72, metalness: 0.1 });
    const ioPortDefs = [
      { x: -0.12, y: 0.26, w: 0.16, h: 0.12 },
      { x: 0.08, y: 0.26, w: 0.16, h: 0.12 },
      { x: -0.12, y: 0.08, w: 0.16, h: 0.12 },
      { x: 0.08, y: 0.08, w: 0.16, h: 0.12 },
      { x: -0.12, y: -0.1, w: 0.16, h: 0.12 },
      { x: 0.08, y: -0.1, w: 0.16, h: 0.12 },
    ];
    ioPortDefs.forEach((port) => {
      const ioPort = new THREE.Mesh(
        new THREE.BoxGeometry(port.w * scale.x, port.h * scale.y, 0.02),
        ioPortMaterial,
      );
      ioPort.position.set(
        ioShield.position.x + port.x * scale.x,
        ioShield.position.y + port.y * scale.y,
        ioShield.position.z + 0.03,
      );
      this.group.add(ioPort);
    });

    const ioFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.6 * scale.x, 1.0 * scale.y, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xd7e0eb, roughness: 0.62, metalness: 0.2 }),
    );
    ioFrame.position.set(ioShield.position.x, ioShield.position.y, ioShield.position.z + 0.01);
    this.group.add(ioFrame);

    const pcieCutoutMaterial = new THREE.MeshStandardMaterial({ color: 0x8fa2bc, roughness: 0.74, metalness: 0.14 });
    const pcieSlotHoleMaterial = new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.92, metalness: 0.02 });
    for (let i = 0; i < 4; i += 1) {
      const pcieCutout = new THREE.Mesh(new THREE.BoxGeometry(0.62 * scale.x, 0.08 * scale.y, 0.03), pcieCutoutMaterial);
      pcieCutout.position.set(-0.2 * scale.x, board.position.y - 0.42 * scale.y - i * 0.2 * scale.y, rearPanelZ - 0.05);
      this.group.add(pcieCutout);

      const pcieHole = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale.x, 0.04 * scale.y, 0.02), pcieSlotHoleMaterial);
      pcieHole.position.set(pcieCutout.position.x, pcieCutout.position.y, pcieCutout.position.z + 0.02);
      this.group.add(pcieHole);
    }

    // GPU I/O bracket vertical plate next to the PCIe stack.
    const gpuIoBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * scale.x, 0.86 * scale.y, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xc4d0df, roughness: 0.68, metalness: 0.16 }),
    );
    gpuIoBracket.position.set(-0.5 * scale.x, board.position.y - 0.72 * scale.y, rearPanelZ - 0.05);
    this.group.add(gpuIoBracket);

    const psuCutout = new THREE.Mesh(
      new THREE.BoxGeometry(1.25 * scale.x, 0.78 * scale.y, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x435873, roughness: 0.84, metalness: 0.05 }),
    );
    psuCutout.position.set(1.42 * scale.x, -halfH + 0.74 * scale.y, -halfD + 0.145);
    this.group.add(psuCutout);

    const rearFanCutout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45 * scale.y, 0.45 * scale.y, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x415975, roughness: 0.86, metalness: 0.05 }),
    );
    rearFanCutout.rotation.x = Math.PI / 2;
    rearFanCutout.position.set(0.48 * scale.x, 1.0 * scale.y, -halfD + 0.145);
    this.group.add(rearFanCutout);

    const boardPos = board.position;

    const slotDefs = [
      {
        key: 'case_shell',
        pos: [halfW - 0.03, 0, 0],
        size: [0.08, 7.1 * scale.y, 3.1 * scale.z],
        label: 'CASE SHELL',
        desc: 'Side panel access is removed while assembling.',
      },
      {
        key: 'mobo',
        pos: [boardPos.x, boardPos.y, boardPos.z + 0.07],
        size: [3.8 * scale.x, 3.35 * scale.y, 0.14],
        label: 'MOTHERBOARD MOUNT',
        desc: 'Install a compatible motherboard for this case.',
      },
      {
        key: 'cpu_socket',
        pos: [boardPos.x - 0.75 * scale.x, boardPos.y + 0.62 * scale.y, boardPos.z + 0.11],
        size: [0.82 * scale.x, 0.82 * scale.y, 0.15],
        label: 'CPU SOCKET',
        desc: 'Processor socket on the motherboard.',
      },
      {
        key: 'ram1',
        pos: [boardPos.x + 0.72 * scale.x, boardPos.y + 0.18 * scale.y, boardPos.z + 0.1],
        size: [0.14 * scale.x, 1.3 * scale.y, 0.14],
        label: 'RAM SLOT A1',
        desc: 'Primary memory slot.',
      },
      {
        key: 'ram2',
        pos: [boardPos.x + 0.96 * scale.x, boardPos.y + 0.18 * scale.y, boardPos.z + 0.1],
        size: [0.14 * scale.x, 1.3 * scale.y, 0.14],
        label: 'RAM SLOT A2',
        desc: 'Secondary memory slot.',
      },
      {
        key: 'pcie1',
        pos: [boardPos.x - 0.35 * scale.x, boardPos.y - 0.62 * scale.y, boardPos.z + 0.1],
        size: [1.95 * scale.x, 0.11 * scale.y, 0.18],
        label: 'PCIe x16 SLOT',
        desc: 'Primary graphics card slot.',
      },
      {
        key: 'm2_1',
        pos: [boardPos.x - 0.2 * scale.x, boardPos.y - 0.92 * scale.y, boardPos.z + 0.1],
        size: [1.55 * scale.x, 0.08 * scale.y, 0.12],
        label: 'M.2 SLOT',
        desc: 'NVMe storage lane.',
      },
      {
        key: 'sata1',
        pos: [boardPos.x + 1.55 * scale.x, boardPos.y - 1.05 * scale.y, boardPos.z + 0.1],
        size: [0.3 * scale.x, 0.18 * scale.y, 0.13],
        label: 'SATA BAY',
        desc: '2.5"/3.5" storage connection point.',
      },
      {
        key: 'psu_bay',
        pos: [1.4 * scale.x, -halfH + 0.72 * scale.y, -halfD + 0.96 * scale.z],
        size: [1.7 * scale.x, 1.05 * scale.y, 1.55 * scale.z],
        label: 'PSU BAY',
        desc: 'Install power supply unit.',
      },
      {
        key: 'fan_front1',
        pos: [halfW - 0.2, 0.5 * scale.y, 0],
        size: [0.12, 1.22 * scale.y, 1.22 * scale.z],
        label: 'FRONT FAN MOUNT',
        desc: 'Front intake fan location.',
      },
      {
        key: 'fan_top1',
        pos: [0.2 * scale.x, halfH - 0.22, 0],
        size: [1.22 * scale.x, 0.12, 1.22 * scale.z],
        label: 'TOP FAN MOUNT',
        desc: 'Top exhaust fan location.',
      },
      {
        key: 'fan_rear1',
        pos: [0.8 * scale.x, 1.12 * scale.y, rearPanelZ - 0.04],
        size: [0.98 * scale.y, 0.98 * scale.y, 0.12],
        label: 'REAR FAN MOUNT',
        desc: 'Rear exhaust fan location.',
      },
    ];

    slotDefs.forEach((def) => {
      const isCaseShell = def.key === 'case_shell';
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]),
        new THREE.MeshStandardMaterial({
          color: isCaseShell ? 0x536173 : 0x2d3f5c,
          roughness: 0.92,
          metalness: 0.02,
          transparent: true,
          opacity: isCaseShell ? 0.02 : 0.08,
          depthWrite: false,
        }),
      );
      mesh.position.set(...def.pos);
      mesh.userData = { slotKey: def.key, label: def.label, desc: def.desc };
      this.group.add(mesh);
      this.slotRegistry.register(def.key, mesh, def);
    });

    // Keep the case standing just above the grid floor (y = -2) for a clear grounded silhouette.
    this.group.position.y = -2 + halfH + 0.16;
    this.group.rotation.x = 0;
    this.scene.add(this.group);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
