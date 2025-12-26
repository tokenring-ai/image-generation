# @tokenring-ai/image-generation

Image generation service with configurable output directories, EXIF metadata support, and local image search capabilities.

## Key Features

- **AI Image Generation**: Generate images using configurable AI models
- **EXIF Metadata**: Add keywords and descriptions to image metadata
- **Local Image Search**: Search through generated images by keyword similarity
- **Automatic Indexing**: Maintain an index of generated images with metadata
- **Directory Management**: Configurable output directories for image storage
- **Aspect Ratio Support**: Generate images in square, tall, or wide formats
- **Model Flexibility**: Support for multiple AI image generation models

## Configuration

```typescript
export default {
  imageGeneration: {
    outputDirectory: "./images/generated",
    model: "dall-e-3"
  }
}
```

## Core Components

### ImageGenerationService

Main service managing image generation and indexing functionality.

**Available Methods:**
- `getOutputDirectory()`: Get the configured output directory
- `getModel()`: Get the configured image generation model
- `addToIndex()`: Add image metadata to the index
- `reindex()`: Regenerate the image index from existing files

### Available Tools

#### generateImage
Generate an AI image with configurable parameters.

**Tool Usage:**
```typescript
await agent.useTool("generateImage", {
  prompt: "A beautiful sunset over mountains",
  aspectRatio: "wide",
  keywords: ["landscape", "nature", "sunset"],
  model: "dall-e-3" // optional, uses configured default if not specified
});
```

**Parameters:**
- `prompt` (required): Description of the image to generate
- `aspectRatio` (optional): "square" (1024x1024), "tall" (1024x1536), or "wide" (1536x1024)
- `keywords` (optional): Keywords to add to image EXIF/IPTC metadata
- `model` (optional): Override default image generation model

#### searchImages
Search for generated images based on keyword similarity.

**Tool Usage:**
```typescript
const results = await agent.useTool("searchImages", {
  query: "landscape sunset",
  limit: 5
});
```

**Parameters:**
- `query` (required): Search query to match against image keywords
- `limit` (optional): Maximum number of results to return (default: 10)

### Chat Commands

#### /image reindex
Regenerate the image index by scanning all images and reading their metadata.

```bash
/image reindex
```

This command scans the output directory for image files and rebuilds the index with their metadata (dimensions, keywords, descriptions).

## Usage Examples

### Basic Image Generation

```typescript
// Generate a landscape image
const result = await agent.useTool("generateImage", {
  prompt: "A beautiful mountain landscape with a lake at sunset",
  aspectRatio: "wide",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result.path); // Path to the generated image
```

### Searching Generated Images

```typescript
// Search for sunset-related images
const searchResults = await agent.useTool("searchImages", {
  query: "sunset landscape",
  limit: 3
});

for (const image of searchResults.results) {
  console.log(image.filename, image.score, image.keywords);
}
```

### Rebuilding the Image Index

```typescript
// Manually rebuild the image index
await agent.runCommand("/image reindex");
```

## Service Integration

The image generation package integrates with the Token Ring ecosystem through:

1. **Service Registration**: `ImageGenerationService` provides core functionality
2. **Tool Registration**: `generateImage` and `searchImages` tools are automatically registered
3. **Command Registration**: `/image` command for index management
4. **Model Registry**: Uses `ImageGenerationModelRegistry` for AI model access

## Dependencies

- `@tokenring-ai/agent@0.2.0`: Core agent framework
- `@tokenring-ai/ai-client@0.2.0`: AI client with model registry
- `@tokenring-ai/app@0.2.0`: Application framework
- `@tokenring-ai/chat@0.2.0`: Chat service integration
- `@tokenring-ai/filesystem@0.2.0`: File system operations
- `exiftool-vendored@^28.8.0`: EXIF metadata handling
- `uuid@^13.0.0`: Unique filename generation
- `zod@catalog:`: Schema validation

## Development

### Package Structure

```
pkg/image-generation/
├── index.ts                     # Exports and configuration schema
├── ImageGenerationService.ts    # Core service implementation
├── plugin.ts                   # Plugin integration logic
├── tools.ts                    # Tool exports
├── chatCommands.ts             # Chat command definitions
├── commands/                   # Chat command implementations
├── tools/                      # Tool implementations
└── README.md                   # Package documentation
```

### Configuration Schema

```typescript
import {z} from "zod";

export const ImageGenerationConfigSchema = z.object({
  outputDirectory: z.string(),
  model: z.string(),
});
```

### Testing

Run tests with Vitest:

```bash
bun run test
bun run test:watch
bun run test:coverage
```

## Error Handling

The package includes comprehensive error handling:

- **Prompt Validation**: Ensures prompt is provided for image generation
- **File Operations**: Proper error handling for file read/write operations
- **Metadata Handling**: Graceful handling of EXIF metadata errors
- **Index Management**: Error handling for index file operations
- **Model Availability**: Proper error handling when AI models are unavailable

## Performance Considerations

- **Efficient Indexing**: Optimized metadata reading and index building
- **Memory Management**: Proper resource cleanup for file operations
- **Parallel Processing**: Potential for parallel image processing in future versions
- **Caching**: Local cache of generated images and metadata

## License

MIT License - Copyright (c) 2025 Token Ring AI Team