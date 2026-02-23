/* ═══════════════════════════════════════════════════════════════════
   config.js — Project data & orb layout
   Edit these to customise your portfolio!
   ═══════════════════════════════════════════════════════════════════ */

export const PROJECTS = [
  {
    name: 'About Me',
    tag: 'Personal',
    techs: [],
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
    description: `
      <p>Hi, I'm <strong>Donny Vo</strong> a Computer Engineering student at
      Rotterdam University of Applied Sciences (2023–2027), based in the Netherlands.</p>
      <p>I build across the full stack, spanning low-level embedded systems, real-time web applications, and cloud software.
      I'm driven by complex problems that sit at the intersection of hardware and software.</p>
      <p><strong>Let's connect:</strong></p>
      <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;">
        <a href="https://www.linkedin.com/in/donnyvo/" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;background:#0a66c2;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.03em;transition:opacity .2s;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
        <a href="https://github.com/SythFlux" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;background:#24292f;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.03em;transition:opacity .2s;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          GitHub
        </a>
      </div>`,
   
    isAbout: true,
  },
  {
    name: 'TNO Internship',
    tag: 'Software Engineer Intern',
    techs: ['C++', 'Python', 'GitLab', 'ZeroMQ', 'Android Automotive', 'CI/CD'],
    image: 'https://media.licdn.com/dms/image/v2/D4E2DAQEZuc1HFZLgGg/profile-treasury-image-shrink_800_800/B4EZwuWvelJAAY-/0/1770304242494?e=1772229600&v=beta&t=RrpJ9STi1bqSORsnp9uzMyopu2jBNrks-zfz5c--Bbs',
    description: `
      <p><strong>TNO — Android Automotive Integration in Dynamic Driving Simulator</strong><br/>
      August 2025 – January 2026</p>
      <p>Worked at TNO (Netherlands Organisation for Applied Scientific Research) as intern, integrating
      TomTom's Android Automotive navigation stack into TNO's dynamic driving simulator.</p>
      <ul>
        <li>Developed a C++ low-level interface to extract real-time simulated vehicle state data</li>
        <li>Integrated TomTom Android Automotive navigation stack with TNO driving simulator</li>
        <li>Implemented real-time communication between simulator, navigation hardware and cluster</li>
        <li>Integrated real-time traffic information for the driving simulator</li>
        <li>Designed CI/CD pipelines for automation of driving simulator modules</li>
        <li>Collaborated with TomTom engineers and TNO researchers in a research-oriented environment</li>
      </ul>`,
    link: 'https://www.tno.nl',
  },
  {
    name: 'Redox Flow Monitor',
    tag: 'Full-Stack / Data Engineering',
    techs: ['Python', 'FastAPI', 'PostgreSQL', 'InfluxDB', 'Docker'],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    description: `
      <p><strong>Secure Web-based Data Monitoring for Redox Flow Battery System</strong><br/>
      Collaboration with Tempelman Chemical Technology — January 2024 – June 2025</p>
      <p>Designed and built a full-stack monitoring platform for a redox flow battery system,
      handling live sensor ingestion, storage, and real-time visualization.</p>
      <ul>
        <li>Developed data infrastructure with PostgreSQL and InfluxDB</li>
        <li>Created a visual dashboard in HTML/CSS/JS to display live sensor values</li>
        <li>Built a backend in Python using FastAPI with secure API endpoints</li>
        <li>Deployed a Docker-based web application, reducing downtime by 30%</li>
        <li>Processed 20 sensor readings/sec in Python/SQL feeding live data to the dashboard</li>
      </ul>`,
    link: "https://youtu.be/W_nESDHImNM",
  },
  {
    name: 'IP-CAR',
    tag: 'Embedded Systems',
    techs: ['C++', 'STM32', 'Sensor Fusion', 'ROS'],
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80',
    description: `
      <p><strong>IP-CAR: Remote Museum Access Car</strong><br/>
      Collaboration with Kenniscentrum Zorginnovatie &amp; VindiQu — August 2024 – January 2025</p>
      <p>Built an autonomous navigation car enabling remote museum access, focusing on
      embedded sensor fusion and reliable real-time obstacle detection.</p>
      <ul>
        <li>Developed a real-time sensor fusion algorithm (C++/STM32) combining Ultrasonic and Time-of-Flight sensors for obstacle detection</li>
        <li>Integrated 4+ sensors with STM32, ensuring 360° awareness and smooth navigation</li>
        <li>Led testing and tuning of autonomous behavior, optimizing embedded software for stability</li>
      </ul>`,
    link: "https://youtu.be/uYjcSJcnJmY",
  },
  {
    name: 'Education',
    tag: 'Rotterdam UAS · 2023–2027',
    techs: ['Software Engineering', 'Embedded Software', 'Data Engineering'],
    image: 'https://ganessolutions.com/wp-content/uploads/2024/05/university-705x321.jpg',
    description: `
      <p><strong>Rotterdam University of Applied Sciences</strong><br/>
      HBO Bachelor — Computer Engineering · 2023–2027 · Rotterdam, ZH</p>
      <p>Pursuing a Bachelor's in Computer Engineering with a focus on the intersection
      of hardware, embedded systems, and modern software development.</p>
      <p><strong>Relevant Courses:</strong></p>
      <ul>
        <li>Software Engineering</li>
        <li>Embedded Software</li>
        <li>Data Engineering</li>
      </ul>`,
    link: 'https://www.hogeschoolrotterdam.nl',
  },
  {
    name: 'Technical Skills',
    tag: 'Skills',
    techs: [],
    image: null,
    description: `
      <p style="font-size:11px;letter-spacing:.08em;opacity:.5;text-transform:uppercase;margin-bottom:10px;">Programming Languages</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
        <span class="skill-icon-badge"><i class="devicon-c-plain colored"></i><span>C</span></span>
        <span class="skill-icon-badge"><i class="devicon-cplusplus-plain colored"></i><span>C++</span></span>
        <span class="skill-icon-badge"><i class="devicon-python-plain colored"></i><span>Python</span></span>
        <span class="skill-icon-badge"><i class="devicon-java-plain colored"></i><span>Java</span></span>
        <span class="skill-icon-badge"><i class="devicon-lua-plain colored"></i><span>Lua</span></span>
        <span class="skill-icon-badge"><i class="devicon-php-plain colored"></i><span>PHP</span></span>
        <span class="skill-icon-badge"><i class="devicon-haskell-plain colored"></i><span>Haskell</span></span>
        <span class="skill-icon-badge"><i class="devicon-rust-plain colored"></i><span>Rust</span></span>
      </div>
      <p style="font-size:11px;letter-spacing:.08em;opacity:.5;text-transform:uppercase;margin-bottom:10px;">Software &amp; Tools</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
        <span class="skill-icon-badge"><i class="devicon-git-plain colored"></i><span>Git</span></span>
        <span class="skill-icon-badge"><i class="devicon-github-plain colored"></i><span>GitHub</span></span>
        <span class="skill-icon-badge"><i class="devicon-gitlab-plain colored"></i><span>GitLab</span></span>
        <span class="skill-icon-badge"><i class="devicon-bash-plain colored"></i><span>Bash</span></span>
        <span class="skill-icon-badge"><i class="devicon-docker-plain colored"></i><span>Docker</span></span>
        <span class="skill-icon-badge"><i class="devicon-linux-plain colored"></i><span>Linux</span></span>
        <span class="skill-icon-badge"><i class="devicon-ros-plain colored"></i><span>ROS</span></span>
      </div>
      <p style="font-size:11px;letter-spacing:.08em;opacity:.5;text-transform:uppercase;margin-bottom:10px;">Databases &amp; Data</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
        <span class="skill-icon-badge"><i class="devicon-postgresql-plain colored"></i><span>PostgreSQL</span></span>
        <span class="skill-icon-badge"><i class="devicon-influxdb-plain colored"></i><span>InfluxDB</span></span>
        <span class="skill-icon-badge"><i class="devicon-azuresqldatabase-plain colored"></i><span>SQL</span></span>
      </div>
      <p style="font-size:11px;letter-spacing:.08em;opacity:.5;text-transform:uppercase;margin-bottom:10px;">Web Development</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <span class="skill-icon-badge"><i class="devicon-html5-plain colored"></i><span>HTML</span></span>
        <span class="skill-icon-badge"><i class="devicon-css3-plain colored"></i><span>CSS</span></span>
        <span class="skill-icon-badge"><i class="devicon-javascript-plain colored"></i><span>JavaScript</span></span>
        <span class="skill-icon-badge"><i class="devicon-nodejs-plain colored"></i><span>Node.js</span></span>
        <span class="skill-icon-badge"><i class="devicon-angularjs-plain colored"></i><span>Angular</span></span>
        <span class="skill-icon-badge"><i class="devicon-threejs-original colored"></i><span>Three.js</span></span>
      </div>`,
    link: null,
  },
  {
    name: 'Soft Skills',
    tag: 'How I Work',
    techs: ['Agile', 'Scrum', 'Cross-disciplinary'],
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
    description: `
      <p>I thrive in collaborative, research-driven environments where both engineering
      rigour and creative thinking are valued.</p>
      <ul>
        <li>Agile / Scrum collaboration</li>
        <li>Cross-disciplinary teamwork (research labs, industry partners)</li>
        <li>Problem solving &amp; systems thinking</li>
        <li>Technical documentation &amp; code reviews</li>
        <li>Independent problem ownership</li>
      </ul>
      <p></p>`,
    link: null,
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
