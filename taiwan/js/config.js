export const config = {
  title: "Taipei Tech — Minor",
  description: "Dynamic configuration-driven timeline and 3D viewer.",
  modelUrl: "./assets/osmo3.glb",
  timelineItems: [
    { 
      id: "01", 
      label: "01 // THE LENS", 
      view: { pitchDeg: 0, yawDeg: -20, rollDeg: 0, distance: 4.5, height: 0.5, lookAtY: 0.3 } 
    },
    { 
      id: "02", 
      label: "02 // TOUCH SCREEN", 
      view: { pitchDeg: 0, yawDeg: 155, rollDeg: 0, distance: 4.0, height: 0.2, lookAtY: 0.1 } 
    },
    { 
      id: "03", 
      label: "03 // GIMBAL AXIS", 
      view: { pitchDeg: 5, yawDeg: 75, rollDeg: 0, distance: 3.8, height: 0.4, lookAtY: 0.2 } 
    },
    { 
      id: "04", 
      label: "04 // PRECISION CONTROLS", 
      view: { pitchDeg: -25, yawDeg: -10, rollDeg: 0, distance: 3.5, height: 0.1, lookAtY: -0.4 } 
    }
  ],
  viewDefaults: {
    pitchDeg: 0,
    yawDeg: -20,
    rollDeg: 0,
    distance: 4.5,
    height: 0.5,
    lookAtY: 0.3,
    desiredSize: 2.02,
    startOffsetY: 0.0,
  }
};