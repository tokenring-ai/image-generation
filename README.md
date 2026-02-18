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
- **Keyword-Based Similarity Search**: Implements custom similarity algorithm matching keywords from image metadata

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

### Configuration Schema

The plugin uses the following configuration schema:

```typescript
import {ImageGenerationConfigSchema} from "@tokenring-ai/image-generation";

// Schema structure
ImageGenerationConfigSchema = z.object({
  outputDirectory: z.string(),
  model: z.string(),
});
```

No configuration is required by default. The plugin automatically:
1. Registers tools for image generation and search
2. Adds chat commands for image management
3. Initializes the service with provided configuration

## Agent Configuration

The image generation service integrates with the agent system and provides the following configuration options:

```typescript
// Service configuration options
outputDirectory: string;  // Base directory for storing generated images
model: string;            // Default AI model for image generation
```

## Tools

The package provides the following tools:

### image_generate

Generate an AI image with configurable parameters and save it to the output directory with EXIF metadata.

**Tool Definition:**
```typescript
import {TokenRingToolDefinition} from "@tokenring-ai/chat/schema";
import {z} from "zod";

const image_generate: TokenRingToolDefinition = {
  name: "image_generate",
  displayName: "ImageGeneration/generateImage",
  description: "Generate an AI image and save it to a configured output directory",
  inputSchema: z.object({
    prompt: z.string().describe("Description of the image to generate"),
    aspectRatio: z.enum(["square", "tall", "wide"]).default("square").optional(),
    outputDirectory: z.string().describe("Output directory (will prompt if not provided)").optional(),
    model: z.string().describe("Image generation model to use").optional(),
    keywords: z.array(z.string()).describe("Keywords to add to image EXIF/IPTC metadata").optional(),
  }),
  execute: async (input, agent) => {
    // Implementation
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

Search for generated images based on keyword similarity using a custom similarity algorithm that matches query terms against image keywords from the index.

**Tool Definition:**
```typescript
import {TokenRingToolDefinition} from "@tokenring-ai/chat/schema";
import {z} from "zod";

const image_search: TokenRingToolDefinition = {
  name: "image_search",
  displayName: "ImageGeneration/searchImages",
  description: "Search for images in the index based on keyword similarity",
  inputSchema: z.object({
    query: z.string().describe("Search query to match against image keywords"),
    limit: z.number().int().positive().default(10).describe("Maximum number of results to return").optional(),
  }),
  execute: async (input, agent) => {
    // Implementation
  }
};
```

**Similarity Algorithm:**
- Exact matches receive a score of 1.0
- Partial matches (one contains the other) receive a score of 0.8
- Word-based matching for partial matches with proportional scoring
- Results sorted by similarity score in descending order

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
  type: "json",
  data: {
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
2. Reads EXIF metadata from each file using exiftool-vendored
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

**Returns:** The configured output directory path

#### getModel()

Get the configured image generation model.

```typescript
getModel(): string
```

**Returns:** The configured image generation model name

#### addToIndex()

Add an image entry to the index with EXIF metadata.

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

**Parameters:**
- `directory`: Output directory path
- `filename`: Image filename
- `mimeType`: Image MIME type
- `width`: Image width in pixels
- `height`: Image height in pixels
- `keywords`: Array of keywords to add to metadata
- `agent`: Agent instance for file operations

#### reindex()

Regenerate the image index from existing files in the output directory by scanning all images and reading their metadata.

```typescript
async reindex(directory: string, agent: Agent): Promise<void>
```

**Parameters:**
- `directory`: Output directory path
- `agent`: Agent instance for file operations

**Behavior:**
- Scans directory for image files (jpg, jpeg, png, webp)
- Reads EXIF metadata from each file
- Updates image_index.json with metadata entries
- Logs progress and errors

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
├── index.ts                     # Package exports (ImageGenerationConfigSchema, ImageGenerationService)
├── plugin.ts                    # Plugin integration logic and configuration schema
├── ImageGenerationService.ts    # Core service implementation
├── tools.ts                     # Tool exports
├── chatCommands.ts              # Chat command definitions
├── commands/
│   └── image.ts                 # /image command implementation
├── tools/
│   ├── generateImage.ts         # image_generate tool implementation
│   └── searchImages.ts          # image_search tool implementation
├── package.json                 # Package metadata
└── vitest.config.ts             # Test configuration
```

## Configuration Schema

### ImageGenerationConfigSchema

```typescript
import {ImageGenerationConfigSchema} from "@tokenring-ai/image-generation";

// Schema structure
ImageGenerationConfigSchema = z.object({
  outputDirectory: z.string(),
  model: z.string(),
});
```

### Plugin Configuration Schema

```typescript
const packageConfigSchema = z.object({
  imageGeneration: ImageGenerationConfigSchema.optional(),
});
```

## Integration

### Service Registration

The package registers the following services:

1. **ImageGenerationService**: Core image generation and indexing functionality
2. **ChatService**: Registers tools for image generation and search
3. **AgentCommandService**: Registers /image command

### Tool Registration

The following tools are automatically registered:

- `image_generate`: Generate AI images
- `image_search`: Search generated images by keyword similarity

### State Management

The package does not require any state slices. All state is managed through file system operations.

## Error Handling

The package includes comprehensive error handling:

- **Prompt Validation**: Ensures prompt is provided for image generation
- **File Operations**: Proper error handling for file read/write operations
- **Metadata Handling**: Graceful handling of EXIF metadata errors with warnings
- **Index Management**: Error handling for index file operations
- **Model Availability**: Proper error handling when AI models are unavailable
- **Search Errors**: Fallback for failed index parsing with warnings

**Common Errors:**

| Error | Description | Solution |
|-------|-------------|----------|
| `Prompt is required` | Missing prompt parameter | Provide a prompt string |
| `No index found at {path}` | Index file doesn't exist | Run `/image reindex` first |
| `Failed to read metadata for {file}` | EXIF read error | Non-fatal, continues processing other files |
| `Failed to write EXIF data` | EXIF write error | Non-fatal, image still saved |

## Performance Considerations

- **Efficient Indexing**: Optimized metadata reading and index building
- **Similarity Search**: Simple keyword-based scoring with early termination
- **Memory Management**: Proper resource cleanup for file operations
- **Index Format**: Line-delimited JSON for efficient appending
- **Batch Processing**: Index rebuilding processes files in batches
- **Metadata Caching**: EXIF metadata read once per file during indexing

## Service Integration

The image generation package integrates with the Token Ring ecosystem through:

1. **Service Registration**: `ImageGenerationService` provides core functionality
2. **Tool Registration**: `image_generate` and `image_search` tools are registered via ChatService
3. **Command Registration**: `/image` command is registered via AgentCommandService
4. **Model Registry**: Uses `ImageGenerationModelRegistry` from ai-client for AI model access
5. **File System**: Uses FileSystemService for image storage and indexing

## Dependencies

### Production Dependencies

- `@tokenring-ai/agent` (^0.2.0) - Agent orchestration system
- `@tokenring-ai/app` (^0.2.0) - Application framework
- `@tokenring-ai/chat` (^0.2.0) - Chat service integration
- `@tokenring-ai/filesystem` (^0.2.0) - File system operations
- `@tokenring-ai/ai-client` (^0.2.0) - AI client and model registry
- `exiftool-vendored` (^35.9.0) - EXIF metadata processing
- `uuid` (^13.0.0) - Unique ID generation
- `zod` (^4.3.6) - Schema validation

### Development Dependencies

- `vitest` (^4.0.18) - Testing framework
- `typescript` (^5.9.3) - TypeScript compiler

## Testing

Run tests with Vitest:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
