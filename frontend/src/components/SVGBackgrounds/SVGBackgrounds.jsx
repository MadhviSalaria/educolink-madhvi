// ADVANCED SVG Background Components for Premium Design

export const GradientMesh = ({ id = 'gradient-mesh', colors = ['#574db3', '#9c93fe', '#b8b3ff'] }) => (
  <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <defs>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="2" />
        <feDisplacementMap in="SourceGraphic" scale="80" />
      </filter>
      <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors[0]} stopOpacity="0.5" />
        <stop offset="50%" stopColor={colors[1]} stopOpacity="0.4" />
        <stop offset="100%" stopColor={colors[2]} stopOpacity="0.3" />
      </linearGradient>
      <radialGradient id="radial-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={colors[0]} stopOpacity="0.25" />
        <stop offset="100%" stopColor={colors[2]} stopOpacity="0" />
      </radialGradient>
      <filter id="blur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
      </filter>
    </defs>
    
    <rect width="1200" height="800" fill={colors[0]} opacity="0.08" />
    <circle cx="200" cy="150" r="300" fill={`url(#${id})`} filter="url(#noise)" opacity="0.7" />
    <circle cx="1000" cy="600" r="350" fill={`url(#radial-glow)`} opacity="0.5" />
    <circle cx="600" cy="-100" r="250" fill={colors[1]} opacity="0.15" filter="url(#blur)" />
    <ellipse cx="600" cy="400" rx="400" ry="300" fill={colors[1]} opacity="0.12" />
    
    {/* Additional decorative circles */}
    <circle cx="100" cy="700" r="150" fill={colors[2]} opacity="0.1" filter="url(#blur)" />
    <circle cx="1100" cy="100" r="200" fill={colors[0]} opacity="0.08" filter="url(#blur)" />
  </svg>
);

export const OrganicShapes = () => (
  <svg width="100%" height="100%" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <defs>
      <filter id="smooth">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
      </filter>
    </defs>
    <path d="M 0,300 Q 300,200 600,250 T 1200,300 L 1200,600 L 0,600 Z" fill="#574db3" opacity="0.06" filter="url(#smooth)" />
    <path d="M 0,250 Q 400,150 800,200 T 1200,250 L 1200,400 L 0,400 Z" fill="#9c93fe" opacity="0.04" filter="url(#smooth)" />
  </svg>
);

export const FloatingShapes = () => (
  <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <defs>
      <style>{`
        @keyframes float1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-15px, 15px); } }
        @keyframes float3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(10px, 10px); } }
        .shape-1 { animation: float1 8s ease-in-out infinite; }
        .shape-2 { animation: float2 10s ease-in-out infinite; }
        .shape-3 { animation: float3 12s ease-in-out infinite; }
      `}</style>
      <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#574db3" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#9c93fe" stopOpacity="0.08" />
      </linearGradient>
    </defs>
    
    <g className="shape-1">
      <circle cx="100" cy="100" r="80" fill="url(#grad-blue)" />
      <circle cx="150" cy="120" r="30" fill="#9c93fe" opacity="0.1" />
    </g>
    <g className="shape-2">
      <circle cx="1100" cy="700" r="120" fill="#00685a" opacity="0.08" />
    </g>
    <g className="shape-3">
      <circle cx="600" cy="200" r="60" fill="#864a4b" opacity="0.1" />
    </g>
  </svg>
);

export const DottedPattern = () => (
  <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <defs>
      <pattern id="dots" x="40" y="40" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="2" fill="#574db3" opacity="0.1" />
      </pattern>
    </defs>
    <rect width="1200" height="800" fill="url(#dots)" />
  </svg>
);

export const WavePattern = ({ color = '#574db3' }) => (
  <svg width="100%" height="100%" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <path d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z" fill={color} opacity="0.08" />
    <path d="M0,120 Q300,70 600,120 T1200,120 L1200,200 L0,200 Z" fill={color} opacity="0.05" />
  </svg>
);

// Illustration components
export const IllustrationBook = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="book-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#574db3" />
        <stop offset="100%" stopColor="#9c93fe" />
      </linearGradient>
    </defs>
    <rect x="40" y="40" width="120" height="100" rx="8" fill="url(#book-grad)" opacity="0.2" />
    <path d="M 100 40 L 100 140" stroke="#574db3" strokeWidth="3" opacity="0.5" />
    <circle cx="65" cy="75" r="8" fill="#574db3" opacity="0.3" />
    <circle cx="135" cy="75" r="8" fill="#574db3" opacity="0.3" />
    <rect x="55" y="95" width="30" height="3" fill="#574db3" opacity="0.2" />
    <rect x="95" y="95" width="30" height="3" fill="#574db3" opacity="0.2" />
    <rect x="55" y="105" width="70" height="2" fill="#574db3" opacity="0.15" />
  </svg>
);

