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
    
    this.progressTarget = 0;
    this.currentProgress = 0;
    this.modelBaseY = 0;
    
    this._setupScene();
  }

  _setupScene() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gl-canvas';
    Object.assign(this.canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '60'
    });
    this.container.insertBefore(this.canvas, this.container.firstChild);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

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
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(time) {
    requestAnimationFrame(this.animate.bind(this));
    this.currentProgress += (this.progressTarget - this.currentProgress) * 0.12;
    
    // Animate background smoke
    animateEnvironment(time);

    let currentPitch = this.VIEW.pitchDeg;
    let currentYaw = this.VIEW.yawDeg;
    let currentRoll = this.VIEW.rollDeg;
    let currentDistance = this.VIEW.distance;
    let currentHeight = this.VIEW.height;
    let currentLookAtY = this.VIEW.lookAtY;
    
    if (this.timelineItems && this.timelineItems.length > 1) {
      const maxIndex = this.timelineItems.length - 1;
      const exactIndex = Math.max(0, Math.min(this.currentProgress, 1)) * maxIndex;
      const index = Math.floor(exactIndex);
      const nextIndex = Math.min(index + 1, maxIndex);
      const lerpFactor = exactIndex - index;
      
      const v1 = this.timelineItems[index].view || this.VIEW;
      const v2 = this.timelineItems[nextIndex].view || this.VIEW;
      
      currentPitch = THREE.MathUtils.lerp(v1.pitchDeg ?? this.VIEW.pitchDeg, v2.pitchDeg ?? this.VIEW.pitchDeg, lerpFactor);
      currentYaw = THREE.MathUtils.lerp(v1.yawDeg ?? this.VIEW.yawDeg, v2.yawDeg ?? this.VIEW.yawDeg, lerpFactor);
      currentRoll = THREE.MathUtils.lerp(v1.rollDeg ?? this.VIEW.rollDeg, v2.rollDeg ?? this.VIEW.rollDeg, lerpFactor);
      currentDistance = THREE.MathUtils.lerp(v1.distance ?? this.VIEW.distance, v2.distance ?? this.VIEW.distance, lerpFactor);
      currentHeight = THREE.MathUtils.lerp(v1.height ?? this.VIEW.height, v2.height ?? this.VIEW.height, lerpFactor);
      currentLookAtY = THREE.MathUtils.lerp(v1.lookAtY ?? this.VIEW.lookAtY, v2.lookAtY ?? this.VIEW.lookAtY, lerpFactor);
    }

    if (this.model) {
      this.rig.rotation.x = THREE.MathUtils.degToRad(currentPitch);
      this.rig.rotation.y = THREE.MathUtils.degToRad(currentYaw);
      this.rig.rotation.z = THREE.MathUtils.degToRad(currentRoll);
      // Height shift linked to rotation
      this.rig.position.y = this.modelBaseY + this.VIEW.startOffsetY * (1 - this.currentProgress);
    }
    
    this.camera.position.set(0, currentHeight, Math.max(0.15, currentDistance));
    this.camera.lookAt(0, (this.modelBaseY || 0) + currentLookAtY, 0);
    this.renderer.render(this.scene, this.camera);
  }

  setModelProgress(p) {
    this.progressTarget = THREE.MathUtils.clamp(p, 0, 1);
  }
}