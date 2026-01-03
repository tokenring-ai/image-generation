# @tokenring-ai/image-generation

Image generation service with configurable output directories, EXIF metadata support, and local image search capabilities.

## Overview

This package provides AI-powered image generation capabilities for the Token Ring ecosystem. It integrates with the agent system to generate images based on prompts, save them with metadata, and search through generated images using keyword similarity.

## Key Features

- **AI Image Generation**: Generate images using configurable AI models (DALL-E 3, etc.)
- **EXIF Metadata**: Add keywords and descriptions to image metadata using exiftool-vendored
- **Local Image Search**: Search through generated images by keyword similarity
- **Automatic Indexing**: Maintain an index of generated images with metadata (dimensions, keywords, MIME type)
- **Directory Management**: Configurable output directories for image storage
- **Aspect Ratio Support**: Generate images in square (1024x1024), tall (1024x1536), or wide (1536x1024) formats
- **Model Flexibility**: Support for multiple AI image generation models through the model registry

## Installation

```bash
bun add @tokenring-ai/image-generation
```

## Plugin Configuration

Configure the image generation plugin in your application config:

```typescript
import {z} from "zod";

const config = {
  imageGeneration: {
    outputDirectory: "./images/generated",
    model: "dall-e-3"
  }
};
```

## Agent Configuration

The image generation service provides configuration options for agents:

```typescript
// ImageGenerationService configuration options
outputDirectory: string;  // Base directory for storing generated images
model: string;            // Default AI model for image generation
```

## Tools

The package provides the following tools:

### image_generate

Generate an AI image with configurable parameters and save it to the output directory with EXIF metadata.

**Tool Definition:**
```typescript
const image_generate = {
  description: "Generate an AI image and save it to a configured output directory",
  inputSchema: {
    prompt: z.string().describe("Description of the image to generate"),
    aspectRatio: z.enum(["square", "tall", "wide"]).default("square"),
    outputDirectory: z.string().describe("Output directory (will prompt if not provided)").optional(),
    model: z.string().describe("Image generation model to use").optional(),
    keywords: z.array(z.string()).describe("Keywords to add to image EXIF/IPTC metadata").optional(),
  }
};
```

**Usage Example:**
```typescript
// Generate a landscape image
const result = await agent.useTool("image_generate", {
  prompt: "A beautiful mountain landscape with a lake at sunset",
  aspectRatio: "wide",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result.path); // Path to the generated image
```

**Parameters:**
- `prompt` (required): Description of the image to generate
- `aspectRatio` (optional): "square" (1024x1024), "tall" (1024x1536), or "wide" (1536x1024). Default: "square"
- `outputDirectory` (optional): Override output directory
- `model` (optional): Override default image generation model
- `keywords` (optional): Keywords to add to image EXIF/IPTC metadata

### image_search

Search for generated images based on keyword similarity.

**Tool Definition:**
```typescript
const image_search = {
  description: "Search for images in the index based on keyword similarity",
  inputSchema: {
    query: z.string().describe("Search query to match against image keywords"),
    limit: z.number().int().positive().default(10).describe("Maximum number of results to return").optional(),
  }
};
```

**Usage Example:**
```typescript
// Search for sunset-related images
const searchResults = await agent.useTool("image_search", {
  query: "sunset landscape",
  limit: 3
});

for (const image of searchResults.results) {
  console.log(image.filename, image.score, image.keywords);
}
```

**Parameters:**
- `query` (required): Search query to match against image keywords
- `limit` (optional): Maximum number of results to return. Default: 10

**Response:**
```typescript
{
  success: boolean,
  results: Array<{
    filename: string,
    path: string,
    score: number,
    mimeType: string,
    width: number,
    height: number,
    keywords: string[]
  }>,
  message: string
}
```

## Chat Commands

### /image

Manage image generation and indexing.

**Usage:**
```bash
/image reindex
```

**Subcommands:**

#### reindex

Regenerate the image index by scanning all images and reading their metadata.

```bash
/image reindex
```

