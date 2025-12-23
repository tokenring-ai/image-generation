import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingService} from "@tokenring-ai/app/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import {exiftool} from "exiftool-vendored";
import {z} from "zod";
import {ImageGenerationConfigSchema} from "./index.ts";

export default class ImageGenerationService implements TokenRingService {
  name = "ImageGenerationService";
  description = "Image generation with configurable output directories";

  outputDirectory: string;
  model: string;

  constructor(config: z.infer<typeof ImageGenerationConfigSchema>) {
    this.outputDirectory = config.outputDirectory;
    this.model = config.model
  }

  getOutputDirectory(): string {
    return this.outputDirectory;
  }

  getModel(): string {
    return this.model;
  }

  async addToIndex(directory: string, filename: string, mimeType: string, width: number, height: number, keywords: string[], agent: Agent): Promise<void> {
    const fileSystem = agent.requireServiceByType(FileSystemService);
    const indexPath = `${directory}/image_index.json`;
    const entry = JSON.stringify({filename, mimeType, width, height, keywords}) + "\n";
    await fileSystem.appendFile(indexPath, entry);
  }

  async reindex(directory: string, agent: Agent): Promise<void> {
    const fileSystem = agent.requireServiceByType(FileSystemService);
    const indexPath = `${directory}/image_index.json`;
    
    agent.infoLine(`Reindexing images in ${directory}...`);
    
    const files = await fileSystem.glob(`${directory}/*.{jpg,jpeg,png,webp}`);
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
        agent.warningLine(`Failed to read metadata for ${file}: ${error}`);
      }
    }
    
    await fileSystem.writeFile(indexPath, entries.join("\n") + "\n");
    agent.infoLine(`Reindexed ${entries.length} images`);
  }
}
