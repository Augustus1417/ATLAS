# 3D PC Component Asset Specification

This document defines the target asset requirements for the ATLAS 3D PC builder. Use this as the authoritative checklist for modeling, UVs, LODs, metadata, and exports.

Summary (per-component)
- Case (mid-tower ATX)
  - Formats: source .blend (or .fbx), exports: `case.glb`, `case_LOD1.glb`, `case_LOD2.glb`
  - Real-world scale in mm; origin at front-bottom-left or documented pivot
  - Snap nodes: `snap_psu_mount`, `snap_drive_bay_1`, `snap_drive_bay_2`, `snap_motherboard_mounts` (array of standoff positions)
  - Textures: Albedo, Normal (baked), ORM; default atlas size 2048
  - LOD budgets: high < 40k tris, med < 12k, low < 3k

- Motherboard (ATX)
  - Source + exports: `motherboard.glb`, `motherboard_LOD1.glb`
  - Dimensions: 305 x 244 mm (ATX). Origin at first standoff or documented pivot.
  - Snap nodes: `snap_cpu_socket`, `snap_pcie_slot_1`, `snap_pcie_slot_2`, `snap_m.2_slot_1`, `snap_24pin`
  - Metadata: `socket` string (`AM5`), `ram_type` (`DDR5`), `max_gpu_length_mm`, `standoff_positions` array
  - LOD budgets: high < 45k tris

- CPU
  - Export: `cpu.glb` (small)
  - Metadata: `socket`, `tdp`, physical dimensions
  - Snap node: `snap_pin_center`

- GPU
  - Exports: `gpu.glb`, `gpu_LOD1.glb`
  - Metadata: `length_mm`, `tdp`, `slot_width` (e.g., 2.5)
  - Anim nodes: `gpu_fan_1`, `gpu_fan_2`, `gpu_fan_3`
  - LOD budgets: high < 75k tris

- PSU
  - Export: `psu.glb`
  - Metadata: `watt`, `form_factor` (`ATX`), `modular_ports` description
  - Snap node: `snap_psu_mount`

- RAM, Storage, Fans, Cooler
  - Exports per-part; metadata with `ram_type`, `size_gb`, `fan_diameter_mm`, etc.

General requirements
- Units & scale: scene uses millimeters. Document conversion if different.
- Naming: kebab-case for files, node names use `camelCase` with `snap_` or `anim_` prefixes.
- Metadata: Each component must have `component.meta.json` with the following schema:

```json
{
  "name": "motherboard",
  "socket": "AM5",
  "ram_type": "DDR5",
  "snap_points": [{ "name": "cpu_socket", "position": [0,132,20], "required": true }],
  "tri_count": 12345,
  "textures": { "albedo": "motherboard_albedo.png", "normal": "motherboard_nrm.png" }
}
```

- LODs and compression: provide at least two LODs and export `.glb` with Draco compression for high-detail assets.
- Animatable nodes should be named and have correct pivots (fan centers, LED strips).
- Texture atlases preferred; max default texture sizes: 2048 (major parts), 1024 (small parts).

Acceptance criteria
- All updated assets in `assets/models/updated/` with `.meta.json` files and `manifest.json` present.
- glTF loads in Three.js with correct scale and pivots.
- Compatibility engine reads metadata and computes issues (unit-tested).
