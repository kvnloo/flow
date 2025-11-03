# ML Models Directory

This directory contains machine learning models used in the application for various AI-powered features.

## Directory Structure

```
models/
├── README.md (this file)
├── nlp/
│   ├── sentiment-analysis/
│   ├── text-classification/
│   └── embeddings/
├── audio/
│   ├── speech-recognition/
│   └── audio-classification/
├── vision/
│   ├── image-classification/
│   └── object-detection/
└── metadata/
    └── model-registry.json
```

## Model Format Standards

### Supported Formats
- **TensorFlow.js**: JSON + bin files
- **ONNX**: .onnx files
- **PyTorch**: .pt files (requires conversion)
- **Custom**: WebAssembly modules

### Model Metadata

Each model should include a metadata file:

```json
{
  "name": "model-name",
  "version": "1.0.0",
  "format": "tensorflowjs",
  "framework": "tensorflow",
  "task": "text-classification",
  "inputShape": [1, 128],
  "outputShape": [1, 10],
  "labels": ["class1", "class2"],
  "license": "MIT",
  "attribution": "Model author/source",
  "size": "2.5MB",
  "accuracy": 0.95,
  "lastUpdated": "2025-01-15"
}
```

## Usage Examples

### Loading TensorFlow.js Model

```typescript
import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('/models/nlp/sentiment-analysis/model.json');
const prediction = model.predict(inputTensor);
```

### Loading ONNX Model

```typescript
import * as ort from 'onnxruntime-web';

const session = await ort.InferenceSession.create('/models/audio/speech-recognition/model.onnx');
const results = await session.run(feeds);
```

## Model Management

### Adding New Models

1. **Convert to web-compatible format** (TensorFlow.js or ONNX)
2. **Optimize for size** - Quantization, pruning if possible
3. **Create metadata file** with specifications
4. **Test inference** in browser environment
5. **Update model registry** in `metadata/model-registry.json`
6. **Document usage** in this README

### Model Registry

The `metadata/model-registry.json` file maintains an index of all available models:

```json
{
  "models": [
    {
      "id": "sentiment-v1",
      "path": "/models/nlp/sentiment-analysis",
      "status": "active",
      "lastValidated": "2025-01-15"
    }
  ]
}
```

## Performance Considerations

- **Lazy Loading**: Load models only when needed
- **Caching**: Use service workers to cache model files
- **Compression**: Serve gzip/brotli compressed files
- **CDN**: Consider hosting large models on CDN
- **WebAssembly**: Use WASM backends for better performance

## Size Guidelines

- **Small**: < 5MB (can load on demand)
- **Medium**: 5-20MB (preload during idle time)
- **Large**: > 20MB (explicit user consent, show loading progress)

## Browser Compatibility

Test models across browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (WebKit)

Ensure WebGL/WebGPU backend availability for TensorFlow.js.

## Security

- **Validate inputs** before model inference
- **Sanitize outputs** before displaying to users
- **Rate limit** inference requests if needed
- **Monitor** for adversarial inputs

## Placeholders

This directory currently contains placeholder structure. Actual model files need to be added based on application requirements.

## Resources

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Model Optimization Guide](https://www.tensorflow.org/model_optimization)