export const IllustrationRocket = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="rocket-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00685a" />
        <stop offset="100%" stopColor="#93f4e0" />
      </linearGradient>
    </defs>
    <path d="M 100 30 L 130 120 L 100 110 L 70 120 Z" fill="url(#rocket-grad)" />
    <circle cx="100" cy="65" r="15" fill="#93f4e0" opacity="0.4" />
    <path d="M 80 120 Q 75 140 70 160" stroke="#00685a" strokeWidth="8" fill="none" opacity="0.3" />
    <path d="M 120 120 Q 125 140 130 160" stroke="#00685a" strokeWidth="8" fill="none" opacity="0.3" />
    <circle cx="100" cy="50" r="8" fill="#fff" />
  </svg>
);

export const IllustrationAI = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <radialGradient id="ai-grad">
        <stop offset="0%" stopColor="#9c93fe" />
        <stop offset="100%" stopColor="#574db3" />
      </radialGradient>
    </defs>
    <rect x="40" y="40" width="120" height="120" rx="20" fill="url(#ai-grad)" opacity="0.15" />
    <circle cx="80" cy="80" r="12" fill="#574db3" opacity="0.3" />
    <circle cx="100" cy="100" r="12" fill="#574db3" opacity="0.4" />
    <circle cx="120" cy="80" r="12" fill="#574db3" opacity="0.3" />
    <line x1="80" y1="80" x2="100" y2="100" stroke="#574db3" strokeWidth="2" opacity="0.2" />
    <line x1="120" y1="80" x2="100" y2="100" stroke="#574db3" strokeWidth="2" opacity="0.2" />
  </svg>
);

export const IllustrationChart = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="chart-grad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#00685a" />
        <stop offset="100%" stopColor="#93f4e0" />
      </linearGradient>
    </defs>
    <rect x="50" y="100" width="20" height="60" fill="url(#chart-grad)" opacity="0.4" rx="3" />
    <rect x="80" y="70" width="20" height="90" fill="url(#chart-grad)" opacity="0.6" rx="3" />
    <rect x="110" y="50" width="20" height="110" fill="url(#chart-grad)" opacity="0.8" rx="3" />
    <line x1="40" y1="160" x2="150" y2="160" stroke="#574db3" strokeWidth="2" opacity="0.3" />
    
    {/* Decorative dots */}
    <circle cx="60" cy="95" r="4" fill="#00685a" opacity="0.3" />
    <circle cx="90" cy="65" r="4" fill="#00685a" opacity="0.4" />
    <circle cx="120" cy="45" r="4" fill="#00685a" opacity="0.5" />
  </svg>
);

// Advanced: 3D Book Illustration
export const IllustrationBook3D = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="book-3d-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#574db3" />
        <stop offset="100%" stopColor="#9c93fe" />
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="3" dy="3" stdDeviation="3" floodOpacity="0.2" />
      </filter>
    </defs>
    
    {/* Book spine (side) */}
    <path d="M 75 60 L 85 55 L 85 135 L 75 140 Z" fill="#9c93fe" opacity="0.3" />
    
    {/* Book front cover */}
    <rect x="40" y="60" width="35" height="80" fill="url(#book-3d-grad)" filter="url(#shadow)" rx="2" />
    
    {/* Book back cover */}
    <rect x="75" y="55" width="35" height="80" fill="#9c93fe" opacity="0.5" rx="2" />
    
    {/* Pages inside */}
    <line x1="50" y1="75" x2="70" y2="71" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
    <line x1="50" y1="85" x2="70" y2="81" stroke="#fff" strokeWidth="1.5" opacity="0.4" />
    <line x1="50" y1="95" x2="70" y2="91" stroke="#fff" strokeWidth="1.5" opacity="0.3" />
    <line x1="50" y1="105" x2="70" y2="101" stroke="#fff" strokeWidth="1.5" opacity="0.4" />
    <line x1="50" y1="115" x2="70" y2="111" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
    
    {/* Decorative stars */}
    <circle cx="55" cy="70" r="3" fill="#00685a" opacity="0.4" />
    <circle cx="58" cy="78" r="2.5" fill="#00685a" opacity="0.3" />
  </svg>
);

