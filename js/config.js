/* ═══════════════════════════════════════════════════════════════════
   config.js — Project data & orb layout
   Edit these to customise your portfolio!
   ═══════════════════════════════════════════════════════════════════ */

export const PROJECTS = [
  {
    name: 'About Me',
    tag: 'Personal',
    techs: [''],
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
    description: `
      <p>Hi, I'm <strong>Donny Vo</strong> — A Student Computer engineer passionate about
      building beautiful, interactive digital experiences that blend art and engineering.</p>
      <p>I specialise in full-stack web development, 3D graphics, and data visualization.
      When I'm not coding, you'll find me experimenting with generative art, playing music,
      or exploring new tech.</p>
      <p><strong>Let's connect:</strong></p>
      <ul>
        <li>GitHub — github.com/donnyvo</li>
        <li>LinkedIn — linkedin.com/in/donnyvo</li>
        <li>Email — hello@donnyvo.dev</li>
      </ul>`,
    link: null,
    isAbout: true,
  },
  {
    name: 'Flex Platform',
    tag: 'Web Application',
    techs: ['React', 'Node.js', 'PostgreSQL'],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    description: `
      <p>A full-stack web platform built for modern teams to collaborate in real-time.
      Features include live document editing, task boards, and integrated video calls.</p>
      <ul>
        <li>Real-time collaboration using WebSockets</li>
        <li>Role-based access control &amp; SSO integration</li>
        <li>Deployed on AWS with CI/CD pipeline</li>
      </ul>`,
    link: '#',
  },
  {
    name: 'Neural Canvas',
    tag: 'Machine Learning',
    techs: ['Python', 'PyTorch', 'WebGL'],
    image: 'https://images.unsplash.com/photo-1547954575-855750c57bd3?w=600&q=80',
    description: `
      <p>An interactive AI art generator that transforms text prompts into stylized
      digital paintings using a custom diffusion model trained on classical art.</p>
      <ul>
        <li>Fine-tuned Stable Diffusion for artistic styles</li>
        <li>WebGL-based real-time preview pipeline</li>
        <li>Gallery mode with community sharing</li>
      </ul>`,
    link: '#',
  },
  {
    name: 'UrbanFlow',
    tag: 'Data Visualization',
    techs: ['D3.js', 'Mapbox', 'Python'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    description: `
      <p>A city traffic analysis dashboard that visualizes real-time movement patterns
      across urban areas. Used by city planners to optimize road networks.</p>
      <ul>
        <li>Processes 2 M+ GPS data points per day</li>
        <li>Heatmap overlays with time-series playback</li>
        <li>Predictive congestion modeling</li>
      </ul>`,
    link: '#',
  },
  {
    name: 'SoundForge',
    tag: 'Audio Engineering',
    techs: ['Web Audio API', 'Rust', 'WASM'],
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80',
    description: `
      <p>A browser-based digital audio workstation with multi-track recording,
      real-time effects processing, and MIDI support — all running in WebAssembly.</p>
      <ul>
        <li>Zero-latency audio processing via WASM</li>
        <li>20+ built-in synthesizers and effects</li>
        <li>MIDI controller mapping &amp; automation</li>
      </ul>`,
    link: '#',
  },
  {
    name: 'CryptoLens',
    tag: 'Fintech',
    techs: ['TypeScript', 'Solidity', 'GraphQL'],
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80',
    description: `
      <p>A DeFi analytics dashboard providing real-time portfolio tracking,
      yield farming comparisons, and on-chain transaction analysis.</p>
      <ul>
        <li>Multi-chain support (Ethereum, Polygon, Solana)</li>
        <li>Smart contract risk scoring algorithm</li>
        <li>Real-time price alerts &amp; notifications</li>
      </ul>`,
    link: '#',
  },
  {
    name: 'MediSync',
    tag: 'Healthcare',
    techs: ['Flutter', 'Firebase', 'HL7 FHIR'],
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
    description: `
      <p>A patient-doctor communication app with scheduling, secure messaging,
      prescription management, and health record integration.</p>
      <ul>
        <li>HIPAA-compliant end-to-end encryption</li>
        <li>Integration with major EHR systems</li>
        <li>AI-powered symptom pre-screening</li>
      </ul>`,
    link: '#',
  },
];

/** Starting positions for each orb in world-space */
export const ORB_ORIGINS = [
  [ 0.0,  5.0, -1.5],   // About Me — top centre, slightly prominent
  [-8.5,  2.0, -1.5],
  [ 8.0,  2.8,  0.8],
  [-3.0, -4.0,  2.2],
  [ 4.8, -3.8, -0.8],
  [-7.8, -1.5,  3.0],
  [ 0.8, -1.0, -3.0],
];
