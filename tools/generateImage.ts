import Agent from "@tokenring-ai/agent/Agent";
import {ImageGenerationModelRegistry} from "@tokenring-ai/ai-client/ModelRegistry";
import {TokenRingToolDefinition} from "@tokenring-ai/chat/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import {exiftool} from "exiftool-vendored";
import {Buffer} from "node:buffer";
import {v4 as uuid} from "uuid";
import {z} from "zod";
import ImageGenerationService from "../ImageGenerationService.ts";

const name = "image/generate";

async function execute(
  {prompt, aspectRatio = "square", outputDirectory, model, keywords}: z.infer<typeof inputSchema>,
  agent: Agent,
) {
  const imageService = agent.requireServiceByType(ImageGenerationService);
  const fileSystem = agent.requireServiceByType(FileSystemService);
  const imageModelRegistry = agent.requireServiceByType(ImageGenerationModelRegistry);

  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const targetDir = imageService.getOutputDirectory();

  agent.infoLine(`[${name}] Generating image: "${prompt}"`);

  const imageClient = await imageModelRegistry.getFirstOnlineClient(imageService.getModel());

  let size: `${number}x${number}`;
  let width: number, height: number;
  switch (aspectRatio) {
    case "square": size = "1024x1024"; width = 1024; height = 1024; break;
    case "tall": size = "1024x1536"; width = 1024; height = 1536; break;
    case "wide": size = "1536x1024"; width = 1536; height = 1024; break;
    default: size = "1024x1024"; width = 1024; height = 1024;
  }

  const [imageResult] = await imageClient.generateImage({prompt, size, n: 1}, agent);

  const extension = imageResult.mediaType.split("/")[1];
  const filename = `${uuid()}.${extension}`;
  const imageBuffer = Buffer.from(imageResult.uint8Array);
  const filePath = `${targetDir}/${filename}`;

  await fileSystem.writeFile(filePath, imageBuffer);
  
  const exifData: any = {};
  if (keywords && keywords.length > 0) {
    exifData.Keywords = keywords;
  }
  exifData.ImageDescription = prompt;
  
  try {
    await exiftool.write(filePath, exifData);
    agent.infoLine(`[${name}] Added metadata to EXIF data`);
  } catch (error) {
    agent.warningLine(`[${name}] Failed to write EXIF data: ${error}`);
  }
  
  await imageService.addToIndex(targetDir, filename, imageResult.mediaType, width, height, keywords || [], agent);
  
  agent.infoLine(`[${name}] Image saved: ${filePath}`);

  return {
    success: true,
    path: filePath,
    message: `Image generated and saved to ${filePath}`,
  };
}

const description = "Generate an AI image and save it to a configured output directory";

const inputSchema = z.object({
  prompt: z.string().describe("Description of the image to generate"),
  aspectRatio: z.enum(["square", "tall", "wide"]).default("square").optional(),
  outputDirectory: z.string().describe("Output directory (will prompt if not provided)").optional(),
  model: z.string().describe("Image generation model to use").optional(),
  keywords: z.array(z.string()).describe("Keywords to add to image EXIF/IPTC metadata").optional(),
});

export default {
  name, description, inputSchema, execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
