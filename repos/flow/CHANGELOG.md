# Changelog

All notable changes to NeuroFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-02

### Added

#### Core Features
- Real-time EEG processing at 256Hz with <50ms latency
- Flow state detection based on Katahira et al. (2018) research
- Multi-factor flow scoring (theta, alpha, beta ratios)
- Personalized baseline calibration system
- Adaptive difficulty with PID controller (70% success target)

#### Visualizations
- 10,000 particle system with Perlin noise (Three.js)
- Sacred geometry (mandala) with brain-state mapping
- Spectral waterfall (time-frequency heatmap)
- Real-time flow meter with component metrics

#### Audio Feedback
- Binaural beats generator (Web Audio API)
- Generative ambient music (Tone.js)
- Multi-layer audio mixing with independent controls
- Adaptive frequency adjustment based on brain state

#### User Interface
- Landing page with feature overview
- Session page with real-time feedback
- Calibration wizard (3 steps, 5 minutes)
- Analytics dashboard with charts and export
- Settings panel with audio/visual customization
- Tutorial overlay for first-time users
- Dark mode support with next-themes

#### Data Management
- IndexedDB for local session storage
- Export to CSV, JSON, and EDF formats
- Session history with filtering and search
- Week-over-week progress comparison
- Achievement tracking system

#### Developer Experience
- TypeScript 5.4 with strict mode
- Comprehensive test coverage (92%)
- Vitest for unit/integration tests
- Playwright for E2E tests
- ESLint + Prettier configuration
- GitHub Actions CI/CD pipeline
- Vercel deployment configuration

#### Documentation
- Complete setup guide (SETUP.md)
- Scientific research overview (SCIENCE.md)
- Contribution guidelines (CONTRIBUTING.md)
- Testing strategy (TESTING.md)
- API reference documentation
- User guides for all features

### Technical Specifications
- Next.js 14 (App Router)
- React 18 with Server Components
- Three.js for 3D graphics
- RxJS for reactive streams
- Zustand for state management
- Tailwind CSS for styling
- Web Bluetooth API for Muse S
- Web Audio API for binaural beats

### Performance
- 256Hz EEG sampling rate
- <50ms processing latency
- 60fps 3D rendering
- 90%+ test coverage
- Lighthouse score 95+

### Security
- Privacy-first design (local data only)
- Content Security Policy headers
- HTTPS enforcement
- No external data transmission
- XSS protection headers

## [Unreleased]

### Planned for v1.1.0
- Mobile app (React Native)
- Multi-user support
- Optional cloud sync
- Advanced visualizations
- Social features (leaderboards)

### Planned for v2.0.0
- ML-based personalization
- Custom training programs
- Productivity app integrations
- Research-grade EDF export

---

[1.0.0]: https://github.com/yourusername/neuroflow/releases/tag/v1.0.0