// Advanced: Brain/Mind Illustration
export const IllustrationMind = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="mind-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c49000" />
        <stop offset="100%" stopColor="#ffe082" />
      </linearGradient>
      <filter id="glow-filter">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
    
    {/* Brain outline */}
    <ellipse cx="100" cy="95" rx="45" ry="50" fill="url(#mind-grad)" opacity="0.2" />
    <path d="M 70 70 Q 60 80 65 95 Q 70 85 75 95 Q 80 85 85 95 Q 90 85 95 95 Q 100 85 105 95 Q 110 85 115 95 Q 120 85 125 95 Q 130 80 135 70" 
          fill="none" stroke="#c49000" strokeWidth="2.5" opacity="0.6" />
    
    {/* Neural connections */}
    <circle cx="85" cy="85" r="4" fill="#c49000" opacity="0.5" filter="url(#glow-filter)" />
    <circle cx="115" cy="85" r="4" fill="#c49000" opacity="0.5" filter="url(#glow-filter)" />
    <circle cx="100" cy="110" r="4" fill="#c49000" opacity="0.5" filter="url(#glow-filter)" />
    
    {/* Connection lines */}
    <line x1="85" y1="85" x2="100" y2="110" stroke="#c49000" strokeWidth="2" opacity="0.3" />
    <line x1="115" y1="85" x2="100" y2="110" stroke="#c49000" strokeWidth="2" opacity="0.3" />
    <line x1="85" y1="85" x2="115" y2="85" stroke="#c49000" strokeWidth="2" opacity="0.2" />
  </svg>
);

// Advanced: Trophy/Achievement
export const IllustrationTrophy = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="trophy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00685a" />
        <stop offset="100%" stopColor="#93f4e0" />
      </linearGradient>
    </defs>
    
    {/* Cup body */}
    <ellipse cx="100" cy="70" rx="25" ry="30" fill="url(#trophy-grad)" opacity="0.3" />
    <path d="M 75 70 Q 70 85 75 100 L 125 100 Q 130 85 125 70" 
          fill="none" stroke="#00685a" strokeWidth="2.5" opacity="0.7" />
    
    {/* Handles */}
    <path d="M 75 80 Q 55 85 60 105" fill="none" stroke="#00685a" strokeWidth="2.5" opacity="0.5" />
    <path d="M 125 80 Q 145 85 140 105" fill="none" stroke="#00685a" strokeWidth="2.5" opacity="0.5" />
    
    {/* Base */}
    <rect x="80" y="100" width="40" height="8" fill="#00685a" opacity="0.4" rx="1" />
    <rect x="85" y="108" width="30" height="3" fill="#00685a" opacity="0.3" rx="1" />
    
    {/* Star on cup */}
    <text x="100" y="85" fontSize="20" fill="#00685a" opacity="0.3" textAnchor="middle">★</text>
  </svg>
);

// Advanced: Network/Connection
export const IllustrationNetwork = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <radialGradient id="node-grad" cx="35%" cy="35%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#574db3" />
      </radialGradient>
      <filter id="network-shadow">
        <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.15" />
      </filter>
    </defs>
    
    {/* Connection lines */}
    <line x1="60" y1="60" x2="100" y2="100" stroke="#574db3" strokeWidth="1.5" opacity="0.2" />
    <line x1="140" y1="60" x2="100" y2="100" stroke="#574db3" strokeWidth="1.5" opacity="0.2" />
    <line x1="100" y1="140" x2="100" y2="100" stroke="#574db3" strokeWidth="1.5" opacity="0.2" />
    <line x1="60" y1="140" x2="100" y2="100" stroke="#574db3" strokeWidth="1.5" opacity="0.2" />
    <line x1="60" y1="60" x2="140" y2="60" stroke="#574db3" strokeWidth="1.5" opacity="0.15" />
    
    {/* Nodes */}
    <circle cx="100" cy="100" r="8" fill="url(#node-grad)" filter="url(#network-shadow)" />
    <circle cx="60" cy="60" r="5" fill="#9c93fe" opacity="0.6" />
    <circle cx="140" cy="60" r="5" fill="#9c93fe" opacity="0.6" />
    <circle cx="100" cy="140" r="5" fill="#9c93fe" opacity="0.6" />
    <circle cx="60" cy="140" r="5" fill="#9c93fe" opacity="0.6" />
    
    {/* Glow effect */}
    <circle cx="100" cy="100" r="12" fill="#574db3" opacity="0.1" />
  </svg>
);

