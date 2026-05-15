# Blender Export Guide for ATLAS 3D Assets

This guide explains how to prepare and export assets from Blender for use in the ATLAS 3D PC builder.

Workflow
1. Scene units: set Scene Units to Metric and Unit Scale = 0.001 so that Blender units are meters and 1 unit = 1 meter; use mm in metadata.
2. Modeling: use real-world dimensions in mm. Place origin at the primary snap/pivot point (motherboard standoff, fan center, PSU mounting screw).
3. Collections: keep logical groups (geometry, colliders, anchors). Create `Anchors` empty objects for snap points and name them `snap_cpu_socket`, `snap_pcie_slot_1`, etc.
4. UVs: unwrap per-material islands and pack into atlases. Keep texel density consistent across similar components.
5. Baking: bake high-poly to low-poly normal maps into the low poly atlas when using baked normals.
6. LODs: create LOD collections; decimate politely to target triangle budgets. Export separate LOD files.

Export settings (glTF Binary `.glb`)
- File > Export > glTF 2.0
- Format: `glTF Binary (.glb)`
- Include: Selected Objects or Visible Objects depending on workflow
- Transform: +Y Up, -Z Forward (default)
- Geometry: +Compression (Use Draco if available), +Apply Modifiers, +Export Tangents
- Animation: only if anim nodes are present
- Extras: export custom properties if you put metadata on objects

Metadata
- Add a small JSON file alongside each `.glb` with snap point positions in mm, tri_count (from Blender statistics), and connector strings.

Automation tips
- Use Blender Python to export metadata, bake textures, generate LODs, and run batch exports. Sample script stub:

```python
import bpy
import json
def write_meta(obj, filename):
    meta = { 'name': obj.name, 'tri_count': sum([m.loop_triangles for m in bpy.context.meshes]) }
    with open(filename,'w') as f:
        json.dump(meta, f)
```

Quality checklist
- Check pivots and snap empties are at correct world positions.
- Verify exported `glb` loads in three.js sandbox with correct orientation.
