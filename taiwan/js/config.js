export const config = {
  title: "Taiwan — Minor 2025",
  modelUrl: "./assets/osmo3.glb",
  timelineItems: [
    {
      id: "00", scene: "design",
      label: "出發", labelEn: "DEPARTURE",
      lineColor: "#7c3aed", lineCode: "V",
      lineName: "文創設計線", lineNameEn: "Creative Design Line",
      stationName: "出發站", stationNameEn: "Departure Hub",
      stationCode: "V00",
      desc: "A scholarship. A one-way ticket. The beginning of everything.",
      view: { pitchDeg:0, yawDeg:10, rollDeg:0, camYawDeg:18, camPitchDeg:4, distance:4.4, height:0.5, lookAtY:0.35 }
    },
    {
      id: "01", scene: "village",
      label: "探索", labelEn: "EXPLORATION",
      lineColor: "#0070c0", lineCode: "BL",
      lineName: "板南線", lineNameEn: "Bannan Line",
      stationName: "西門", stationNameEn: "Ximending",
      stationCode: "BL11",
      desc: "Street art, night markets, temples. Ximending is the beating heart of Taipei culture.",
      view: { pitchDeg:-4, yawDeg:158, rollDeg:4, camYawDeg:143, camPitchDeg:-4, distance:4.0, height:0.3, lookAtY:0.2 }
    },
    {
      id: "02", scene: "runway",
      label: "學習", labelEn: "STUDY",
      lineColor: "#008659", lineCode: "G",
      lineName: "松山新店線", lineNameEn: "Songshan-Xindian Line",
      stationName: "公館", stationNameEn: "Gongguan",
      stationCode: "G07",
      desc: "University district — surrounded by knowledge, coffee shops, and late-night ideas.",
      view: { pitchDeg:8, yawDeg:22, rollDeg:-2, camYawDeg:16, camPitchDeg:-14, distance:3.8, height:0.1, lookAtY:0.45 }
    },
    {
      id: "03", scene: "mountain",
      label: "回望", labelEn: "REFLECTION",
      lineColor: "#f5a623", lineCode: "O",
      lineName: "中和新蘆線", lineNameEn: "Zhonghe-Xinlu Line",
      stationName: "象山", stationNameEn: "Elephant Mountain",
      stationCode: "O11",
      desc: "Looking back from the summit — the city below, the semester behind, the future ahead.",
      view: { pitchDeg:-16, yawDeg:-25, rollDeg:-4, camYawDeg:-32, camPitchDeg:26, distance:4.4, height:0.45, lookAtY:0.05 }
    },
    {
      id: "05", scene: "city",
      label: "歸來", labelEn: "HOMECOMING",
      lineColor: "#e3001b", lineCode: "R",
      lineName: "淡水信義線", lineNameEn: "Tamsui-Xinyi Line",
      stationName: "台北101", stationNameEn: "Taipei 101",
      stationCode: "R03",
      desc: "Standing beneath Taipei 101 — the city that became home.",
      view: { pitchDeg:0, yawDeg:-8, rollDeg:0, camYawDeg:-22, camPitchDeg:6, distance:4.2, height:0.5, lookAtY:0.35 }
    }
  ],
  viewDefaults: {
    pitchDeg:0, yawDeg:0, rollDeg:0, camYawDeg:0, camPitchDeg:0,
    distance:4.2, height:0.5, lookAtY:0.35, desiredSize:2.2, startOffsetY:0.0,
  }
};