// Advanced: Laptop/Workspace
export const IllustrationLaptop = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="laptop-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00685a" />
        <stop offset="100%" stopColor="#005a4e" />
      </linearGradient>
      <linearGradient id="screen-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93f4e0" />
        <stop offset="100%" stopColor="#00685a" />
      </linearGradient>
    </defs>
    
    {/* Screen */}
    <rect x="45" y="50" width="110" height="70" fill="url(#screen-grad)" rx="2" opacity="0.4" />
    
    {/* Screen border */}
    <rect x="45" y="50" width="110" height="70" fill="none" stroke="#00685a" strokeWidth="2.5" rx="2" opacity="0.6" />
    
    {/* Screen content lines */}
    <line x1="55" y1="65" x2="135" y2="65" stroke="#00685a" strokeWidth="1" opacity="0.3" />
    <line x1="55" y1="75" x2="125" y2="75" stroke="#00685a" strokeWidth="1" opacity="0.25" />
    <line x1="55" y1="85" x2="130" y2="85" stroke="#00685a" strokeWidth="1" opacity="0.2" />
    <line x1="55" y1="95" x2="120" y2="95" stroke="#00685a" strokeWidth="1" opacity="0.25" />
    <line x1="55" y1="105" x2="125" y2="105" stroke="#00685a" strokeWidth="1" opacity="0.3" />
    
    {/* Base */}
    <ellipse cx="100" cy="122" rx="60" ry="6" fill="#00685a" opacity="0.4" />
    <rect x="90" y="122" width="20" height="12" fill="#00685a" opacity="0.5" rx="2" />
  </svg>
);

// Advanced: Megaphone/Announcement
export const IllustrationMegaphone = () => (
  <svg viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="megaphone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#864a4b" />
        <stop offset="100%" stopColor="#f7aaaa" />
      </linearGradient>
    </defs>
    
    {/* Megaphone cone */}
    <path d="M 60 80 L 130 100 L 140 110 L 130 120 L 60 100 Z" fill="url(#megaphone-grad)" opacity="0.4" />
    <path d="M 60 80 L 130 100 L 140 110 L 130 120 L 60 100" fill="none" stroke="#864a4b" strokeWidth="2" opacity="0.6" />
    
    {/* Handle */}
    <rect x="50" y="85" width="12" height="25" fill="#864a4b" opacity="0.3" rx="2" />
    
    {/* Sound waves */}
    <path d="M 145 100 Q 155 95 165 100" fill="none" stroke="#f7aaaa" strokeWidth="2" opacity="0.4" />
    <path d="M 148 93 Q 158 88 168 93" fill="none" stroke="#f7aaaa" strokeWidth="1.5" opacity="0.3" />
    <path d="M 148 107 Q 158 112 168 107" fill="none" stroke="#f7aaaa" strokeWidth="1.5" opacity="0.3" />
  </svg>
);

// Animated Background: Floating Particles
export const FloatingParticles = () => (
  <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <defs>
      <style>{`
        @keyframes particle-float-1 { 0%, 100% { transform: translate(0, 0); opacity: 0.3; } 50% { transform: translate(30px, -30px); opacity: 0.6; } }
        @keyframes particle-float-2 { 0%, 100% { transform: translate(0, 0); opacity: 0.2; } 50% { transform: translate(-40px, 40px); opacity: 0.5; } }
        @keyframes particle-float-3 { 0%, 100% { transform: translate(0, 0); opacity: 0.25; } 50% { transform: translate(50px, 20px); opacity: 0.55; } }
        .particle-1 { animation: particle-float-1 8s ease-in-out infinite; }
        .particle-2 { animation: particle-float-2 10s ease-in-out infinite; }
        .particle-3 { animation: particle-float-3 12s ease-in-out infinite; }
      `}</style>
    </defs>
    
    <g className="particle-1">
      <circle cx="100" cy="100" r="20" fill="#574db3" opacity="0.3" />
      <circle cx="140" cy="80" r="12" fill="#9c93fe" opacity="0.2" />
      <circle cx="80" cy="150" r="15" fill="#00685a" opacity="0.2" />
    </g>
    
    <g className="particle-2">
      <circle cx="1100" cy="700" r="30" fill="#00685a" opacity="0.2" />
      <circle cx="1050" cy="650" r="18" fill="#93f4e0" opacity="0.15" />
    </g>
    
    <g className="particle-3">
      <circle cx="600" cy="200" r="25" fill="#864a4b" opacity="0.25" />
      <circle cx="550" cy="250" r="15" fill="#f7aaaa" opacity="0.15" />
      <circle cx="650" cy="150" r="12" fill="#c49000" opacity="0.2" />
    </g>
  </svg>
);

// Animated Gradient Background
export const AnimatedGradientBg = ({ color1 = '#574db3', color2 = '#9c93fe', color3 = '#b8b3ff' }) => (
  <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
    <defs>
      <style>{`
        @keyframes gradient-shift {
          0% { stop-color: ${color1}; }
          50% { stop-color: ${color2}; }
          100% { stop-color: ${color1}; }
        }
        .gradient-stop { animation: gradient-shift 8s ease-in-out infinite; }
      `}</style>
      <linearGradient id="animated-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" className="gradient-stop" />
        <stop offset="100%" stopColor={color3} stopOpacity="0.5" />
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill={`url(#animated-grad)`} />
  </svg>
);
