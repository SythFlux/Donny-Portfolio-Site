import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { setupEnvironment, animateEnvironment } from './lighting.js';

export class Viewer {
  constructor(container, modelUrl, viewConfig, timelineItems) {
    this.container = container;
    this.modelUrl = modelUrl;
    this.VIEW = viewConfig;
    this.timelineItems = timelineItems || [];
    
    this.modelBaseY = 0;

    // ── Camera/model view tween ───────────────────────────────
    // We tween DIRECTLY between the current view and the target station's
    // view. (The old code swept `progress` through every station in
    // between, which whipped the camera through intermediate stations'
    // extreme angles — e.g. 05→00 lurched through station 01's 143° yaw.)
    this.viewKeys = ['pitchDeg','yawDeg','rollDeg','camYawDeg','camPitchDeg','distance','height','lookAtY'];
    this.curView  = this._stationView(0);
    this.fromView = { ...this.curView };
    this.toView   = { ...this.curView };
    this.viewT    = 1;            // 0 = at fromView, 1 = settled at toView

    this._setupScene();
  }

  // Resolve a station's view, falling back to the shared defaults.
  _stationView(idx) {
    const v = (this.timelineItems[idx] && this.timelineItems[idx].view) || {};
    const out = {};
    for (const k of this.viewKeys) out[k] = v[k] ?? this.VIEW[k] ?? 0;
    return out;
  }

  _easeInOut(t) {
    return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
  }

  _setupScene() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gl-canvas';
    Object.assign(this.canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '60',
      // Same entrance feel as the hero text (heroRise): fade + gentle upward rise.
      opacity: '0', transform: 'translateY(22px)',
      transition: 'opacity 850ms cubic-bezier(0.22,1,0.36,1), transform 850ms cubic-bezier(0.22,1,0.36,1)'
    });
    this.container.insertBefore(this.canvas, this.container.firstChild);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // transparent — city canvas shows through

    this.scene = new THREE.Scene();
    // No background color — transparent so city scene is visible behind model
    this.renderer.shadowMap.enabled = false;

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 200);
    this.camera.position.set(0, this.VIEW.height, Math.max(0.15, this.VIEW.distance));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.enablePan = false;
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 6;
    this.controls.target.set(0, this.VIEW.lookAtY, 0);
    this.controls.enabled = false;

    // Load modular environment (backdrop, lighting, smoke)
    setupEnvironment(this.scene);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.model = null;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  async init() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/libs/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    try {
      const gltf = await loader.loadAsync(this.modelUrl);
      this.model = gltf.scene;
      this.rig.add(this.model);

      // Auto-scale and center logic
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = this.VIEW.desiredSize / maxDim;
      this.model.scale.setScalar(s);
      
      box.setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.model.position.y += -box.min.y * s + 0.02;
      
      this.modelBaseY = this.model.position.y;
      this.model.position.y = this.modelBaseY + this.VIEW.startOffsetY;
    } catch (e) {
      console.warn(`Failed to load ${this.modelUrl} — using fallback fallback mesh.`, e);
      const fallback = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 3), new THREE.MeshStandardMaterial({ color: 0xff4f4f }));
      fallback.position.y = 0.5;
      this.scene.add(fallback);
      this.model = fallback;
    }

    this.animate();
    // Reveal the model on the next frame (after it has rendered once) — fades
    // and rises into place like the hero text.
    requestAnimationFrame(() => {
      this.canvas.style.opacity = '1';
      this.canvas.style.transform = 'translateY(0)';
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(time) {
    requestAnimationFrame(this.animate.bind(this));

    // Advance the direct view tween (fixed-step → consistent ~0.8s move).
    if (this.viewT < 1) {
      this.viewT = Math.min(1, this.viewT + 0.02);
      const e = this._easeInOut(this.viewT);
      for (const k of this.viewKeys)
        this.curView[k] = THREE.MathUtils.lerp(this.fromView[k], this.toView[k], e);
    }

    // Animate background smoke
    animateEnvironment(time);

    const t = time * 0.001; // convert ms → seconds

    // --- Subtle continuous wave for the model (floating feel) ---
    const modelWaveY     = Math.sin(t * 0.8) * 0.012;        // gentle vertical bob
    const modelWavePitch = Math.sin(t * 0.6 + 1.0) * 0.28;   // micro tilt
    const modelWaveYaw   = Math.cos(t * 0.5 + 2.0) * 0.22;   // micro sway

    const v = this.curView;

    if (this.model) {
      this.rig.rotation.x = THREE.MathUtils.degToRad(v.pitchDeg + modelWavePitch);
      this.rig.rotation.y = THREE.MathUtils.degToRad(v.yawDeg + modelWaveYaw);
      this.rig.rotation.z = THREE.MathUtils.degToRad(v.rollDeg);
      this.rig.position.y = this.modelBaseY + modelWaveY;
    }

    // --- Subtle continuous wave for the camera (handheld breath) ---
    const camWaveX = Math.sin(t * 0.7 + 0.5) * 0.012;
    const camWaveY = Math.cos(t * 0.9 + 1.5) * 0.008;
    const camWaveZ = Math.sin(t * 0.55 + 2.5) * 0.010;

    // Orbit camera around the model using spherical coords (camYaw, camPitch, distance)
    const camYawRad   = THREE.MathUtils.degToRad(v.camYawDeg);
    const camPitchRad = THREE.MathUtils.degToRad(v.camPitchDeg);
    const lookTarget  = new THREE.Vector3(0, (this.modelBaseY || 0) + v.lookAtY, 0);
    this.camera.position.x = lookTarget.x + v.distance * Math.cos(camPitchRad) * Math.sin(camYawRad) + camWaveX;
    this.camera.position.y = lookTarget.y + v.distance * Math.sin(camPitchRad) + camWaveY;
    this.camera.position.z = lookTarget.z + v.distance * Math.cos(camPitchRad) * Math.cos(camYawRad) + camWaveZ;
    this.camera.lookAt(lookTarget);
    this.renderer.render(this.scene, this.camera);
  }

  // Smoothly tween the camera/model straight to a station's framing.
  setStation(idx) {
    this.fromView = { ...this.curView };
    this.toView   = this._stationView(idx);
    this.viewT    = 0;
  }

  // Back-compat: map a 0..1 progress to the nearest station and tween there.
  setModelProgress(p) {
    const max = Math.max(1, this.timelineItems.length - 1);
    this.setStation(Math.round(THREE.MathUtils.clamp(p, 0, 1) * max));
  }
}