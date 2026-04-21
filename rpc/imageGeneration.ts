import {AgentManager} from "@tokenring-ai/agent";
import {ImageGenerationModelRegistry} from "@tokenring-ai/ai-client/ModelRegistry";
import type TokenRingApp from "@tokenring-ai/app";
import {createRPCEndpoint} from "@tokenring-ai/rpc/createRPCEndpoint";
import {exiftool} from "exiftool-vendored";
import {Buffer} from "node:buffer";
import fs from "node:fs/promises";
import {v4 as uuid} from "uuid";
import ImageGenerationService from "../ImageGenerationService.ts";
import ImageGenerationRpcSchema from "./schema.ts";

export default createRPCEndpoint(ImageGenerationRpcSchema, {
  async getImages(args, app: TokenRingApp) {
    const imageService = app.requireService(ImageGenerationService);
    const outputDir = imageService.getDefaultOutputDirectory();
    const indexPath = `${outputDir}/image_index.json`;

    let content: string;
    try {
      content = await fs.readFile(indexPath, "utf-8");
    } catch {
      return {images: [], count: 0};
    }

    let images = content
      .trim()
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (args.search) {
      const q = args.search.toLowerCase();
      images = images.filter(
        (img: any) =>
          img.keywords?.some((k: string) => k.toLowerCase().includes(q)) ||
          img.filename?.toLowerCase().includes(q),
      );
    }

    const total = images.length;
    const limit = args.limit ?? 200;
    // Return most recent first (last entries in file = newest)
    images = images.slice(-limit).reverse();

    return {images, count: total};
  },

  async generateImage(args, app: TokenRingApp) {
    const agent = app.requireService(AgentManager).getAgent(args.agentId);
    if (!agent) {
      return {status: 'agentNotFound'};
    }

    const imageService = app.requireService(ImageGenerationService);
    const imageModelRegistry = app.requireService(ImageGenerationModelRegistry);

    const modelName =
      args.model ??
      imageService.getModel(agent) ??
      imageService.getDefaultModel();
    if (!modelName) throw new Error("No image model is configured");

    const imageClient = imageModelRegistry.getClient(modelName);

    let size: `${number}x${number}`;
    let width: number, height: number;
    switch (args.aspectRatio ?? "square") {
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
        break;
    }

    const [imageResult] = await imageClient.generateImage(
      {prompt: args.prompt, size, n: 1},
      agent,
    );

    const extension = imageResult.mediaType.split("/")[1] || "jpg";
    const filename = `${uuid()}.${extension}`;
    const outputDir = imageService.getDefaultOutputDirectory();
    const filePath = `${outputDir}/${filename}`;

    await fs.writeFile(filePath, Buffer.from(imageResult.uint8Array));

    const exifData: Record<string, any> = {ImageDescription: args.prompt};
    if (args.keywords && args.keywords.length > 0) {
      exifData.Keywords = args.keywords;
    }
    try {
      await exiftool.write(filePath, exifData);
    } catch {
      // Non-fatal: EXIF write failure doesn't affect the image
    }

    const indexPath = `${outputDir}/image_index.json`;
    const entry =
      JSON.stringify({
        filename,
        mimeType: imageResult.mediaType,
        width,
        height,
        keywords: args.keywords ?? [],
      }) + "\n";
    await fs.appendFile(indexPath, entry);

    return {
      status: 'success' as const,
      filename,
      width,
      height,
      mimeType: imageResult.mediaType,
      message: `Generated: ${filename}`,
    };
  },
});
