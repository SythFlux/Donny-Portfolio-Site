import * as THREE from 'three';

export let smokeParticles = [];

export function setupEnvironment(scene) {
  // Dark cinematic fog to fade out the background entirely
  scene.fog = new THREE.FogExp2(0x020002, 0.08);

  // Very low ambient baseline
  const ambient = new THREE.AmbientLight(0x0a0a0a, 1.0);
  scene.add(ambient);

  // Neutral key light from the front-top to illuminate the main subject
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.5); // Bring up intensity to make model pop
  keyLight.position.set(2, 6, 4);
  scene.add(keyLight);

  // Deep, dramatic cinematic red light completely from the bottom
  const bottomRed = new THREE.SpotLight(0xd90016, 250); // High intensity
  bottomRed.position.set(0, -6, 2);
  bottomRed.angle = Math.PI / 1.2; // Massive wide spill
  bottomRed.penumbra = 1.0; // Extremely soft, feathered edge
  bottomRed.decay = 2.0;
  bottomRed.distance = 50;
  bottomRed.target.position.set(0, 5, -2); // Aim slightly back and up
  scene.add(bottomRed);
  scene.add(bottomRed.target);

  // Subtle dark blue rim light from the back to contrast the red
  const rimLight = new THREE.SpotLight(0x051133, 150);
  rimLight.position.set(-6, 4, -5);
  rimLight.target.position.set(0, 0, 0);
  scene.add(rimLight);
  scene.add(rimLight.target);

  // Generate a much softer, more diffuse cloud-like texture
  const canvas = document.createElement('canvas');
  canvas.width = 256; 
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  // Extremely soft alpha steps so it looks like thick gas, not glowing orbs
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.01)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const smokeTex = new THREE.CanvasTexture(canvas);

  // Using Sprites instead of points allows for rotation, individual scaling, and true 3D volumetric feel
  const smokeCount = 45;
  for (let i = 0; i < smokeCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: 0xaa0515, // Deep cinematic red tint
      transparent: true,
      opacity: Math.random() * 0.4 + 0.1, // Subtle transparencies
      depthWrite: false, // Prevents z-fighting hard edges
      blending: THREE.NormalBlending // Normal blending gives a realistic cloudy look, not a glowing neon look
    });
    
    const sprite = new THREE.Sprite(mat);
    
    // Make them massively large clouds
    const size = Math.random() * 10 + 8;
    sprite.scale.set(size, size, 1);
    
    // Spread them widely from the deep bottom
    sprite.position.set(
      (Math.random() - 0.5) * 20,     // x spread, slightly wider
      (Math.random() * 4) - 9,        // y spread (keep it deep: between -9 and -5)
      (Math.random() - 0.5) * 8 - 2   // z depth
    );

    // Random initial rotation
    sprite.material.rotation = Math.random() * Math.PI * 2;

    scene.add(sprite);

    // Store particle data for animation
    smokeParticles.push({
      sprite,
      baseSize: size,
      vY: Math.random() * 0.01 + 0.005, // Slow float upwards
      vX: (Math.random() - 0.5) * 0.005, // Slight drift left/right
      vRot: (Math.random() - 0.5) * 0.003 // Very slow spin
    });
  }
}

export function animateEnvironment(time) {
  for (let i = 0; i < smokeParticles.length; i++) {
    const p = smokeParticles[i];
    
    // Move up and slowly drift
    p.sprite.position.y += p.vY;
    p.sprite.position.x += p.vX;
    
    // Slowly rotate on its z-axis for evolving cloud shapes
    p.sprite.material.rotation += p.vRot;

    // Plumes of smoke expand slightly as they rise
    const currentScale = p.sprite.scale.x;
    const nextScale = currentScale + 0.005;
    p.sprite.scale.set(nextScale, nextScale, 1);
    
    // As smoke starts leaving the bottom area, fade it out quickly
    if (p.sprite.position.y > -2.5) {
      const op = p.sprite.material.opacity - 0.008; // Fade out faster
      p.sprite.material.opacity = Math.max(0, op);
    }

    // Recycle particle once faded or too high
    if (p.sprite.position.y > 1 || p.sprite.material.opacity <= 0) {
      p.sprite.position.y = (Math.random() * 2) - 10; // Put it back way at the deep bottom (-10 to -8)
      p.sprite.position.x = (Math.random() - 0.5) * 20;
      p.sprite.scale.set(p.baseSize, p.baseSize, 1); // Reset size
      p.sprite.material.opacity = Math.random() * 0.4 + 0.1; // Reset opacity
    }
  }
}
