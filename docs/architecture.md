+─────────────────────────────────────────────────────────────────+
│                         MUSE S HEADBAND                         │
│  TP9(L) ─── AF7(L-Front) ─── AF8(R-Front) ─── TP10(R) ─── AUX   │
│         256Hz sampling, 4 EEG + 1 reference + 2 aux             │
+──────────────────────+──────────────────────────────────────────+
                       │ Web Bluetooth API / Muse SDK
                       ▼
+──────────────────────────────────────────────────────────────────+
│                    SIGNAL PROCESSING LAYER                       │
│  +──────────────+   +────────────────+   +────────────────────+  │
│  │  Raw Buffer  │ → │ Preprocessing  │ → │  FFT Transform     │  │
│  │  (256 Hz)    │   │ Notch/Bandpass │   │  (Welch's method)  │  │
│  +──────────────+   +────────────────+   +────────────────────+  │
│                            ▼                                     │
│  +────────────────────────────────────────────────────────+      │
│  │         FEATURE EXTRACTION ENGINE                      │      │
│  │  • Delta (0.5-4Hz)  • Theta (4-8Hz)                    │      │
│  │  • Alpha (8-12Hz)   • Beta (12-30Hz)                   │      │
│  │  • Gamma (30-50Hz)  • Alpha Asymmetry (AF7-AF8)        │      │
│  │  • Theta/Beta Ratio • Alpha/Theta Border (7-8Hz)       │      │
│  +────────────────────────────────────────────────────────+      │
+──────────────────────+───────────────────────────────────────────+
                       │
                       ▼
+─────────────────────────────────────────────────────────────────+
│                  COGNITIVE STATE CLASSIFIER                     │
│  +──────────────────+  +─────────────────+  +───────────────+   │
│  │   Flow Score     │  │  Cognitive Load │  │   Attention   │   │
│  │ (Theta↑+Alpha→)  │  │   (Beta/Alpha)  │  │  (Beta Power) │   │
│  │   TARGET: 0.7    │  │  TARGET: 0.4-0.6│  │  Frontal AF7/8│   │
│  +──────────────────+  +─────────────────+  +───────────────+   │
│                                                                 │
│  +───────────────────────────────────────────────────────────+  │
│  │        ADAPTIVE DIFFICULTY CONTROLLER (Q-Learning)        │  │
│  │  • Monitors success rate over 20-trial windows            │  │
│  │  • Adjusts threshold to maintain ~70% success (suboptimal │  │
│  │    per research, but optimal for engagement)              │  │
│  │  • Uses PID control for smooth transitions                │  │
│  +───────────────────────────────────────────────────────────+  │
+──────────────────────+──────────────────────────────────────────+
                       │
                       ▼
+───────────────────────────────────────────────────────────────+
│                   MULTI-SENSORY FEEDBACK LAYER                │
│                                                               │
│  +─────────────────────────────────────────────────────────+  │
│  │              VISUAL FEEDBACK (Three.js)                 │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  │  Particle Flow System (10,000 particles)          │  │  │
│  │  │  • Position: Controlled by alpha coherence        │  │  │
│  │  │  • Velocity: Theta power (faster = deeper)        │  │  │
│  │  │  • Color: Beta→Yellow, Alpha→Green, Theta→Blue    │  │  │
│  │  │  • Turbulence: Cognitive load (smooth = flow)     │  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  │  Central Mandala Geometry                         │  │  │
│  │  │  • Rotation speed: Alpha frequency (8-12 Hz)      │  │  │
│  │  │  • Complexity: Flow score (fractal depth)         │  │  │
│  │  │  • Symmetry: L/R hemisphere balance               │  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  │  Spectral Waterfall (2D heatmap)                  │  │  │
│  │  │  • Scrolling time-frequency visualization         │  │  │
│  │  │  • Color intensity: Power spectral density        │  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  +─────────────────────────────────────────────────────────+  │
│                                                               │
│  +─────────────────────────────────────────────────────────+  │
│  │          AUDITORY FEEDBACK (Web Audio API)              │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  │  Binaural Beat Generator                          │  │  │
│  │  │  • Base: 200 Hz carrier                           │  │  │
│  │  │  • Beat: Target frequency (10 Hz for alpha)       │  │  │
│  │  │  • L: 200 Hz, R: 210 Hz = 10 Hz perceived         │  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  │  Generative Ambient Layer                         │  │  │
│  │  │  • Tone.js for synthesis                          │  │  │
│  │  │  • Volume: Inversely proportional to beta         │  │  │
│  │  │  • Harmony: Consonance increases with flow        │  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  │  │  Nature Soundscape (optional)                     │  │  │
│  │  │  • Rain intensity: Relaxation level               │  │  │
│  │  │  • Thunder: Attention spikes                      │  │  │
│  │  +───────────────────────────────────────────────────+  │  │
│  +─────────────────────────────────────────────────────────+  │
+───────────────────────────────────────────────────────────────+
                       │
                       ▼
+───────────────────────────────────────────────────────────────+
│                      DATA PERSISTENCE LAYER                   │
│  • IndexedDB for local session storage (privacy-first)        │
│  • Optional encrypted cloud sync (Supabase)                   │
│  • Export: CSV, JSON, BDF+ (Brain Data Format)                │
+───────────────────────────────────────────────────────────────+
```

## Critical Design Decisions Based on Research

**1. Flow State Target Clarification**
The "0.4-0.6 optimal zone" you saw is likely a **normalized difficulty metric**, not success rate. Research validates **85% success rate** for optimal learning (Nature, 2019), but we'll target **~70% for engagement balance** - slightly suboptimal for pure learning but better for sustained motivation. The actual flow state detection uses **increased frontal theta (4-8Hz) + moderate alpha (8-12Hz)** signature validated by Katahira et al. (2018).

**2. Addressing the Placebo Elephant**
Recent RCTs show neurofeedback effects are largely non-specific (Arnold et al., 2021). However, the *process* of sustained attention, biofeedback, and progressive challenge creates genuine value. We're building an honest system that:
- Uses validated EEG signatures (not pseudoscience)
- Creates engaging feedback loops (the mechanism that matters)
- Tracks genuine physiological changes
- Doesn't promise magic, but provides structured practice

**3. Binaural Beats for Your Audio Stack**
Your Sennheiser HD800S + Topping stack is perfect for this. We'll generate **10 Hz alpha binaural beats** (200 Hz carrier L, 210 Hz R) through Web Audio API with precise phase control. The HD800S's exceptional imaging will create a strong lateralization effect, and the Topping's low THD+N ensures clean beat perception.

---

## Complete Implementation

### Project Structure
```
neuroflow/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with providers
│   │   ├── page.tsx                   # Landing page
│   │   ├── session/
│   │   │   └── page.tsx              # Main neurofeedback session
│   │   ├── analytics/
│   │   │   └── page.tsx              # Historical data dashboard
│   │   └── calibration/
│   │       └── page.tsx              # Initial baseline recording
│   ├── components/
│   │   ├── visualization/
│   │   │   ├── FlowParticleSystem.tsx   # Three.js particle viz
│   │   │   ├── MandalaGeometry.tsx      # Rotating mandala
│   │   │   ├── SpectralWaterfall.tsx    # 2D frequency heatmap
│   │   │   └── FlowMeter.tsx            # Progress ring UI
│   │   ├── controls/
│   │   │   ├── SessionControls.tsx      # Start/stop/pause
│   │   │   └── SettingsPanel.tsx        # Configuration
│   │   ├── onboarding/
│   │   │   └── TutorialOverlay.tsx      # First-time guidance
│   │   └── analytics/
│   │       ├── SessionChart.tsx         # Time-series charts
│   │       └── FlowMetrics.tsx          # Summary statistics
│   ├── lib/
│   │   ├── eeg/
│   │   │   ├── museConnector.ts         # Muse S BLE connection
│   │   │   ├── signalProcessor.ts       # FFT, filtering, artifacts
│   │   │   ├── featureExtractor.ts      # Band power calculation
│   │   │   └── flowClassifier.ts        # State detection algorithm
│   │   ├── audio/
│   │   │   ├── binauralBeatGenerator.ts # Web Audio API binaural
│   │   │   ├── ambientSynthesizer.ts    # Tone.js generative music
│   │   │   └── audioManager.ts          # Master audio controller
│   │   ├── feedback/
│   │   │   ├── adaptiveDifficulty.ts    # PID controller
│   │   │   └── rewardSystem.ts          # Gamification logic
│   │   ├── storage/
│   │   │   ├── sessionDB.ts             # IndexedDB wrapper
│   │   │   └── exportFormats.ts         # CSV/JSON export
│   │   └── utils/
│   │       ├── dsp.ts                   # Signal processing utilities
│   │       └── math.ts                  # Linear algebra helpers
│   ├── hooks/
│   │   ├── useMuseConnection.ts         # Muse device hook
│   │   ├── useEEGStream.ts              # Real-time data hook
│   │   ├── useFlowState.ts              # Flow detection hook
│   │   └── useAudioFeedback.ts          # Audio synthesis hook
│   ├── store/
│   │   └── sessionStore.ts              # Zustand state management
│   ├── types/
│   │   ├── eeg.ts                       # EEG data types
│   │   └── session.ts                   # Session types
│   └── config/
│       ├── flowParameters.ts            # Target thresholds
│       └── visualizationConfig.ts       # Particle/color settings
├── public/
│   ├── audio/
│   │   └── nature-sounds/               # Rain, forest ambience
│   └── models/
│       └── mandala-geometry.glb         # 3D mandala model
├── docs/
│   ├── SETUP.md                         # Hardware setup guide
│   ├── API.md                           # Developer documentation
│   └── SCIENCE.md                       # Neuroscience background
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
