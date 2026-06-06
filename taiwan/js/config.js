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
      id: "04", scene: "city",
      label: "歸來", labelEn: "HOMECOMING",
      lineColor: "#e3001b", lineCode: "R",
      lineName: "淡水信義線", lineNameEn: "Tamsui-Xinyi Line",
      stationName: "台北101", stationNameEn: "Taipei 101",
      stationCode: "R03",
      desc: "Standing beneath Taipei 101 — the city that became home.",
      view: { pitchDeg:0, yawDeg:-8, rollDeg:0, camYawDeg:-22, camPitchDeg:6, distance:4.2, height:0.5, lookAtY:0.35 }
    },
    {
      id: "05", scene: "industrial", nameEmphasis: "en",
      label: "未來", labelEn: "THE FUTURE",
      lineColor: "#009999", lineCode: "S",
      lineName: "西門子線", lineNameEn: "Siemens Line",
      stationName: "西門子", stationNameEn: "Siemens",
      stationCode: "S05",
      desc: "From Taipei to the world stage — the next chapter begins at Siemens.",
      view: { pitchDeg:0, yawDeg:14, rollDeg:0, camYawDeg:20, camPitchDeg:5, distance:4.2, height:0.5, lookAtY:0.35 }
    }
  ],
  viewDefaults: {
    pitchDeg:0, yawDeg:0, rollDeg:0, camYawDeg:0, camPitchDeg:0,
    distance:4.2, height:0.5, lookAtY:0.35, desiredSize:2.2, startOffsetY:0.0,
  },

  // ── Learn about Taiwan — Q&A content ──────────────────────────
  // Each entry is one expandable card. Edit the text freely.
  // photos: drop real images by setting `src` (e.g. "./assets/faq/visa.jpg").
  // Leave `src` out and it renders a labelled placeholder tile instead.
  faq: [
    {
      q: "Do I need a visa to visit Taiwan?",
      qZh: "簽證",
      cat: "Arrival", line: "#7c3aed",
      activity: "Paperwork",   actColor: "#00a8a8",
      location: "Taoyuan Airport", locColor: "#7a6ff0",
      a: `It depends on your passport. Many countries — including the US, UK, most of the EU, Australia, Canada and Japan — get visa-exempt entry for up to 90 days. You just need a passport valid for the length of your stay and an onward or return ticket.

If you're coming to study on a scholarship like I was, you usually arrive on a visitor visa and then convert to an ARC (Alien Resident Certificate) once you're here. Always double-check the latest rules on the Bureau of Consular Affairs site before you fly.`,
      photos: [ { cap: "Passport & ARC" }, { cap: "BOCA office" } ]
    },
    {
      q: "Where do I get the best food?",
      qZh: "美食",
      cat: "Food", line: "#008659",
      activity: "Eating",      actColor: "#e85d75",
      location: "Night Markets", locColor: "#f5a623",
      a: `Night markets are the heart of it — Shilin, Raohe and Ningxia are the classics. Go hungry and graze: beef noodle soup, gua bao, oyster omelette, stinky tofu, and bubble tea (which was invented here).

For a cheap, incredible breakfast, find a 豆漿店 (soy-milk shop) and order dan bing with warm soy milk. And don't sleep on the convenience stores — 7-Eleven and FamilyMart tea eggs and hot food are genuinely good.`,
      photos: [ { cap: "Raohe Night Market" }, { cap: "Beef noodle soup" }, { cap: "Bubble tea" } ]
    },
    {
      q: "How do I get around?",
      qZh: "交通",
      cat: "Transit", line: "#0070c0",
      activity: "Commuting",   actColor: "#2f80ed",
      location: "Across Taiwan", locColor: "#18a558",
      a: `Get an EasyCard (悠遊卡) the moment you land — tap it on the MRT, buses, trains, YouBikes, and even to pay at convenience stores. The Taipei MRT is clean, cheap and signed in English; this whole site is themed around it.

For longer trips, the High Speed Rail (HSR) runs down the west coast — Taipei to Kaohsiung in about two hours. Scooters rule the smaller towns, but you'll need the right licence to rent one.`,
      photos: [ { cap: "EasyCard" }, { cap: "Taipei MRT" }, { cap: "High Speed Rail" } ]
    },
    {
      q: "Money, SIM cards & staying connected?",
      qZh: "錢與網路",
      cat: "Essentials", line: "#f5a623",
      activity: "Connectivity", actColor: "#f2994a",
      location: "Convenience Stores", locColor: "#9b51e0",
      a: `Taiwan is still fairly cash-based — carry NT$ for night markets and small shops, though cards and mobile pay work in bigger stores. ATMs at 7-Eleven accept most foreign cards.

Grab a prepaid tourist SIM or eSIM at the airport (Chunghwa Telecom or Taiwan Mobile) for cheap unlimited data. Free public Wi-Fi (iTaiwan) is widely available too.`,
      photos: [ { cap: "NT$ cash" }, { cap: "Airport SIM counter" } ]
    },
    {
      q: "What's it like studying at Taipei Tech?",
      qZh: "北科大",
      cat: "Taipei Tech", line: "#e3001b",
      activity: "Studying",    actColor: "#6c5ce7",
      location: "Taipei Tech", locColor: "#008659",
      a: `I spent the exchange at National Taipei University of Technology (國立臺北科技大學) — "Taipei Tech" / NTUT — on a scholarship. It's a design and engineering school right in the heart of the city, a two-minute walk from MRT Zhongxiao Xinsheng on the Blue and Orange lines.

The campus mixes old red-brick halls with modern studios, and the moment you step out the gate you're in the Guang Hua tech market surrounded by cafés and night food. Classes were hands-on and the maker/design culture is strong — it's where a lot of this project's ideas started.`,
      photos: [ { cap: "Taipei Tech campus" }, { cap: "Red-brick hall" }, { cap: "Zhongxiao Xinsheng MRT" } ]
    }
  ]
};
