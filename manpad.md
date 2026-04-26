\# MANPADS Control Panel — Technical Blueprint & Development Roadmap

\> \*\*Target Platform\*\*: macOS (Apple Silicon M1/M2/M3)    
\> \*\*Tech Stack\*\*: Rust (Tauri backend), Next.js 14 (React 18), TailwindCSS, TypeScript    
\> \*\*Design System\*\*: Supabase-inspired dark-mode native (per DESIGN.md)    
\> \*\*Developer Context\*\*: Solo developer, MIT-licensed open-source project    
\> \*\*Output Purpose\*\*: Feed directly into OpenCode AI for consistent, holistic implementation  

\---

\#\# Table of Contents

1\. \[Product Requirements Document (PRD)\](\#1-product-requirements-document-prd)  
2\. \[Technical Requirements Document (TRD)\](\#2-technical-requirements-document-trd)  
3\. \[Software Design Architecture (SDA)\](\#3-software-design-architecture-sda)  
4\. \[Minimum Viable Product (MVP) Definition\](\#4-minimum-viable-product-mvp-definition)  
5\. \[Phased Development Roadmap (Solo Developer)\](\#5-phased-development-roadmap-solo-developer)  
6\. \[OpenCode AI Implementation Prompts\](\#6-opencode-ai-implementation-prompts)

\---

\#\# 1\. Product Requirements Document (PRD)

\#\#\# 1.1 Product Vision  
A professional-grade, macOS-native desktop control panel that enables safe, intuitive, and real-time management of the MANPADS Rocket & Launcher prototype system. The application serves as the primary ground-station interface for telemetry monitoring, flight parameter configuration, launch sequencing, and post-flight analysis.

\#\#\# 1.2 Target User  
\- Solo aerospace hobbyists and makers  
\- Educational institutions (STEM labs)  
\- Small-scale R\&D teams prototyping guided rocket systems

\#\#\# 1.3 Core Objectives  
| ID | Objective | Success Metric |  
|----|-----------|----------------|  
| OBJ-01 | Provide real-time telemetry visualization from rocket & launcher | \<200ms latency from UDP packet to UI render |  
| OBJ-02 | Enable safe, sequenced launch control with hardware interlocks | Zero accidental launches; all commands require explicit confirmation |  
| OBJ-03 | Offer intuitive PID tuning interface for flight controller | Visual feedback on parameter changes within 100ms |  
| OBJ-04 | Support offline operation (no internet required) | Full functionality when disconnected from network |  
| OBJ-05 | Deliver production-ready UX matching Supabase design standards | User satisfaction ≥4.5/5 in usability testing |

\#\#\# 1.4 Functional Requirements

\#\#\#\# FR-01: Device Connectivity  
\- Auto-detect MANPADS launcher WiFi AP (\`ROCKET\_LAUNCHER\`)  
\- Manual IP/Port configuration fallback (\`192.168.4.1:4444\`)  
\- Connection status indicator with reconnection logic  
\- UDP socket management (send/receive ASCII protocol)

\#\#\#\# FR-02: Telemetry Dashboard  
\- Real-time display of:  
  \- Rocket: roll angle, rotation rate, servo output, flight state  
  \- Launcher: GPS coordinates, altitude, compass heading, barometric pressure  
\- Graphical gauges for critical values (roll, altitude, battery)  
\- Color-coded status indicators (green=normal, amber=warning, crimson=critical)  
\- Timestamped event log with filter/search

\#\#\#\# FR-03: Flight Control Interface  
\- PID parameter editor (\`Kp\`, \`Kd\`) with live update via UDP  
\- Servo calibration view (center angles, max deflection)  
\- Launch sequence wizard:  
  1\. System self-test  
  2\. Arm confirmation (2-step)  
  3\. Launch execution with countdown  
  4\. Post-launch telemetry capture  
\- Emergency stop button (always visible, red accent)

\#\#\#\# FR-04: Data Management  
\- Local SQLite database for flight logs (Tauri plugin)  
\- Export telemetry to CSV/JSON  
\- Import/export PID profiles  
\- Session metadata: date, location, weather notes

\#\#\#\# FR-05: System Settings  
\- UDP port configuration  
\- Theme toggle (dark-only per DESIGN.md; future-proof for light)  
\- Serial debug console (raw UDP packet viewer)  
\- Firmware update helper (future phase)

\#\#\# 1.5 Non-Functional Requirements  
| Category | Requirement |  
|----------|-------------|  
| \*\*Performance\*\* | UI renders at 60fps; UDP processing \<50ms; cold start \<3s on M1 |  
| \*\*Reliability\*\* | Graceful handling of packet loss; auto-reconnect on disconnect; no crashes on malformed input |  
| \*\*Security\*\* | No external network calls; all data stays on-device; input sanitization for UDP commands |  
| \*\*Usability\*\* | Follow Supabase design system; keyboard shortcuts for power users; accessible contrast ratios |  
| \*\*Maintainability\*\* | Modular Rust/Tauri architecture; typed TypeScript interfaces; comprehensive logging |  
| \*\*Portability\*\* | macOS-only (Apple Silicon); notarized DMG distribution; \<50MB installer |

\#\#\# 1.6 Out of Scope (v1.0)  
\- Multi-platform support (Windows/Linux)  
\- Cloud sync or remote access  
\- Advanced simulation/3D visualization  
\- Multi-rocket fleet management  
\- User authentication or multi-user support

\---

\#\# 2\. Technical Requirements Document (TRD)

\#\#\# 2.1 System Architecture Overview  
\`\`\`  
┌─────────────────────────────────────┐  
│           macOS App (Tauri)          │  
├─────────────────────────────────────┤  
│  Frontend: Next.js 14 (App Router)  │  
│  \- React 18 \+ TypeScript            │  
│  \- TailwindCSS \+ DESIGN.md tokens   │  
│  \- Zustand for state management     │  
├─────────────────────────────────────┤  
│  Backend: Rust (Tauri Commands)     │  
│  \- tokio-udp for UDP socket         │  
│  \- rusqlite for local storage       │  
│  \- serde for protocol serialization │  
├─────────────────────────────────────┤  
│  Native APIs:                       │  
│  \- Notification Center              │  
│  \- File System (sandboxed)          │  
│  \- Power management (prevent sleep) │  
└─────────────────────────────────────┘  
\`\`\`

\#\#\# 2.2 Technology Stack Specification

\#\#\#\# Frontend (Next.js 14\)  
\`\`\`toml  
\# package.json dependencies (core)  
next \= "14.2"  
react \= "18.3"  
react-dom \= "18.3"  
typescript \= "5.4"  
tailwindcss \= "3.4"  
@tailwindcss/forms \= "0.5"  
zustand \= "4.5"          \# lightweight state  
@radix-ui/react-\* \= "1.0" \# accessible primitives  
lucide-react \= "0.3"     \# icon set  
recharts \= "2.12"        \# telemetry charts  
\`\`\`

\#\#\#\# Backend (Rust/Tauri)  
\`\`\`toml  
\# Cargo.toml dependencies (core)  
tauri \= { version \= "2.0", features \= \["macos-private-api"\] }  
tokio \= { version \= "1.37", features \= \["net", "sync", "time"\] }  
rusqlite \= { version \= "0.31", features \= \["bundled"\] }  
serde \= { version \= "1.0", features \= \["derive"\] }  
serde\_json \= "1.0"  
thiserror \= "1.0"  
tracing \= "0.1"          \# structured logging  
tracing-subscriber \= { version \= "0.3", features \= \["env-filter"\] }  
\`\`\`

\#\#\#\# Build & Distribution  
\- Target: \`aarch64-apple-darwin\` only  
\- Code signing: Apple Developer ID (required for notarization)  
\- Distribution: Notarized \`.dmg\` via GitHub Releases  
\- Auto-update: Not in MVP; manual download for v1.0

\#\#\# 2.3 Data Flow & Protocol Handling

\#\#\#\# UDP Protocol Parser (Rust)  
\`\`\`rust  
// src/protocol/mod.rs  
\#\[derive(Debug, Clone, Serialize, Deserialize)\]  
pub enum TelemetryMessage {  
    Rocket {  
        timestamp\_ms: u64,  
        roll\_deg: f32,  
        rotation\_rate: f32,  
        servo\_output: i32,  
    },  
    RocketStatus {  
        state: FlightState, // enum: IDLE, ARMED, FLIGHT, LANDED  
        kp: f32,  
        kd: f32,  
        skew: f32,  
    },  
    Launcher {  
        latitude: f32,  
        longitude: f32,  
        altitude\_m: f32,  
        gps\_fix: GpsState, // enum: NO\_FIX, FIX\_2D, FIX\_3D  
    },  
}

\#\[derive(Debug, Clone, Serialize, Deserialize)\]  
pub enum ControlCommand {  
    UpdatePid { kp: f32, kd: f32 },  
    Launch,  
    Calibrate,  
}  
\`\`\`

\#\#\#\# State Management (Zustand)  
\`\`\`typescript  
// src/store/telemetry.ts  
interface TelemetryState {  
  // Raw parsed data  
  rocket: RocketTelemetry | null;  
  launcher: LauncherTelemetry | null;  
    
  // Derived UI state  
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';  
  flightPhase: 'idle' | 'armed' | 'launching' | 'in-flight' | 'landed';  
    
  // Actions  
  connect: (ip: string, port: number) \=\> Promise\<void\>;  
  sendCommand: (cmd: ControlCommand) \=\> Promise\<void\>;  
  updatePid: (kp: number, kd: number) \=\> Promise\<void\>;  
}  
\`\`\`

\#\#\# 2.4 Design System Implementation (per DESIGN.md)

\#\#\#\# Tailwind Configuration  
\`\`\`js  
// tailwind.config.js  
module.exports \= {  
  darkMode: 'class', // enforced dark mode  
  theme: {  
    extend: {  
      colors: {  
        // Supabase-inspired tokens  
        background: {  
          DEFAULT: '\#171717', // page canvas  
          deep: '\#0f0f0f',    // buttons, deepest surfaces  
        },  
        text: {  
          primary: '\#fafafa',  
          secondary: '\#b4b4b4',  
          muted: '\#898989',  
        },  
        border: {  
          subtle: '\#242424',  
          DEFAULT: '\#2e2e2e',  
          prominent: '\#363636',  
          accent: 'rgba(62, 207, 142, 0.3)', // green border  
        },  
        brand: {  
          green: '\#3ecf8e',   // logo, accents  
          link: '\#00c573',    // interactive links  
        },  
        // Radix HSL-based tokens (for advanced layering)  
        slate: {  
          5: 'hsl(210, 87.8%, 16.1%)',  
          A12: 'hsla(210, 87.8%, 16.1%, 0.92)',  
        },  
      },  
      fontFamily: {  
        sans: \['Circular', 'Helvetica Neue', 'sans-serif'\],  
        mono: \['Source Code Pro', 'Menlo', 'monospace'\],  
      },  
      borderRadius: {  
        pill: '9999px',  
        card: '16px',  
        standard: '6px',  
      },  
      lineHeight: {  
        hero: '1.00', // signature zero-leading  
        tight: '1.14',  
        normal: '1.50',  
      },  
      letterSpacing: {  
        code: '1.2px', // monospace labels  
        card: '-0.16px', // card titles  
      },  
    },  
  },  
  plugins: \[require('@tailwindcss/forms')\],  
}  
\`\`\`

\#\#\#\# Global CSS Variables (for HSL alpha layering)  
\`\`\`css  
/\* src/styles/globals.css \*/  
:root {  
  /\* Supabase HSL token system \*/  
  \--colors-slate5: hsl(210, 87.8%, 16.1%);  
  \--colors-slateA12: hsla(210, 87.8%, 16.1%, 0.92);  
  \--colors-purple4: hsl(251, 63.2%, 63.2%);  
  \--colors-crimsonA9: hsla(345, 85%, 55%, 0.9);  
    
  /\* Surface translucency \*/  
  \--surface-glass: rgba(41, 41, 41, 0.84);  
  \--border-accent: rgba(62, 207, 142, 0.3);  
}  
\`\`\`

\#\#\# 2.5 Performance & Reliability Guarantees  
\- UDP socket runs on dedicated Tokio task (non-blocking)  
\- Frontend uses \`useMemo\`/\`useCallback\` to prevent re-renders on telemetry updates  
\- SQLite writes batched to disk every 5s (configurable)  
\- All Tauri commands return \`Result\<T, AppError\>\` with tracing spans  
\- Memory target: \<150MB RSS during active flight monitoring

\#\#\# 2.6 Error Handling Strategy  
\`\`\`rust  
// src/error.rs  
\#\[derive(thiserror::Error, Debug)\]  
pub enum AppError {  
    \#\[error("UDP socket error: {0}")\]  
    UdpError(\#\[from\] std::io::Error),  
      
    \#\[error("Protocol parse error: {0}")\]  
    ParseError(String),  
      
    \#\[error("Database error: {0}")\]  
    DbError(\#\[from\] rusqlite::Error),  
      
    \#\[error("Device not found: {0}")\]  
    DeviceNotFound(String),  
}

// Frontend error boundary  
// src/components/ErrorBoundary.tsx  
export function ErrorBoundary({ children }: { children: ReactNode }) {  
  // Graceful fallback UI with retry button  
  // Logs error to Tauri backend for diagnostics  
}  
\`\`\`

\---

\#\# 3\. Software Design Architecture (SDA)

\#\#\# 3.1 Module Decomposition

\`\`\`  
src/  
├── main.rs                 \# Tauri app entry  
├── lib.rs                  \# Shared types, error definitions  
│  
├── backend/  
│   ├── udp/  
│   │   ├── socket.rs      \# UDP send/receive with tokio  
│   │   ├── parser.rs      \# ASCII protocol → TelemetryMessage  
│   │   └── mod.rs  
│   │  
│   ├── storage/  
│   │   ├── schema.sql     \# SQLite schema  
│   │   ├── repository.rs  \# CRUD operations  
│   │   └── mod.rs  
│   │  
│   ├── commands/          \# Tauri @command handlers  
│   │   ├── connectivity.rs  
│   │   ├── telemetry.rs  
│   │   ├── control.rs  
│   │   └── mod.rs  
│   │  
│   └── mod.rs  
│  
├── frontend/  
│   ├── app/               \# Next.js App Router  
│   │   ├── layout.tsx     \# Root layout with DESIGN.md tokens  
│   │   ├── page.tsx       \# Dashboard entry  
│   │   ├── telemetry/  
│   │   ├── control/  
│   │   ├── settings/  
│   │   └── globals.css  
│   │  
│   ├── components/  
│   │   ├── ui/            \# Reusable DESIGN.md components  
│   │   │   ├── Button.tsx  
│   │   │   ├── Card.tsx  
│   │   │   ├── Gauge.tsx  
│   │   │   └── ...  
│   │   │  
│   │   ├── telemetry/  
│   │   │   ├── RocketGauge.tsx  
│   │   │   ├── LauncherMap.tsx  
│   │   │   └── EventLog.tsx  
│   │   │  
│   │   └── control/  
│   │       ├── LaunchWizard.tsx  
│   │       ├── PidEditor.tsx  
│   │       └── EmergencyStop.tsx  
│   │  
│   ├── hooks/  
│   │   ├── useUdpConnection.ts  
│   │   ├── useTelemetryStream.ts  
│   │   └── useFlightState.ts  
│   │  
│   ├── store/  
│   │   ├── telemetry.ts   \# Zustand store  
│   │   ├── ui.ts  
│   │   └── index.ts  
│   │  
│   └── lib/  
│       ├── protocol.ts    \# TypeScript protocol types  
│       ├── utils.ts  
│       └── constants.ts  
│  
└── tauri.conf.json        \# Tauri config (macOS-only, Apple Silicon)  
\`\`\`

\#\#\# 3.2 Key Component Contracts

\#\#\#\# Tauri Command Interface (Rust → Frontend)  
\`\`\`rust  
// backend/commands/telemetry.rs  
\#\[tauri::command\]  
pub async fn start\_telemetry\_stream(  
    app\_handle: AppHandle,  
    ip: String,  
    port: u16,  
) \-\> Result\<(), AppError\> {  
    // Spawn UDP listener task  
    // Emit events via app\_handle.emit\_all("telemetry:update", data)  
}

\#\[tauri::command\]  
pub async fn send\_control\_command(  
    cmd: ControlCommand,  
) \-\> Result\<(), AppError\> {  
    // Serialize to ASCII, send via UDP socket  
}  
\`\`\`

\#\#\#\# Frontend Event Subscription (Next.js)  
\`\`\`typescript  
// hooks/useTelemetryStream.ts  
export function useTelemetryStream() {  
  useEffect(() \=\> {  
    const unlisten \= invoke('start\_telemetry\_stream', { ip, port });  
      
    const cleanup \= listen('telemetry:update', (event: Payload\<TelemetryMessage\>) \=\> {  
      useTelemetryStore.setState({ rocket: event.payload });  
    });  
      
    return () \=\> { unlisten.then(cleanup); };  
  }, \[ip, port\]);  
}  
\`\`\`

\#\#\# 3.3 State Flow Diagram  
\`\`\`  
\[UDP Packet\]   
     │  
     ▼  
\[Rust Parser\] → TelemetryMessage (serde)  
     │  
     ▼  
\[Tauri Event\] → emit("telemetry:update", payload)  
     │  
     ▼  
\[Frontend Listener\] → Zustand store update  
     │  
     ▼  
\[React Components\] → re-render with new data  
     │  
     ▼  
\[SQLite Writer\] ← batched telemetry logs (every 5s)  
\`\`\`

\#\#\# 3.4 Security & Sandboxing  
\- All file I/O scoped to \`\~/Library/Application Support/manpads-control/\`  
\- No external HTTP requests permitted (CSP enforced)  
\- UDP commands validated against whitelist before transmission  
\- Sensitive actions (launch, arm) require explicit user confirmation \+ optional PIN

\---

\#\# 4\. Minimum Viable Product (MVP) Definition

\#\#\# 4.1 MVP Scope (v1.0.0)  
✅ \*\*Must Have\*\*  
\- Connect to \`ROCKET\_LAUNCHER\` AP (auto/manual)  
\- Real-time telemetry display (rocket roll/rate, launcher GPS/altitude)  
\- Basic PID editor with live update  
\- Launch sequence wizard (self-test → arm → launch)  
\- Emergency stop button (always visible)  
\- Local flight log storage (SQLite) \+ CSV export  
\- Supabase-inspired UI per DESIGN.md (dark mode only)  
\- Apple Silicon native build, notarized DMG

❌ \*\*Explicitly Out of Scope\*\*  
\- Multi-device support  
\- Cloud features  
\- Advanced analytics or 3D visualization  
\- User accounts or permissions  
\- Auto-update mechanism

\#\#\# 4.2 MVP Success Criteria  
| Metric | Target |  
|--------|--------|  
| Cold start time (M1) | \< 3 seconds |  
| Telemetry latency (UDP→UI) | \< 200ms p95 |  
| Crash-free sessions | ≥ 99.5% |  
| User task completion (launch sequence) | ≥ 90% in usability test |  
| Bundle size | \< 50 MB |

\#\#\# 4.3 MVP Test Plan  
1\. \*\*Unit Tests\*\* (Rust): Protocol parser, SQLite repository  
2\. \*\*Integration Tests\*\* (Tauri): UDP echo, command round-trip  
3\. \*\*E2E Tests\*\* (Playwright): Launch wizard flow, telemetry rendering  
4\. \*\*Manual QA\*\*:   
   \- Connect to physical launcher hardware  
   \- Validate emergency stop cuts UDP commands  
   \- Verify offline functionality (no internet)

\---

\#\# 5\. Phased Development Roadmap (Solo Developer)

\> \*\*Guiding Principle\*\*: Ship vertical slices. Each phase delivers a usable, testable increment.

\#\#\# Phase 0: Foundation (Week 1\)  
\`\`\`markdown  
\- \[ \] Initialize Tauri \+ Next.js 14 monorepo (Apple Silicon target)  
\- \[ \] Configure Tailwind with DESIGN.md tokens (colors, fonts, radii)  
\- \[ \] Set up Rust project structure: \`backend/udp\`, \`backend/storage\`  
\- \[ \] Implement basic Tauri command ping/pong for dev validation  
\- \[ \] Create GitHub repo with MIT license, CONTRIBUTING.md, DESIGN.md reference  
\`\`\`  
\*\*Deliverable\*\*: \`manpads-control\` repo with working "Hello Tauri" app matching Supabase visual style.

\#\#\# Phase 1: Connectivity Core (Week 2\)  
\`\`\`markdown  
\- \[ \] Implement UDP socket in Rust (tokio-udp) with send/receive  
\- \[ \] Build ASCII protocol parser for TelemetryMessage enum  
\- \[ \] Create Tauri commands: \`connect\`, \`disconnect\`, \`send\_command\`  
\- \[ \] Frontend: Connection settings UI (IP/port input, status indicator)  
\- \[ \] Add tracing logging for UDP traffic (debug console)  
\`\`\`  
\*\*Deliverable\*\*: App can connect to launcher, receive raw telemetry, display in debug panel.

\#\#\# Phase 2: Telemetry Dashboard (Weeks 3-4)  
\`\`\`markdown  
\- \[ \] Design Zustand store for telemetry state (rocket/launcher/connection)  
\- \[ \] Build real-time gauge components (Circular font, green accents)  
\- \[ \] Implement EventLog component with filter/search  
\- \[ \] Add Recharts line graphs for roll/rate over time  
\- \[ \] Persist telemetry to SQLite (batched writes)  
\- \[ \] CSV export functionality  
\`\`\`  
\*\*Deliverable\*\*: Production-ready telemetry dashboard matching DESIGN.md, with local data persistence.

\#\#\# Phase 3: Flight Control Interface (Weeks 5-6)  
\`\`\`markdown  
\- \[ \] Build PID editor with live preview (Source Code Pro labels)  
\- \[ \] Implement LaunchWizard component (3-step: test → arm → launch)  
\- \[ \] Add EmergencyStop button (fixed position, crimson accent)  
\- \[ \] Integrate Tauri commands for control flow  
\- \[ \] Add confirmation modals for destructive actions  
\- \[ \] Implement keyboard shortcuts (Cmd+L \= launch, Esc \= abort)  
\`\`\`  
\*\*Deliverable\*\*: Safe, intuitive launch control flow with hardware interlock simulation.

\#\#\# Phase 4: Polish & Release (Week 7\)  
\`\`\`markdown  
\- \[ \] Audit UI against DESIGN.md: spacing, borders, typography, focus states  
\- \[ \] Add accessibility attributes (ARIA labels, focus management)  
\- \[ \] Implement error boundaries and graceful degradation  
\- \[ \] Write user documentation (in-app help \+ README)  
\- \[ \] Code signing & notarization pipeline (GitHub Actions)  
\- \[ \] Create v1.0.0 GitHub Release with notarized DMG  
\`\`\`  
\*\*Deliverable\*\*: Production-ready v1.0.0 release, MIT-licensed, ready for community use.

\#\#\# Phase 5: Post-MVP (Future)  
\`\`\`markdown  
\- \[ \] Firmware update helper (drag-and-drop .bin)  
\- \[ \] Advanced analytics: flight trajectory reconstruction  
\- \[ \] Multi-rocket support (fleet view)  
\- \[ \] Light mode toggle (extend DESIGN.md)  
\- \[ \] Plugin system for custom telemetry processors  
\`\`\`

\#\#\# Solo Developer Workflow Tips  
1\. \*\*Timebox phases\*\*: Max 1 week per phase; ship imperfect but working code.  
2\. \*\*Automate early\*\*: GitHub Actions for build/test/notarize from Day 1\.  
3\. \*\*Test on hardware weekly\*\*: Even if just UDP echo; avoid integration debt.  
4\. \*\*Document as you code\*\*: Inline Rust/TS comments → auto-generated API docs.  
5\. \*\*Leverage DESIGN.md\*\*: Copy/paste component prompts directly into OpenCode AI.

\---

\#\# 6\. OpenCode AI Implementation Prompts

\> Use these exact prompts with OpenCode AI to generate consistent, DESIGN.md-compliant code.

\#\#\# Prompt: Hero Section Setup  
\`\`\`  
Create a Next.js 14 app layout using the Supabase-inspired design system from DESIGN.md. Requirements:  
\- Background: \#171717  
\- Font: Circular (fallback: Helvetica Neue) for body, Source Code Pro for monospace labels  
\- Global CSS variables for HSL tokens (--colors-slateA12, etc.)  
\- Tailwind config with custom colors: background.deep (\#0f0f0f), text.primary (\#fafafa), brand.green (\#3ecf8e)  
\- Border radius scale: pill (9999px), card (16px), standard (6px)  
\- No shadows; depth via border colors (\#242424 → \#2e2e2e → \#363636)  
\- Hero text: 72px Circular weight 400, line-height 1.00, \#fafafa  
Output: tailwind.config.js, globals.css, app/layout.tsx  
\`\`\`

\#\#\# Prompt: Telemetry Gauge Component  
\`\`\`  
Build a React component for rocket roll angle display per DESIGN.md:  
\- Container: \#171717 bg, 1px solid \#2e2e2e border, 16px radius  
\- Title: 24px Circular weight 400, letter-spacing \-0.16px, \#fafafa  
\- Value: 48px Circular weight 400, \#fafafa, with unit label (Source Code Pro 12px uppercase, \#898989)  
\- Gauge arc: SVG with green accent (\#3ecf8e) for active range, \#363636 for inactive  
\- No shadows; use border hierarchy for depth  
\- Responsive: scales down on mobile (\<600px)  
Output: RocketGauge.tsx with TypeScript interfaces, Tailwind classes, and accessibility attributes  
\`\`\`

\#\#\# Prompt: UDP Command Handler (Rust)  
\`\`\`  
Implement a Tauri command in Rust to send PID update to MANPADS launcher:  
\- Input: kp: f32, kd: f32  
\- Serialize to ASCII: "PID,{kp},{kd}\\n" per WIRING.md protocol  
\- Send via tokio-udp socket to configured IP:port  
\- Return Result\<(), AppError\> with tracing span for observability  
\- Validate input ranges (kp: 0.0-10.0, kd: 0.0-5.0) before sending  
\- Use serde for error serialization to frontend  
Output: backend/commands/control.rs with full error handling and unit tests  
\`\`\`

\#\#\# Prompt: Launch Wizard Component  
\`\`\`  
Create a 3-step LaunchWizard React component per DESIGN.md:  
\- Step 1: System self-test (check UDP connection, sensor status)  
\- Step 2: Arm confirmation (2-click: "ARM" → "CONFIRM ARM")  
\- Step 3: Launch execution (countdown 3-2-1, then send "launch" command)  
\- UI: Pill buttons (\#0f0f0f bg, \#fafafa text, 9999px radius) for primary actions  
\- Emergency stop: fixed bottom-right, crimson accent, always visible  
\- Typography: Circular 14px weight 500 for buttons, Source Code Pro for technical labels  
\- State management: Zustand store for wizard step and flight phase  
Output: LaunchWizard.tsx with TypeScript, Tailwind classes, and keyboard shortcut support (Cmd+Enter \= next step)  
\`\`\`

\#\#\# Prompt: SQLite Repository (Rust)  
\`\`\`  
Implement a telemetry repository using rusqlite for MANPADS flight logs:  
\- Schema: flights(id, timestamp, metadata\_json), telemetry(flight\_id, timestamp\_ms, roll\_deg, rotation\_rate, servo\_output, gps\_lat, gps\_lon, altitude\_m)  
\- Methods: create\_flight(), append\_telemetry\_batch(), export\_flight\_csv(flight\_id)  
\- Batch writes: buffer telemetry in memory, flush to disk every 5 seconds  
\- Path: \~/Library/Application Support/manpads-control/ (Tauri path resolver)  
\- Error handling: thiserror enum with tracing spans  
Output: backend/storage/repository.rs with async-safe batching and unit tests  
\`\`\`

\---

\> \*\*Final Note for OpenCode AI\*\*: All generated code must adhere to the Supabase-inspired design system in DESIGN.md. Prioritize dark-mode-native aesthetics, border-defined depth (no shadows), and the signature 1.00 hero line-height. Use HSL-based color tokens with alpha channels for translucency. Enforce macOS Apple Silicon target in all build configurations.

\*Document Version: 1.0.0 • Last Updated: 2026 • License: MIT • Author: Principal Software Architect (AI-Assisted)\*  
