import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { evaluateBuild, estimatePrice } from '../utils/compatibility'
import PerformanceHUD from '../components/PerformanceHUD'

export default function ModelPreview() {
  const mountRef = useRef(null)
  const [components, setComponents] = useState([])
  const [selected, setSelected] = useState(null)
  const [powerOn, setPowerOn] = useState(false)
  const [buildMeta, setBuildMeta] = useState({})
  const [compat, setCompat] = useState({ ok: true, issues: [], totalTdp: 0 })
  const [perfStats, setPerfStats] = useState({ cpu: 0, gpu: 0, ram: 10, mode: 'IDLE' })

  useEffect(() => {
    // load mock metadata files
    const list = ['motherboard', 'cpu', 'gpu']
    Promise.all(
      list.map((name) => fetch(`/assets/models/updated/${name}.meta.json`).then((r) => r.json()).catch(() => null))
    ).then((res) => {
      const items = res.map((r, i) => ({ name: list[i], meta: r }))
      setComponents(items.filter((it) => it.meta))
    })
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b1020)

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 2000)
    camera.position.set(0, 220, 500)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(200, 400, 200)
    dir.castShadow = true
    scene.add(dir)

    // Case (wireframe-ish)
    const caseGeom = new THREE.BoxGeometry(220, 450, 450)
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x0f1724, metalness: 0.25, roughness: 0.6, transparent: true, opacity: 0.95 })
    const caseMesh = new THREE.Mesh(caseGeom, caseMat)
    caseMesh.position.y = 225
    caseMesh.receiveShadow = true
    scene.add(caseMesh)

    // Motherboard surface
    const mobo = new THREE.Mesh(new THREE.BoxGeometry(244, 2, 305), new THREE.MeshStandardMaterial({ color: 0x28415a, metalness: 0.05, roughness: 0.7 }))
    mobo.position.set(0, 132, 0)
    mobo.rotation.x = -Math.PI / 2
    scene.add(mobo)

    // Mock snaps from metadata (if available)
    const snapGroup = new THREE.Group()
    snapGroup.name = 'snap-points'
    scene.add(snapGroup)

    // procedural component placeholders
    const placed = {}

    function makeCPU() {
      const g = new THREE.CylinderGeometry(18, 18, 6, 24)
      const m = new THREE.MeshStandardMaterial({ color: 0xeceff1, metalness: 0.1, roughness: 0.3 })
      const mesh = new THREE.Mesh(g, m)
      mesh.rotation.x = Math.PI / 2
      mesh.castShadow = true
      return mesh
    }

    function makeGPU() {
      const group = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(12, 40, 220), new THREE.MeshStandardMaterial({ color: 0x1f2937 }))
      body.position.set(0, 0, 0)
      group.add(body)
      // fans
      for (let i = -1; i <= 1; i++) {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 4, 16), new THREE.MeshStandardMaterial({ color: 0x111827 }))
        fan.rotation.x = Math.PI / 2
        fan.position.set(0, 0, i * 60)
        fan.name = `gpu_fan_${i + 2}`
        group.add(fan)
      }
      return group
    }

    // create snap points based on available metadata
    const loadSnaps = async () => {
      const names = ['motherboard', 'cpu', 'gpu']
      for (const n of names) {
        try {
          const m = await fetch(`/assets/models/updated/${n}.meta.json`).then((r) => r.json())
          if (!m) continue
          if (m.snap_points) {
            m.snap_points.forEach((s) => {
              const sMat = new THREE.MeshStandardMaterial({ color: s.required ? 0xff4444 : 0x00ff88, emissive: s.required ? 0x220000 : 0x002211, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })
              const marker = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 12), sMat)
              marker.position.set(s.position[0], s.position[1], s.position[2])
              marker.name = `snap-${n}-${s.name}`
              snapGroup.add(marker)
            })
          }
        } catch (e) {
          // ignore
        }
      }
    }
    loadSnaps()

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 140, 0)

    // Fan rotation helpers
    const fanNodes = []

    // simple animation loop
    const clock = new THREE.Clock()
    let running = true
    const animate = () => {
      if (!running) return
      const dt = clock.getDelta()
      // rotate any fan nodes
      fanNodes.forEach((n) => {
        n.rotation.z -= (powerOn ? 20 : 1) * dt
      })
      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    animate()

    // public API for placing components
    const api = {
      place: (name) => {
        if (placed[name]) return
        let mesh = null
        if (name === 'cpu') mesh = makeCPU()
        if (name === 'gpu') mesh = makeGPU()
        if (!mesh) return
        // find cpu snap on motherboard if present
        const snap = snapGroup.children.find((c) => c.name.includes(`snap-motherboard-cpu_socket`))
        if (snap) {
          mesh.position.copy(snap.position)
          mesh.position.y += 6
        } else {
          mesh.position.set(0, 150, 20)
        }
        scene.add(mesh)
        // register fans to animate
        mesh.traverse((n) => { if (n.name && n.name.startsWith('gpu_fan')) fanNodes.push(n) })
        placed[name] = mesh
        // update meta registry
        try {
          fetch(`/assets/models/updated/${name}.meta.json`).then((r)=>r.json()).then((m)=>{
            const bm = {...mount.__buildMeta, [name]: m}
            mount.__buildMeta = bm
            setBuildMeta(bm)
            const res = evaluateBuild(bm)
            setCompat(res)
          }).catch(()=>{})
        } catch(e){}
      },
      remove: (name) => {
        const m = placed[name]
        if (m) {
          scene.remove(m)
          delete placed[name]
          const bm = {...mount.__buildMeta}
          delete bm[name]
          mount.__buildMeta = bm
          setBuildMeta(bm)
          const res = evaluateBuild(bm)
          setCompat(res)
        }
      }
    }

    // attach api for outside interaction
    mount.__modelApi = api

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      running = false
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [powerOn])

  // user actions: place/remove components
  const handlePlace = (name) => {
    const mount = mountRef.current
    if (mount && mount.__modelApi) {
      mount.__modelApi.place(name)
      setSelected(name)
    }
  }

  const handleRemove = (name) => {
    const mount = mountRef.current
    if (mount && mount.__modelApi) {
      mount.__modelApi.remove(name)
      setSelected(null)
    }
  }

  const handlePowerOn = () => {
    setPowerOn(true)
    // set performance mode and animate stats
    setPerfStats({ cpu: 5, gpu: 5, ram: 15, mode: 'IDLE' })
    let phase = 0
    const phases = ['IDLE','GAMING','RENDER','AI/ML']
    const interval = setInterval(()=>{
      phase = (phase+1) % phases.length
      const mode = phases[phase]
      if (mode === 'IDLE') setPerfStats({ cpu: 5, gpu: 5, ram: 12, mode })
      if (mode === 'GAMING') setPerfStats({ cpu: 68, gpu: 95, ram: 64, mode })
      if (mode === 'RENDER') setPerfStats({ cpu: 98, gpu: 40, ram: 84, mode })
      if (mode === 'AI/ML') setPerfStats({ cpu: 92, gpu: 96, ram: 74, mode })
    }, 3000)
    setTimeout(()=>{ clearInterval(interval); setPowerOn(false); setPerfStats({ cpu: 0, gpu: 0, ram: 10, mode: 'IDLE' }) }, 16000)
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 280, padding: 12, background: '#071028', color: '#e6eef8' }}>
        <h3>Component Picker</h3>
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {components.map((c) => (
            <li key={c.name} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: 12, color: '#9fb4d9' }}>{c.meta.description || c.meta.socket || ''}</div>
                </div>
                <div>
                  <button onClick={() => handlePlace(c.name)} style={{ marginRight: 6 }}>Place</button>
                  <button onClick={() => handleRemove(c.name)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 12 }}>
          <button onClick={handlePowerOn} style={{ padding: '8px 12px', background: '#06b6d4', border: 'none', color: '#002' }}>Power On</button>
        </div>
      </aside>

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 10, color: '#cfefff' }}>
          <div style={{ padding: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 6 }}>Preview Scene</div>
        </div>
        <div style={{ width: '100%', height: '100%' }} ref={mountRef}></div>

        {powerOn ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,0,0,0.7)', color: '#8ff', padding: 20, borderRadius: 8 }}>
              <div style={{ fontFamily: 'monospace' }}>POST: CPU OK</div>
              <div style={{ fontFamily: 'monospace' }}>POST: Memory OK</div>
              <div style={{ fontFamily: 'monospace' }}>POST: GPU OK</div>
            </div>
          </div>
        ) : null}

        <div style={{ position: 'absolute', right: 12, top: 72 }}>
          <div style={{ padding: 8, background: 'rgba(0,0,0,0.5)', color: '#dff', borderRadius: 6 }}>
            <div><strong>Total TDP:</strong> {compat.totalTdp} W</div>
            <div><strong>Price:</strong> ${estimatePrice(buildMeta)}</div>
            <div style={{ color: compat.ok ? '#7ef' : '#f66' }}>{compat.ok ? 'Compatible' : `${compat.issues.length} issues`}</div>
            {!compat.ok && compat.issues.map((it, idx)=>(<div key={idx} style={{ fontSize: 12, color: '#f88' }}>• {it.message}</div>))}
          </div>
        </div>

        <PerformanceHUD stats={perfStats} />
      </div>
    </div>
  )
}
