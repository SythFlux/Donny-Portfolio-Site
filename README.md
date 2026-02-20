# Flex — Interactive 3D Portfolio

A visually rich, interactive portfolio website built with **Three.js** and vanilla JavaScript. Projects are presented as 3D orbs in a dynamic scene with constellation lines, particle effects, parallax motion, and post-processing — all running in the browser with zero build tools.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=threedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

---

## Features

- **3D Orb Navigation** — Each project is an interactive orb in a Three.js scene. Click to explore, drag to orbit, scroll to zoom.
- **Constellation Lines** — Dynamic connecting lines drawn between project orbs.
- **Particle System** — Ambient floating particles for atmospheric depth.
- **Mechanical Construct** — Decorative background geometry that rotates and animates.
- **Post-Processing** — Bloom and vignette effects via Three.js post-processing pipeline.
- **Parallax Motion** — Mouse-driven parallax on the entire scene for a sense of depth.
- **HUD Overlay** — Sci-fi heads-up display drawn on a dedicated canvas layer.
- **Terminal Boot Sequence** — Animated hacker-style terminal intro on page load.
- **Dark / Light Mode** — Smooth theme toggle with a slider switch.
- **7 Accent Colors** — Switchable color themes (Default, Ocean Blue, NVIDIA Green, Purple, Cyan, Orange, Pink).
- **Browser-Style Tabs** — Portfolio and Contact pages navigated via a tab bar with animated page transitions.
- **Custom Cursor** — Dot + ring cursor that reacts to interactive elements.
- **Contact Page** — Floating info nodes, DNA helix canvas background, and a terminal-styled message form.
- **Sound Effects** — Optional audio feedback on interactions.
- **Intro Animation** — Cinematic fly-in camera animation on first load.

---

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Engine | [Three.js](https://threejs.org/) v0.164 (ES module via CDN import map) |
| Language | Vanilla JavaScript (ES Modules) |
| Styling | CSS3 with custom properties for theming |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter) & [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) |
| Deployment | Docker (Nginx Alpine) |

No bundler, no framework — just native ES modules loaded directly by the browser.

---

## Project Structure

```
Flex/
├── index.html              # Single-page entry point (Portfolio + Contact)
├── css/
│   └── style.css           # All styles, theming, animations
├── js/
│   ├── main.js             # Entry point — wires all modules together
│   ├── config.js           # Project data & orb layout positions
│   ├── scene.js            # Three.js scene, camera, renderer setup
│   ├── orbs.js             # Creates project orbs from config data
│   ├── orbfx.js            # Per-orb visual decorations & effects
│   ├── animation.js        # Main render loop
│   ├── interaction.js      # Raycaster hover, click, audio resume
│   ├── panel.js            # Detail panel (project info slide-out)
│   ├── nav.js              # Side navigation dots
│   ├── tabs.js             # Browser-style tab switching
│   ├── particles.js        # Ambient particle system
│   ├── constellation.js    # Lines connecting orbs
│   ├── construct.js        # Background mechanical construct geometry
│   ├── parallax.js         # Mouse-driven parallax movement
│   ├── postprocessing.js   # Bloom + vignette post-processing
│   ├── darkmode.js         # Theme toggle & accent color logic
│   ├── cursor.js           # Custom dot + ring cursor
│   ├── terminal.js         # Boot sequence terminal animation
│   ├── hud.js              # Sci-fi HUD overlay canvas
│   ├── helix.js            # DNA helix canvas for contact page
│   ├── intro.js            # Camera fly-in intro animation
│   ├── harmonics.js        # Harmonic motion utilities
│   └── sound.js            # Audio feedback manager
├── Dockerfile              # Nginx Alpine image
├── docker-compose.yml      # Single-service compose config
└── README.md
```

---

## Getting Started

### Prerequisites

- A modern browser with ES module support (Chrome, Firefox, Edge, Safari)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### Run Locally

Since the project uses native ES modules, you need a local HTTP server (browsers block `import` over `file://`).

**Option 1 — Python:**
```bash
cd Flex
python -m http.server 8000
```

**Option 2 — Node.js (npx):**
```bash
cd Flex
npx serve .
```

Then open [http://localhost:8000](http://localhost:8000).

### Run with Docker

```bash
docker compose up -d --build
```

The site will be available at [http://localhost](http://localhost) (port 80).

---

## Customization

### Adding / Editing Projects

All project data lives in [`js/config.js`](js/config.js). Each entry in the `PROJECTS` array defines:

```js
{
  name: 'Project Name',
  tag: 'Category',
  techs: ['Tech1', 'Tech2'],
  image: 'https://...',
  description: `<p>HTML description...</p>`,
  link: 'https://...',   // or null
}
```

Orb positions in 3D space are set in the `ORB_ORIGINS` array (one `[x, y, z]` per project).

### Theming

- **Dark/Light mode** is toggled via the header switch and managed in `js/darkmode.js`.
- **Accent colors** are applied through CSS custom properties. Add new swatches in `index.html` and register them in `js/darkmode.js`.

---

## License

© 2026 Donny Vo. All rights reserved.
