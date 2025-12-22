import {z} from "zod";

export const ImageGenerationConfigSchema = z.object({
  outputDirectory: z.string(),
  model: z.string(),
});

export {default as ImageGenerationService} from "./ImageGenerationService.ts";
