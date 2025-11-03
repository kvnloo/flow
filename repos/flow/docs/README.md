# NeuroFlow Documentation

Comprehensive documentation for the NeuroFlow EEG neurofeedback training application.

## 📚 Documentation Index

### Getting Started
- **[SETUP.md](./SETUP.md)** - Installation, dependencies, and environment setup
- **[GETTING_STARTED.md](./guides/GETTING_STARTED.md)** - First-time user walkthrough
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

### User Guides
- **[SESSION_GUIDE.md](./guides/SESSION_GUIDE.md)** - How to conduct effective neurofeedback sessions
- **[CALIBRATION_GUIDE.md](./guides/CALIBRATION_GUIDE.md)** - Calibration best practices
- **[ANALYTICS_GUIDE.md](./guides/ANALYTICS_GUIDE.md)** - Understanding your progress data
- **[SETTINGS_GUIDE.md](./guides/SETTINGS_GUIDE.md)** - Customization options
- **[FAQ.md](./guides/FAQ.md)** - Frequently asked questions

### Technical Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[API.md](./API.md)** - Complete API reference
- **[SCIENCE.md](./SCIENCE.md)** - Neuroscience background and research
- **[TESTING.md](./TESTING.md)** - Testing strategy and coverage

### Development
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development workflow and guidelines
- **[API Reference](./api/)** - Detailed API documentation by module

## 🎯 Quick Links

### For Users
Start here if you're new to NeuroFlow:
1. Read [SETUP.md](./SETUP.md) for installation
2. Follow [GETTING_STARTED.md](./guides/GETTING_STARTED.md) for first session
3. Reference [SESSION_GUIDE.md](./guides/SESSION_GUIDE.md) for best practices

### For Developers
Start here if you're contributing to NeuroFlow:
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Follow [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup
3. Reference [API.md](./API.md) for implementation details

### For Researchers
Start here if you're interested in the science:
1. Read [SCIENCE.md](./SCIENCE.md) for research background
2. Check [API Reference](./api/) for data format specifications
3. See export formats in analytics for data extraction

## 🧠 What is NeuroFlow?

NeuroFlow is a browser-based neurofeedback training application that uses real-time EEG data from the Muse S headband to help users achieve and maintain flow states. The application provides:

- **Real-time EEG monitoring** via Web Bluetooth
- **Flow state detection** based on validated neuroscience research
- **Multi-modal feedback** through 3D visualizations and binaural audio
- **Progress tracking** with comprehensive analytics
- **Privacy-first design** with local data storage

## 🔬 Scientific Foundation

NeuroFlow's flow detection algorithm is based on peer-reviewed research:

**Primary Reference:**
- Katahira, K., Yamazaki, Y., Yamaoka, C., Ozaki, H., Nakagawa, S., & Nagata, N. (2018). "EEG Correlates of the Flow State: A Combination of Increased Frontal Theta and Moderate Frontocentral Alpha Rhythm in the Mental Arithmetic Task." *Frontiers in Psychology*, 9, 300.

Key findings implemented:
- Frontal theta (4-8 Hz) increase during flow
- Moderate alpha (8-12 Hz) for optimal arousal
- Theta/alpha ratio as flow indicator
- Frontal asymmetry for engagement balance

See [SCIENCE.md](./SCIENCE.md) for complete research overview.

## 🏗️ Technical Architecture

NeuroFlow is built with modern web technologies:

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **3D Graphics**: Three.js, React Three Fiber
- **Audio**: Web Audio API, Tone.js
- **State Management**: Zustand, RxJS
- **Storage**: IndexedDB (privacy-first, local-only)
- **Testing**: Vitest, Playwright, React Testing Library
- **Styling**: Tailwind CSS

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## 📊 Features

### EEG Processing
- 256 Hz real-time processing with <50ms latency
- IIR filtering (60Hz notch, 0.5-50Hz bandpass)
- FFT with Welch's method for spectral analysis
- Artifact detection (eye blinks, muscle noise)

### Flow Detection
- Personalized baseline calibration
- Multi-factor flow scoring (theta, alpha, beta ratios)
- Cognitive load optimization (70% success target)
- Real-time confidence metrics

### Visualization
- 10,000 particle system with Perlin noise
- Sacred geometry (mandala) with brain-state mapping
- Spectral waterfall (time-frequency heatmap)
- Real-time metrics dashboard

### Audio Feedback
- Binaural beats for brainwave entrainment
- Generative ambient music (Tone.js)
- Adaptive difficulty adjustment (PID controller)
- Multi-layer audio mixing

### Analytics
- Session history with filtering
- Week-over-week progress comparison
- Export to CSV/JSON/EDF formats
- Achievement tracking

## 🚀 Getting Started

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/neuroflow.git
cd neuroflow

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
open http://localhost:3000
```

### First Session (15 minutes)

1. **Connect Device** - Pair Muse S headband via Web Bluetooth
2. **Calibrate** - Complete 5-minute baseline recording
3. **Start Session** - 10-minute neurofeedback training
4. **Review** - Check analytics and progress

See [GETTING_STARTED.md](./guides/GETTING_STARTED.md) for detailed walkthrough.

## 🧪 Testing

NeuroFlow has comprehensive test coverage:

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Performance benchmarks
npm run test:perf
```

Target coverage: >90% statements, >85% branches

See [TESTING.md](./TESTING.md) for testing strategy.

## 🤝 Contributing

We welcome contributions! Please read:

1. [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
2. [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - Community standards
3. [API.md](./API.md) - Implementation reference

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Muse** - EEG hardware platform
- **Research** - Katahira et al. (2018) for flow state science
- **Community** - Open source contributors and testers

## 📧 Support

- **Documentation**: Check `/docs` folder
- **Issues**: GitHub issue tracker
- **Email**: support@neuroflow.app
- **Community**: Discord server (link)

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0
**Maintainer**: NeuroFlow Team
