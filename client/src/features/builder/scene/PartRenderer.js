import * as THREE from 'three';

/**
 * PartRenderer — places 3-D part models at their registered slot positions.
 *
 * Coordinate convention (same as BoardScene):
 *   +Z → toward viewer (open/glass side)
 *   -Z → rear wall
 *   +X → right / PSU side
 *   -X → left / mobo side
 *
 * The group is added to boardScene.group, so all positions are in that
 * group's local space.  Each slot's `meta.pos` is the world-local anchor
 * for the part.  Parts that have a rear-panel element (GPU bracket, PSU
 * AC socket) use the extra coordinates stored in the slot meta.
 */

export default class PartRenderer {
  constructor(boardGroup) {
    this.boardGroup  = boardGroup;
    this.rendered    = new Map();
    this.graphicsMode = 'stylized';
  }

  setGraphicsMode(mode) { this.graphicsMode = mode || 'stylized'; }

  _mat(color, roughness = 0.75, metalness = 0.10, extra = {}) {
    const boost = this.graphicsMode === 'real' ? 0.03 : 0;
    return new THREE.MeshStandardMaterial({
      color,
      roughness: Math.min(1, roughness + boost),
      metalness: Math.max(0, metalness - boost * 0.5),
      ...extra,
    });
  }

  _box(w, h, d, mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  }
  _cyl(rt, rb, h, segs, mat) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  }

  renderInstalledPart(slotKey, slotRecord, part) {
    this.clear(slotKey);

    const group = new THREE.Group();
    const pos   = slotRecord?.meta?.pos || [0, 0, 0];
    const meta  = slotRecord?.meta || {};
    const kind  = part?.kind || part?.category || '';

    group.position.set(pos[0], pos[1], pos[2]);

    // ─────────────────────────────────────────────────────────────────────────
    if (slotKey === 'case_shell' || kind === 'Case') {
      // Case is drawn by BoardScene; nothing to render here.

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey === 'mobo' || kind === 'Motherboard') {
      // Motherboard overlay — subtle detail layer on top of the base PCB
      const pcb = this._box(3.00, 2.38, 0.07, this._mat(0x2d5b3a, 0.80, 0.04));
      group.add(pcb);

      // Chipset heatsink (center-bottom of board)
      const chip = this._box(0.50, 0.40, 0.14, this._mat(0x1e2530, 0.65, 0.20));
      chip.position.set(0.40, -0.65, 0.08);
      group.add(chip);

      // M.2 heatsink covers
      [-0.50, -0.72].forEach((dy) => {
        const m2cover = this._box(1.00, 0.06, 0.08, this._mat(0x2a3444, 0.68, 0.18));
        m2cover.position.set(0.08, dy, 0.08);
        group.add(m2cover);
      });

      // Power connectors (24-pin ATX on right edge)
      const atxConn = this._box(0.24, 0.45, 0.12, this._mat(0x1a2030, 0.72, 0.08));
      atxConn.position.set(1.40, 0.40, 0.08);
      group.add(atxConn);

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey === 'cpu_socket' || kind === 'CPU') {
      // CPU package (IHS + substrate)
      const substrate = this._box(0.86, 0.86, 0.07, this._mat(0x3f444b, 0.65, 0.14));
      group.add(substrate);
      const ihs = this._box(0.68, 0.68, 0.028, this._mat(0xadb6bf, 0.46, 0.22));
      ihs.position.z = 0.048;
      group.add(ihs);

      // CPU cooler (tower-style)
      const coolerBase = this._box(0.60, 0.60, 0.06, this._mat(0x2a2f37, 0.72, 0.14));
      coolerBase.position.z = 0.08;
      group.add(coolerBase);

      // Fin stack
      const finMat = this._mat(0x8a9ab0, 0.50, 0.28);
      for (let i = 0; i < 8; i++) {
        const fin = this._box(0.58, 0.02, 0.46, finMat);
        fin.position.set(0, -0.14 + i * 0.04, 0.32);
        group.add(fin);
      }

      // Heatpipes (3 visible arcs simplified as cylinders)
      const hpMat = this._mat(0xc0a840, 0.45, 0.38);
      [-0.12, 0, 0.12].forEach((dx) => {
        const hp = this._cyl(0.018, 0.018, 0.50, 8, hpMat);
        hp.position.set(dx, 0, 0.30);
        group.add(hp);
      });

      // Cooler fan (140mm)
      const fanRing = this._cyl(0.22, 0.22, 0.10, 20, this._mat(0x1e242d, 0.82, 0.06));
      fanRing.rotation.y = Math.PI / 2;
      fanRing.position.set(0, 0, 0.33);
      group.add(fanRing);
      const fanHub = this._cyl(0.07, 0.07, 0.11, 12, this._mat(0x465264, 0.72, 0.10));
      fanHub.rotation.y = Math.PI / 2;
      fanHub.position.set(0, 0, 0.33);
      group.add(fanHub);
      const fanMat = this._mat(0x2a3444, 0.80, 0.06);
      for (let i = 0; i < 7; i++) {
        const blade = this._box(0.04, 0.14, 0.07, fanMat);
        const ang   = (i / 7) * Math.PI * 2;
        blade.position.set(Math.sin(ang) * 0.12, Math.cos(ang) * 0.12, 0.33);
        blade.rotation.z = ang;
        group.add(blade);
      }

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey.startsWith('ram') || kind === 'RAM') {
      // RAM stick — oriented vertically (Y axis)
      const pcb = this._box(0.12, 1.30, 0.28, this._mat(0x20262d, 0.82, 0.08));
      group.add(pcb);
      const spreader = this._box(0.10, 1.08, 0.26, this._mat(0x5b3f43, 0.60, 0.18));
      group.add(spreader);
      // DRAM chips
      for (let i = 0; i < 4; i++) {
        const chip = this._box(0.07, 0.08, 0.055, this._mat(0x171b22, 0.72, 0.10));
        chip.position.set(0, -0.38 + i * 0.26, 0.15);
        group.add(chip);
      }
      // Notch
      const notch = this._box(0.14, 0.04, 0.04, this._mat(0x14181f, 0.90, 0.02));
      notch.position.set(0, -0.62, 0.0);
      group.add(notch);

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey === 'pcie1' || kind === 'GPU') {
      /**
       * GPU LAYOUT (in local space, origin = PCIe slot on motherboard):
       *
       * The GPU card sits horizontally in the PCIe slot (XZ plane).
       * - PCB runs along the -Z direction from the slot (toward the rear wall)
       * - Bracket is at the rear-wall end (at the -Z extreme of the card)
       * - Fans face +Z (toward the viewer / open side)
       * - Card body: ~280 mm long (-Z), ~130 mm tall (+Y and -Y from PCB center)
       */
      const cardLen = 2.80;   // card length in Z axis
      const cardH   = 0.52;   // card body height (Y, above PCB center)
      const cardT   = 0.18;   // card body thickness (X — "how wide the cooler is")

      const pcb = this._box(cardT * 0.5, 0.08, cardLen, this._mat(0x2a4a3a, 0.80, 0.05));
      pcb.position.set(0, -cardH * 0.15, cardLen * 0.5 - 0.15);
      group.add(pcb);

      const shroud = this._box(cardT + 0.06, cardH + 0.18, cardLen - 0.05,
        this._mat(0x1e242e, 0.72, 0.10));
      shroud.position.set(0, cardH * 0.30, cardLen * 0.5 - 0.20);
      group.add(shroud);

      const fanR    = 0.46;
      const fanPositionsZ = [cardLen * 0.22, cardLen * 0.65];
      fanPositionsZ.forEach((fz) => {
        const frame = this._box(cardT + 0.04, fanR * 2.2, fanR * 2.2,
          this._mat(0x1a2030, 0.82, 0.06));
        frame.position.set(0, -(cardH * 0.25 + fanR), fz);
        group.add(frame);

        const ring = this._cyl(fanR, fanR, 0.08, 24, this._mat(0x202936, 0.78, 0.08));
        ring.rotation.z = Math.PI / 2;
        ring.position.set(0, -(cardH * 0.25 + fanR), fz);
        group.add(ring);

        const hub = this._cyl(0.10, 0.10, 0.09, 12, this._mat(0x465264, 0.72, 0.10));
        hub.rotation.z = Math.PI / 2;
        hub.position.set(0, -(cardH * 0.25 + fanR), fz);
        group.add(hub);

        const bladeMat = this._mat(0x2a3545, 0.80, 0.06);
        for (let i = 0; i < 7; i++) {
          const ang   = (i / 7) * Math.PI * 2;
          const blade = this._box(0.09, 0.14, 0.055, bladeMat);
          blade.position.set(
            Math.cos(ang) * 0.24 * (cardT + 0.04),
            -(cardH * 0.25 + fanR) + Math.sin(ang) * 0.28,
            fz,
          );
          blade.rotation.x = ang;
          group.add(blade);
        }
      });

      const rgbStrip = this._box(cardT + 0.08, 0.04, cardLen * 0.90,
        this._mat(0x4a9eff, 0.30, 0.40, { emissive: 0x1a4a8f, emissiveIntensity: 0.45 }));
      rgbStrip.position.set(0, cardH * 0.48, cardLen * 0.48);
      group.add(rgbStrip);

      const bracketH   = (meta.gpuSlotH || 0.20) * 0.95;
      const bracketMat = this._mat(0xc4d0df, 0.50, 0.30);
      const bracket    = this._box(0.06, bracketH, 0.16, bracketMat);
      bracket.position.set(0, cardH * 0.15, -0.05);
      group.add(bracket);

      for (let i = 0; i < 5; i++) {
        const vh = this._cyl(0.028, 0.028, 0.10, 8, this._mat(0x1a1f28, 0.80, 0.05));
        vh.rotation.x = Math.PI / 2;
        vh.position.set(0, bracketH * 0.28 - i * bracketH * 0.14, -0.02);
        group.add(vh);
      }

      const pwrConn = this._box(0.22, 0.10, 0.14, this._mat(0x1a1f28, 0.80, 0.05));
      pwrConn.position.set(0, cardH * 0.42, cardLen * 0.85);
      group.add(pwrConn);

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey.startsWith('m2') || (kind === 'Storage' && part?.interface === 'NVMe')) {
      const stick = this._box(1.05, 0.06, 0.10, this._mat(0x26303c, 0.80, 0.08));
      stick.position.x = -0.08;
      group.add(stick);
      for (let i = 0; i < 4; i++) {
        const chip = this._box(0.11, 0.035, 0.07, this._mat(0x191d24, 0.72, 0.08));
        chip.position.set(-0.42 + i * 0.28, 0, 0.042);
        group.add(chip);
      }

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey === 'sata1' || (kind === 'Storage' && part?.interface === 'SATA')) {
      const drive = this._box(0.86, 0.58, 0.12, this._mat(0x515a67, 0.82, 0.08));
      group.add(drive);
      const label = this._box(0.58, 0.36, 0.008, this._mat(0xd7dde8, 0.92, 0.01));
      label.position.z = 0.065;
      group.add(label);
      const conn = this._box(0.14, 0.08, 0.04, this._mat(0x101520, 0.78, 0.06));
      conn.position.set(0.32, -0.24, 0.0);
      group.add(conn);

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey === 'psu_bay' || kind === 'PSU') {
      const bW  = meta.psuBodyW  || 1.50;
      const bH  = meta.psuBodyH  || 0.86;
      const bD  = 1.40;
      const rZlocal = (meta.psuRearZ || 0) - pos[2];

      const body = this._box(bW, bH, bD, this._mat(0x1a1f28, 0.70, 0.16));
      group.add(body);

      const labelMat = this._mat(0xd4dce8, 0.60, 0.08);
      const label = this._box(bW * 0.80, 0.008, bD * 0.70, labelMat);
      label.position.set(0, bH * 0.502, 0);
      group.add(label);

      const fanSize = bW * 0.78;
      const fanFrame = this._box(fanSize, 0.04, fanSize, this._mat(0x2a313d, 0.65, 0.18));
      fanFrame.position.set(0, -bH * 0.51, 0);
      group.add(fanFrame);

      const fanRing = this._cyl(fanSize * 0.42, fanSize * 0.42, 0.045, 24, this._mat(0x1e2430, 0.78, 0.08));
      fanRing.position.set(0, -bH * 0.515, 0);
      group.add(fanRing);

      const fanHub = this._cyl(0.10, 0.10, 0.048, 12, this._mat(0x465264, 0.72, 0.10));
      fanHub.position.set(0, -bH * 0.515, 0);
      group.add(fanHub);

      const bladeMat = this._mat(0x2a3545, 0.80, 0.06);
      for (let i = 0; i < 9; i++) {
        const ang   = (i / 9) * Math.PI * 2;
        const blade = this._box(0.018, 0.050, 0.10, bladeMat);
        blade.position.set(
          Math.cos(ang) * fanSize * 0.24,
          -bH * 0.512,
          Math.sin(ang) * fanSize * 0.24,
        );
        blade.rotation.y = ang;
        group.add(blade);
      }

      const ventMat = this._mat(0x0a0f18, 0.95, 0.01);
      for (let i = 0; i < 7; i++) {
        const vl = this._box(0.018, bH * 0.55, 0.06, ventMat);
        vl.position.set(-bW * 0.52, 0, -bD * 0.28 + i * 0.14);
        group.add(vl);
        const vr = vl.clone();
        vr.position.x = bW * 0.52;
        group.add(vr);
      }

      const modPanel = this._box(bW * 0.88, bH * 0.60, 0.035, this._mat(0x2a313d, 0.60, 0.20));
      modPanel.position.set(0, -bH * 0.10, bD * 0.51);
      group.add(modPanel);
      for (let i = 0; i < 5; i++) {
        const port = this._box(0.14, 0.08, 0.025, this._mat(0x0a0e18, 0.90, 0.05));
        port.position.set(-bW * 0.32 + i * 0.15, -bH * 0.10, bD * 0.53);
        group.add(port);
      }

      const acSock = this._box(0.14, 0.12, 0.030, this._mat(0x080c14, 0.90, 0.05));
      acSock.position.set(bW * 0.25, 0, rZlocal - 0.015);
      group.add(acSock);

      const pwrSw = this._box(0.10, 0.09, 0.030, this._mat(0x1a1f28, 0.72, 0.10));
      pwrSw.position.set(-bW * 0.25, 0, rZlocal - 0.015);
      group.add(pwrSw);

    // ─────────────────────────────────────────────────────────────────────────
    } else if (slotKey.startsWith('fan_') || kind === 'Fans') {
      const isTop  = meta.isTop  || slotKey.includes('top');
      const isRear = meta.isRear || slotKey.includes('rear');
      const fanR   = slotKey.includes('rear') ? 0.54 : 0.55;

      const hSize = fanR * 2.30;
      const housing = this._box(hSize, hSize, 0.09, this._mat(0x2a3444, 0.84, 0.06));
      if (isTop)  housing.rotation.x = Math.PI / 2;
      group.add(housing);

      const sMat = this._mat(0x8899aa, 0.55, 0.35);
      [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]].forEach(([dx, dy]) => {
        const sc = this._cyl(0.035, 0.035, 0.11, 8, sMat);
        if (isTop)       sc.rotation.x = Math.PI / 2;
        else if (isRear) sc.rotation.x = Math.PI / 2;
        sc.position.set(dx * hSize * 0.44, dy * hSize * 0.44, 0);
        if (isTop) sc.position.set(dx * hSize * 0.44, 0, dy * hSize * 0.44);
        group.add(sc);
      });

      const ringMat  = this._mat(0x202936, 0.78, 0.08);
      const hubMat   = this._mat(0x465264, 0.72, 0.10);
      const bladeMat = this._mat(0x2a3545, 0.80, 0.06);

      const makeAxial = (mesh) => {
        if (isTop)  mesh.rotation.x = Math.PI / 2;
        if (isRear) mesh.rotation.x = Math.PI / 2;
        return mesh;
      };

      const ring = makeAxial(this._cyl(fanR, fanR, 0.088, 24, ringMat));
      group.add(ring);
      const hub  = makeAxial(this._cyl(0.11, 0.11, 0.10, 12, hubMat));
      group.add(hub);

      for (let i = 0; i < 7; i++) {
        const ang   = (i / 7) * Math.PI * 2;
        const blade = this._box(0.035, 0.15, 0.062, bladeMat);
        if (isTop || isRear) {
          blade.position.set(Math.cos(ang) * fanR * 0.54, Math.sin(ang) * fanR * 0.54, 0);
          blade.rotation.z = ang + Math.PI * 0.15;
          if (isTop) {
            blade.position.set(Math.cos(ang) * fanR * 0.54, 0, Math.sin(ang) * fanR * 0.54);
            blade.rotation.y = ang + Math.PI * 0.15;
          }
        } else {
          blade.position.set(Math.cos(ang) * fanR * 0.54, Math.sin(ang) * fanR * 0.54, 0);
          blade.rotation.z = ang + Math.PI * 0.15;
        }
        group.add(blade);
      }

      const rgbRing = makeAxial(this._cyl(fanR * 0.86, fanR * 0.86, 0.015, 24,
        this._mat(0x3a7aff, 0.30, 0.20, { emissive: 0x1a3a8f, emissiveIntensity: 0.35 })));
      group.add(rgbRing);
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
    [...this.rendered.keys()].forEach((k) => this.clear(k));
  }
}