This command:
1. Scans the output directory for image files (jpg, jpeg, png, webp)
2. Reads EXIF metadata from each file
3. Rebuilds the index with metadata (filename, MIME type, dimensions, keywords)

**Example:**
```bash
/image reindex
```

Output:
```
Reindexing images in ./images/generated...
Reindexed 15 images
```

## Services

### ImageGenerationService

Main service managing image generation and indexing functionality.

**Service Name:** `ImageGenerationService`

**Description:** Image generation with configurable output directories

**Constructor:**
```typescript
constructor(config: {
  outputDirectory: string,
  model: string
})
```

**Methods:**

#### getOutputDirectory()

Get the configured output directory for generated images.

```typescript
getOutputDirectory(): string
```

#### getModel()

Get the configured image generation model.

```typescript
getModel(): string
```

#### addToIndex()

Add an image entry to the index.

```typescript
async addToIndex(
  directory: string,
  filename: string,
  mimeType: string,
  width: number,
  height: number,
  keywords: string[],
  agent: Agent
): Promise<void>
```

#### reindex()

Regenerate the image index from existing files in the output directory.

```typescript
async reindex(directory: string, agent: Agent): Promise<void>
```

## Usage Examples

### Basic Image Generation

```typescript
// Generate a landscape image
const result = await agent.useTool("image_generate", {
  prompt: "A beautiful mountain landscape with a lake at sunset",
  aspectRatio: "wide",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result.path); // ./images/generated/abc123.png
```

### Searching Generated Images

```typescript
// Search for sunset-related images
const searchResults = await agent.useTool("image_search", {
  query: "sunset landscape",
  limit: 3
});

for (const image of searchResults.results) {
  console.log(`${image.filename} (score: ${image.score})`);
  console.log(`  Keywords: ${image.keywords.join(", ")}`);
  console.log(`  Dimensions: ${image.width}x${image.height}`);
}
```

### Rebuilding the Image Index

```typescript
// Manually rebuild the image index
await agent.runCommand("/image reindex");
```

### Complete Workflow

```typescript
// Generate an image
const generateResult = await agent.useTool("image_generate", {
  prompt: "A cozy coffee shop interior",
  aspectRatio: "tall",
  keywords: ["coffee", "interior", "cozy", "cafe"]
});

// Search for it later
const searchResult = await agent.useTool("image_search", {
  query: "coffee cafe interior",
  limit: 5
});
```

## Package Structure

```
pkg/image-generation/
├── ImageGenerationService.ts    # Core service implementation
├── index.ts                     # Exports and configuration schema
├── plugin.ts                    # Plugin integration logic
├── tools.ts                     # Tool exports
├── chatCommands.ts              # Chat command definitions
├── commands/
│   └── image.ts                 # /image command implementation
├── tools/
│   ├── generateImage.ts         # image_generate tool
│   └── searchImages.ts          # image_search tool
├── package.json                 # Package metadata
├── vitest.config.ts             # Test configuration
└── README.md                    # Package documentation
```

## Testing

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
- **Search Errors**: Fallback for failed index parsing

**Common Errors:**

| Error | Description |
|-------|-------------|
| `Prompt is required` | Missing prompt parameter |
| `No index found at {path}` | Index file doesn't exist, run `/image reindex` |
| `Failed to read metadata for {file}` | EXIF read error (non-fatal) |

## Performance Considerations

- **Efficient Indexing**: Optimized metadata reading and index building
- **Similarity Search**: Simple keyword-based scoring with early termination
- **Memory Management**: Proper resource cleanup for file operations
- **Index Format**: Line-delimited JSON for efficient appending

## Service Integration

The image generation package integrates with the Token Ring ecosystem through:

1. **Service Registration**: `ImageGenerationService` provides core functionality
2. **Tool Registration**: `image_generate` and `image_search` tools are registered via ChatService
3. **Command Registration**: `/image` command is registered via AgentCommandService
4. **Model Registry**: Uses `ImageGenerationModelRegistry` for AI model access through ai-client

## License

MIT License - see [LICENSE](./LICENSE) file for details.
