import Agent from "@tokenring-ai/agent/Agent";
import type {AgentCreationContext} from "@tokenring-ai/agent/types";
import {ImageGenerationModelRegistry} from "@tokenring-ai/ai-client/ModelRegistry";
import TokenRingApp from "@tokenring-ai/app";
import {TokenRingService} from "@tokenring-ai/app/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import deepMerge from "@tokenring-ai/utility/object/deepMerge";
import {exiftool} from "exiftool-vendored";
import {ImageGenerationAgentConfigSchema, type ParsedImageGenerationConfig} from "./schema.ts";
import {ImageGenerationState} from "./state/ImageGenerationState.ts";

export default class ImageGenerationService implements TokenRingService {
  readonly name = "ImageGenerationService";
  description = "Image generation with configurable output directories";

  defaultModel: string | null = null;

  constructor(private app: TokenRingApp, private options: ParsedImageGenerationConfig) {
  }

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
    const agentConfig = deepMerge(this.options.agentDefaults, agent.getAgentConfigSlice('imageGeneration', ImageGenerationAgentConfigSchema));
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
    agent.mutateState(ImageGenerationState, (state) => { state.model = model; });
  }

  requireModel(agent: Agent): string {
    const model = this.getModel(agent);
    if (!model) throw new Error("No image generation model is currently selected");
    return model;
  }

  async addToIndex(directory: string, filename: string, mimeType: string, width: number, height: number, keywords: string[], agent: Agent): Promise<void> {
    const fileSystem = agent.requireServiceByType(FileSystemService);
    const indexPath = `${directory}/image_index.json`;
    const entry = JSON.stringify({filename, mimeType, width, height, keywords}) + "\n";
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
        const filename = file.split('/').pop()!;
        const entry = JSON.stringify({
          filename,
          mimeType: metadata.MIMEType || 'image/jpeg',
          width: metadata.ImageWidth || 0,
          height: metadata.ImageHeight || 0,
          keywords: metadata.Keywords || []
        });
        entries.push(entry);
      } catch (error) {
        agent.warningMessage(`Failed to read metadata for ${file}: ${error}`);
      }
    }
    
    await fileSystem.writeFile(indexPath, entries.join("\n") + "\n", agent);
    agent.infoMessage(`Reindexed ${entries.length} images.`);
  }
}
