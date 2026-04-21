import { Buffer } from "node:buffer";
import type Agent from "@tokenring-ai/agent/Agent";
import type { AgentCreationContext } from "@tokenring-ai/agent/types";
import { ImageGenerationModelRegistry } from "@tokenring-ai/ai-client/ModelRegistry";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import deepMerge from "@tokenring-ai/utility/object/deepMerge";
import { generateHumanId } from "@tokenring-ai/utility/string/generateHumanId";
import { exiftool } from "exiftool-vendored";
import { ImageGenerationAgentConfigSchema, type ParsedImageGenerationConfig } from "./schema.ts";
import { ImageGenerationState } from "./state/ImageGenerationState.ts";

export type GenerateImageOptions = {
  prompt: string;
  aspectRatio: "square" | "tall" | "wide";
  keywords?: string[] | undefined;
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
    const agentConfig = deepMerge(this.options.agentDefaults, agent.getAgentConfigSlice("imageGeneration", ImageGenerationAgentConfigSchema));
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
}
