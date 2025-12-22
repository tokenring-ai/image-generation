# @tokenring-ai/image-generation

Image generation with configurable output directories.

## Features

- Generate AI images using configured models
- Save to selectable output directories
- Support for multiple aspect ratios (square, tall, wide)
- Interactive directory selection when multiple directories configured

## Configuration

```javascript
export default {
  imageGeneration: {
    outputDirectories: ["./images", "./assets/generated"],
    defaultModel: "dall-e-3"
  }
};
```

## Usage

The package provides the `image/generate` tool:

```typescript
// Generate image with prompt
await agent.useTool("image/generate", {
  prompt: "A beautiful sunset over mountains",
  aspectRatio: "wide",
  outputDirectory: "./images" // optional, will prompt if not provided
});
```

## Tool Parameters

- `prompt` (required): Description of the image to generate
- `aspectRatio` (optional): "square" (1024x1024), "tall" (1024x1536), or "wide" (1536x1024)
- `outputDirectory` (optional): Target directory from configured list
- `model` (optional): Override default image generation model
