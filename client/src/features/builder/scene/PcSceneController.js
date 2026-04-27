import * as THREE from 'three';
import BoardScene from './BoardScene';
import SlotRegistry from './SlotRegistry';
import PartRenderer from './PartRenderer';

export default class PcSceneController {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.slotRegistry = new SlotRegistry();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragging = false;
    this.rightDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.view = 'case';
    this.selectedSlot = null;
    this.pendingPart = null;
    this.installedParts = {};
    this.casePreset = 'atx-mid';
    this.motherboard = null;
    this.graphicsMode = 'stylized';
    this.animationFrame = 0;
    this.spherical = { theta: 0.25, phi: 0.5, radius: 16 };
    this.target = new THREE.Vector3(0, 0, 0);
  }

  mount() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131b2d);
    this.scene.fog = new THREE.FogExp2(0x131b2d, 0.018);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    this.camera.position.set(0, 3.5, 7);

    this.scene.add(new THREE.AmbientLight(0x7b95b8, 1.85));
    const dir = new THREE.DirectionalLight(0xc7d8f2, 2.35);
    dir.position.set(3, 8, 5);
    dir.castShadow = true;
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0x9ab1d1, 1.55);
    fill.position.set(-4, 2, -3);
    this.scene.add(fill);
    const rearFill = new THREE.DirectionalLight(0x8eaad0, 1.15);
    rearFill.position.set(-3, 4, -7);
    this.scene.add(rearFill);
    this.pulse = new THREE.PointLight(0x84b6ff, 0.35, 15);
    this.pulse.position.set(0, 4, 0);
    this.scene.add(this.pulse);

    const grid = new THREE.GridHelper(16, 24, 0x2a456d, 0x1b2c47);
    grid.position.y = -2;
    this.scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a2538, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.04;
    this.scene.add(ground);

    this.boardScene = new BoardScene(this.scene, this.slotRegistry);
    this.boardScene.setCasePreset(this.casePreset);
    this.boardScene.setMotherboard(this.motherboard);
    this.boardScene.build();
    this.partRenderer = new PartRenderer(this.boardScene.group);
    this.partRenderer.setGraphicsMode(this.graphicsMode);

    this.handleResize = this.handleResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onClick = this.onClick.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousedown', this.onPointerDown);
    window.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('click', this.onClick);

    this.handleResize();
    this.applyView();
    this.animate();
  }

  handleResize() {
    const parent = this.canvas.parentElement;
    if (!parent || !this.renderer || !this.camera) return;

    const width = parent.clientWidth || 1;
    const height = parent.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  onPointerDown(event) {
    this.dragging = true;
    this.rightDragging = event.button === 2;
    this.lastPointer.x = event.clientX;
    this.lastPointer.y = event.clientY;
  }

  onPointerMove(event) {
    this.hoverAt(event);

    if (!this.dragging) return;

    const deltaX = event.clientX - this.lastPointer.x;
    const deltaY = event.clientY - this.lastPointer.y;
    this.lastPointer.x = event.clientX;
    this.lastPointer.y = event.clientY;

    if (this.rightDragging) {
      this.target.x -= deltaX * 0.008;
      this.target.y += deltaY * 0.008;
    } else {
      this.spherical.theta -= deltaX * 0.007;
      this.spherical.phi = Math.max(0.05, Math.min(1.5, this.spherical.phi + deltaY * 0.007));
    }

    this.updateCamera();
  }

  onPointerUp() {
    this.dragging = false;
    this.rightDragging = false;
  }

  onWheel(event) {
    event.preventDefault();
    this.spherical.radius = Math.max(3, Math.min(24, this.spherical.radius + event.deltaY * 0.02));
    this.updateCamera();
  }

  onContextMenu(event) {
    event.preventDefault();
  }

  onClick(event) {
    const slot = this.pickSlot(event);
    if (!slot) return;
    this.selectedSlot = slot.slotKey;
    this.handlers.onSelectSlot?.(slot);
    this.updateSlotHighlight();
  }

  pickSlot(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(this.slotRegistry.meshes(), false);
    if (!hits.length) return null;

    const mesh = hits[0].object;
    return {
      slotKey: mesh.userData.slotKey,
      label: mesh.userData.label,
      desc: mesh.userData.desc,
      mesh,
    };
  }

  hoverAt(event) {
    const slot = this.pickSlot(event);
    this.canvas.style.cursor = slot ? 'pointer' : 'default';
    this.handlers.onHoverSlot?.(slot || null);
    this.hoverSlot = slot?.slotKey || null;
    this.updateSlotHighlight();
  }

  updateSlotHighlight() {
    this.slotRegistry.values().forEach(({ mesh }) => {
      mesh.material = new THREE.MeshStandardMaterial({
        color: 0x2f405a,
        roughness: 0.94,
        metalness: 0.02,
        transparent: true,
        opacity: 0.05,
        wireframe: true,
      });
    });

    if (this.pendingPart) {
      this.slotRegistry.values().forEach(({ mesh }) => {
        if (!this.isSlotCompatibleForPending(this.pendingPart, mesh.userData.slotKey)) return;
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x67c6ff,
          roughness: 0.86,
          metalness: 0.08,
          emissive: 0x1c5774,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.26,
          wireframe: true,
        });
      });
    }

    const slotKey = this.selectedSlot || this.hoverSlot;
    if (!slotKey) return;

    const slot = this.slotRegistry.get(slotKey);
    if (!slot) return;

    slot.mesh.material = new THREE.MeshStandardMaterial({
      color: 0x9ad9ff,
      roughness: 0.82,
      metalness: 0.08,
      emissive: 0x2b8bc1,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.42,
      wireframe: true,
    });
  }

  isSlotCompatibleForPending(part, slotKey) {
    const kind = part?.kind || part?.category;
    if (!kind || !slotKey) return false;
    if (kind === 'Motherboard') return slotKey === 'mobo';
    if (kind === 'CPU') return slotKey === 'cpu_socket';
    if (kind === 'RAM') return slotKey.startsWith('ram');
    if (kind === 'GPU') return slotKey === 'pcie1';
    if (kind === 'PSU') return slotKey === 'psu_bay';
    if (kind === 'Fans') return slotKey.startsWith('fan_');
    if (kind === 'Storage') return slotKey.startsWith('m2') || slotKey === 'sata1';
    if (kind === 'Case') return slotKey === 'case_shell';
    return false;
  }

  setSelectedSlot(slotKey) {
    this.selectedSlot = slotKey;
    this.updateSlotHighlight();
  }

  setPendingPart(part) {
    this.pendingPart = part;
    this.updateSlotHighlight();
  }

  setInstalledParts(installedParts) {
    this.installedParts = installedParts || {};
    this.partRenderer.clearAll();
    Object.keys(this.installedParts).forEach((slotKey) => {
      this.partRenderer.renderInstalledPart(slotKey, this.slotRegistry.get(slotKey), this.installedParts[slotKey]);
    });
    this.updateSlotHighlight();
  }

  refreshSceneGeometry() {
    this.boardScene.setCasePreset(this.casePreset);
    this.boardScene.setMotherboard(this.motherboard);
    this.boardScene.build();
    this.partRenderer.boardGroup = this.boardScene.group;
    this.partRenderer.setGraphicsMode(this.graphicsMode);
    this.setInstalledParts(this.installedParts);
    this.applyView();
  }

  setCasePreset(casePreset) {
    if (!casePreset || casePreset === this.casePreset) return;
    this.casePreset = casePreset;
    this.refreshSceneGeometry();
  }

  setMotherboard(motherboard) {
    this.motherboard = motherboard;
  }

  setGraphicsMode(mode) {
    this.graphicsMode = mode;
    this.partRenderer?.setGraphicsMode(mode);
    this.setInstalledParts(this.installedParts);
    if (mode === 'real') {
      this.renderer.toneMappingExposure = 1.32;
      this.scene.fog.density = 0.015;
      this.scene.background = new THREE.Color(0x2a313d);
    } else {
      this.renderer.toneMappingExposure = 1.2;
      this.scene.fog.density = 0.018;
      this.scene.background = new THREE.Color(0x131b2d);
    }
  }

  setView(view) {
    this.view = view === 'mobo' ? 'mobo' : 'case';
    this.applyView();
  }

  applyView() {
    if (this.view === 'case') {
      this.spherical = { theta: 0.9, phi: 1.36, radius: 12.8 };
      this.target = new THREE.Vector3(0, 0.1, -0.6);
    } else {
      this.spherical = { theta: -0.34, phi: 1.02, radius: 8.6 };
      this.target = new THREE.Vector3(-0.65, 0.35, -1.45);
    }
    this.updateCamera();
  }

  updateCamera() {
    const { theta, phi, radius } = this.spherical;
    const target = this.target || new THREE.Vector3(0, 0, 0);
    this.camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    this.camera.lookAt(target);
  }

  animate() {
    const tick = () => {
      this.animationFrame = window.requestAnimationFrame(tick);
      const time = performance.now() * 0.001;
      this.pulse.position.x = Math.sin(time * 0.4) * 3;
      this.pulse.position.z = Math.cos(time * 0.4) * 3;
      if (this.boardScene?.group) {
        this.boardScene.group.position.y = Math.sin(time * 0.5) * 0.01;
      }
      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  dispose() {
    window.cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    window.removeEventListener('mousemove', this.onPointerMove);
    window.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('click', this.onClick);
    this.boardScene?.dispose();
    this.partRenderer?.clearAll();
    this.renderer?.dispose();
  }
}
