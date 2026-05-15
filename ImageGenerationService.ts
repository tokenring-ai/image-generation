import deepClone from "@tokenring-ai/utility/object/deepClone";
import { Buffer } from "node:buffer";
import type Agent from "@tokenring-ai/agent/Agent";
import type { AgentCreationContext } from "@tokenring-ai/agent/types";
import { ImageGenerationModelRegistry } from "@tokenring-ai/ai-client/ModelRegistry";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { generateHumanId } from "@tokenring-ai/utility/string/generateHumanId";
import { exiftool } from "exiftool-vendored";
import { ImageGenerationAgentConfigSchema, type ParsedImageGenerationConfig } from "./schema.ts";
import { ImageGenerationState } from "./state/ImageGenerationState.ts";

export type GenerateImageOptions = {
  prompt: string;
  aspectRatio: "square" | "tall" | "wide";
  keywords?: string[] | undefined;
};

export type AdjustImageFormat = "jpeg" | "png" | "webp";

export type AdjustImageOptions = {
  source: string;
  format?: AdjustImageFormat | undefined;
  scale?: number | undefined;
  brightness?: number | undefined;
  quality?: number | undefined;
};

const FORMAT_INFO: Record<AdjustImageFormat, { mediaType: string; extension: string }> = {
  jpeg: { mediaType: "image/jpeg", extension: "jpg" },
  png: { mediaType: "image/png", extension: "png" },
  webp: { mediaType: "image/webp", extension: "webp" },
};

export default class ImageGenerationService implements TokenRingService {
  readonly name = "ImageGenerationService";
  description = "Image generation with configurable output directories";

  defaultModel: string | null = null;

  constructor(
    private app: TokenRingApp,
    private options: ParsedImageGenerationConfig,
  ) {}

  start() {
    const imageModelRegistry = this.app.requireService(ImageGenerationModelRegistry);

    for (const modelName of this.options.defaultModels) {
      const foundModels = Object.keys(imageModelRegistry.getModelSpecsByRequirements(modelName));
      if (foundModels.length > 0) {
        this.defaultModel = foundModels[0];
        break;
      }
    }

    if (this.defaultModel) {
      this.app.serviceOutput(this, `Selected ${this.defaultModel} as default image generation model`);
    } else {
      this.app.serviceError(this, `No default image generation model was configured`);
    }
  }

  attach(agent: Agent, creationContext: AgentCreationContext): void {
    const agentConfig = deepClone(this.options.agentDefaults, agent.getAgentConfigSlice("imageGeneration", ImageGenerationAgentConfigSchema));
    const initialState = agent.initializeState(ImageGenerationState, agentConfig);

    const selectedModel = initialState.model ?? this.defaultModel;
    creationContext.items.push(`Image Generation Model: ${selectedModel ?? "No model selected"}`);
  }

  getDefaultOutputDirectory(): string {
    return this.options.agentDefaults.outputDirectory;
  }

  getOutputDirectory(agent: Agent): string {
    return agent.getState(ImageGenerationState).outputDirectory;
  }

  getDefaultModel(): string | null {
    return this.defaultModel;
  }

  getModel(agent: Agent): string | null {
    return agent.getState(ImageGenerationState).model ?? this.defaultModel;
  }

  setModel(model: string, agent: Agent): void {
    agent.mutateState(ImageGenerationState, state => {
      state.model = model;
    });
  }

  requireModel(agent: Agent): string {
    const model = this.getModel(agent);
    if (!model) throw new Error("No image generation model is currently selected");
    return model;
  }

  async addToIndex(directory: string, filename: string, mimeType: string, width: number, height: number, keywords: string[], agent: Agent): Promise<void> {
    const fileSystem = agent.requireServiceByType(FileSystemService);
    const indexPath = `${directory}/image_index.json`;
    const entry = JSON.stringify({ filename, mimeType, width, height, keywords }) + "\n";
    await fileSystem.appendFile(indexPath, entry, agent);
  }

  async reindex(agent: Agent): Promise<void> {
    const directory = this.getOutputDirectory(agent);

    const fileSystem = agent.requireServiceByType(FileSystemService);
    const indexPath = `${directory}/image_index.json`;

    agent.infoMessage(`Reindexing images in ${directory}...`);

    const files = await fileSystem.glob(`${directory}/*.{jpg,jpeg,png,webp}`, {}, agent);
    const entries: string[] = [];

    for (const file of files) {
      try {
        const metadata = await exiftool.read(file);
        const filename = file.split("/").pop();
        const entry = JSON.stringify({
          filename,
          mimeType: metadata.MIMEType || "image/jpeg",
          width: metadata.ImageWidth || 0,
          height: metadata.ImageHeight || 0,
          keywords: metadata.Keywords || [],
        });
        entries.push(entry);
      } catch (error: unknown) {
        agent.warningMessage(`Failed to read metadata for ${file}`, error as Error);
      }
    }

    await fileSystem.writeFile(indexPath, entries.join("\n") + "\n", agent);
    agent.infoMessage(`Reindexed ${entries.length} images.`);
  }

