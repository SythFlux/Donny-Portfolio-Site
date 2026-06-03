export const config = {
  title: "Taipei Tech — Minor",
  description: "Dynamic configuration-driven timeline and 3D viewer.",
  modelUrl: "./assets/osmo3.glb",
  timelineItems: [
    { 
      id: "01", 
      label: "01 // THE LENS", 
      view: { 
        pitchDeg: 0, yawDeg: 0, rollDeg: 0,
        camYawDeg: -15, camPitchDeg: 5,
        distance: 4.2, height: 0.6, lookAtY: 0.3 
      } 
    },
    { 
      id: "02", 
      label: "02 // TOUCH SCREEN", 
      view: { 
        pitchDeg: 0, yawDeg: 165, rollDeg: -5,
        camYawDeg: 150, camPitchDeg: -5,
        distance: 3.8, height: 0.3, lookAtY: 0.15 
      } 
    },
    { 
      id: "03", 
      label: "03 // GIMBAL AXIS", 
      view: { 
        pitchDeg: 5, yawDeg: 75, rollDeg: 3,
        camYawDeg: 70, camPitchDeg: -8,
        distance: 3.5, height: 0.15, lookAtY: 0.1 
      } 
    },
    { 
      id: "04", 
      label: "04 // PRECISION CONTROLS", 
      view: { 
        pitchDeg: -20, yawDeg: -15, rollDeg: -3,
        camYawDeg: -25, camPitchDeg: 12,
        distance: 3.2, height: 0.1, lookAtY: -0.2 
      } 
    }
  ],
  viewDefaults: {
    pitchDeg: 0,
    yawDeg: 0,
    rollDeg: 0,
    camYawDeg: 0,
    camPitchDeg: 0,
    distance: 4.2,
    height: 0.6,
    lookAtY: 0.3,
    desiredSize: 2.02,
    startOffsetY: 0.0,
  }
};