# Nature Sounds Audio Library

This directory contains audio files for nature sounds used in the meditation and focus features.

## File Structure

```
nature-sounds/
├── README.md (this file)
├── rain/
│   ├── gentle-rain.mp3
│   ├── heavy-rain.mp3
│   └── thunderstorm.mp3
├── ocean/
│   ├── ocean-waves.mp3
│   ├── beach-ambient.mp3
│   └── underwater.mp3
├── forest/
│   ├── birds-chirping.mp3
│   ├── wind-in-trees.mp3
│   └── forest-ambient.mp3
└── ambient/
    ├── white-noise.mp3
    ├── brown-noise.mp3
    └── pink-noise.mp3
```

## Audio Specifications

- **Format**: MP3, OGG, or WAV
- **Bitrate**: 128-192 kbps (MP3)
- **Sample Rate**: 44.1 kHz
- **Channels**: Stereo or Mono
- **Duration**: 1-5 minutes (loopable)

## Usage

Audio files in this directory are served as static assets and can be referenced in the application:

```typescript
const audioUrl = '/audio/nature-sounds/rain/gentle-rain.mp3';
const audio = new Audio(audioUrl);
audio.loop = true;
audio.play();
```

## Adding New Sounds

1. Ensure audio meets specifications above
2. Place in appropriate category subdirectory
3. Use descriptive, kebab-case filenames
4. Update this README if adding new categories
5. Test looping behavior for seamless playback

## License

All audio files should be properly licensed for use. Document attribution in `ATTRIBUTIONS.md` if required.

## Placeholders

This directory currently contains placeholder references. Actual audio files need to be added.