  async generateImage(
    { prompt, aspectRatio = "square", keywords }: GenerateImageOptions,
    agent: Agent,
  ): Promise<{
    mediaType: string;
    fileName: string;
    filePath: string;
    buffer: Buffer;
  }> {
    const fileSystem = agent.requireServiceByType(FileSystemService);
    const imageModelRegistry = agent.requireServiceByType(ImageGenerationModelRegistry);

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const model = this.requireModel(agent);

    const targetDir = this.getOutputDirectory(agent);

    agent.infoMessage(`[${this.name}] Generating image: "${prompt}"`);

    const imageClient = imageModelRegistry.getClient(model);

    let size: `${number}x${number}`;
    let width: number, height: number;
    switch (aspectRatio) {
      case "square":
        size = "1024x1024";
        width = 1024;
        height = 1024;
        break;
      case "tall":
        size = "1024x1536";
        width = 1024;
        height = 1536;
        break;
      case "wide":
        size = "1536x1024";
        width = 1536;
        height = 1024;
        break;
      default:
        size = "1024x1024";
        width = 1024;
        height = 1024;
    }

    const [imageResult] = await imageClient.generateImage({ prompt, size, n: 1 }, agent);

    const extension = imageResult.mediaType.split("/")[1];
    const fileName = `${generateHumanId()}.${extension}`;
    const imageBuffer = Buffer.from(imageResult.uint8Array);
    const filePath = `${targetDir}/${fileName}`;

    await fileSystem.writeFile(filePath, imageBuffer, agent);

    const exifData: any = {};
    if (keywords && keywords.length > 0) {
      exifData.Keywords = keywords;
    }
    exifData.ImageDescription = prompt;

    try {
      await exiftool.write(filePath, exifData);
      agent.infoMessage(`[${this.name}] Added metadata to EXIF data`);
    } catch (error: unknown) {
      agent.warningMessage(`[${this.name}] Failed to write EXIF data:`, error as Error);
    }

    await this.addToIndex(targetDir, fileName, imageResult.mediaType, width, height, keywords || [], agent);

    agent.infoMessage(`[${this.name}] Image saved: ${filePath}`);

    return {
      mediaType: imageResult.mediaType,
      buffer: imageBuffer,
      fileName,
      filePath,
    };
  }

  async adjustImage(
    { source, format, scale, brightness, quality }: AdjustImageOptions,
    agent: Agent,
  ): Promise<{
    mediaType: string;
    fileName: string;
    filePath: string;
    width: number;
    height: number;
    buffer: Buffer;
  }> {
    const fileSystem = agent.requireServiceByType(FileSystemService);

    if (!source) {
      throw new Error("Source path is required");
    }

    const targetDir = this.getOutputDirectory(agent);
    const sourcePath = source.includes("/") ? source : `${targetDir}/${source}`;

    agent.infoMessage(`[${this.name}] Adjusting image: ${sourcePath}`);

    const sourceBuffer = await fileSystem.readFile(sourcePath, agent);
    if (!sourceBuffer) {
      throw new Error(`Failed to read source image: ${sourcePath}`);
    }

    const sourceBytes = new Uint8Array(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength);
    const sourceMetadata = await new Bun.Image(sourceBytes).metadata();

    let pipeline = new Bun.Image(sourceBytes);
    let width = sourceMetadata.width;
    let height = sourceMetadata.height;

    if (scale !== undefined && scale !== 1) {
      if (scale <= 0) throw new Error("Scale must be greater than 0");
      width = Math.max(1, Math.round(sourceMetadata.width * scale));
      height = Math.max(1, Math.round(sourceMetadata.height * scale));
      pipeline = pipeline.resize(width, height);
    }

    if (brightness !== undefined && brightness !== 1) {
      pipeline = pipeline.modulate({ brightness });
    }

    const outputFormat: AdjustImageFormat = format ?? (sourceMetadata.format as AdjustImageFormat) ?? "jpeg";
    const formatInfo = FORMAT_INFO[outputFormat];
    if (!formatInfo) {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    let encoded;
    switch (outputFormat) {
      case "jpeg":
        encoded = quality !== undefined ? pipeline.jpeg({ quality }) : pipeline.jpeg();
        break;
      case "webp":
        encoded = quality !== undefined ? pipeline.webp({ quality }) : pipeline.webp();
        break;
      case "png":
        encoded = pipeline.png();
        break;
      default:
        // noinspection UnnecessaryLocalVariableJS
        const unsupportedFormat: never = outputFormat;
        throw new Error(`Unsupported output format: ${unsupportedFormat as string}`);
    }

    const bytes = await encoded.bytes();
    const outputBuffer = Buffer.from(bytes);

    const fileName = `${generateHumanId()}.${formatInfo.extension}`;
    const filePath = `${targetDir}/${fileName}`;

    await fileSystem.writeFile(filePath, outputBuffer, agent);

    let keywords: string[] = [];
    try {
      const sourceExif = await exiftool.read(sourcePath);
      if (Array.isArray(sourceExif.Keywords)) {
        keywords = sourceExif.Keywords;
      }
      const exifData: any = {};
      if (keywords.length > 0) exifData.Keywords = keywords;
      if (sourceExif.ImageDescription) exifData.ImageDescription = sourceExif.ImageDescription;
      if (Object.keys(exifData).length > 0) {
        await exiftool.write(filePath, exifData);
      }
    } catch (error: unknown) {
      agent.warningMessage(`[${this.name}] Failed to copy EXIF data:`, error as Error);
    }

    await this.addToIndex(targetDir, fileName, formatInfo.mediaType, width, height, keywords, agent);

    agent.infoMessage(`[${this.name}] Adjusted image saved: ${filePath}`);

    return {
      mediaType: formatInfo.mediaType,
      buffer: outputBuffer,
      fileName,
      filePath,
      width,
      height,
    };
  }
}
