import { z } from "zod";

export const ImageGenerationAgentConfigSchema = z
  .object({
    model: z.string().exactOptional(),
    outputDirectory: z.string().exactOptional(),
  })
  .default({});

export const ImageGenerationServiceConfigSchema = z.object({
  defaultModels: z.array(z.string()).default([]),
  agentDefaults: z.object({
    model: z.string().exactOptional(),
    outputDirectory: z.string(),
  }),
});

export type ImageGenerationServiceConfig = z.input<typeof ImageGenerationServiceConfigSchema>;
export type ParsedImageGenerationConfig = z.output<typeof ImageGenerationServiceConfigSchema>;
