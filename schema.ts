import {z} from "zod";

export const ImageGenerationAgentConfigSchema = z
  .object({
    model: z.string().optional(),
    outputDirectory: z.string().optional(),
  })
  .default({});

export const ImageGenerationServiceConfigSchema = z.object({
  defaultModels: z.array(z.string()).default([]),
  agentDefaults: z.object({
    model: z.string().optional(),
    outputDirectory: z.string(),
  }),
});

export type ImageGenerationServiceConfig = z.input<
  typeof ImageGenerationServiceConfigSchema
>;
export type ParsedImageGenerationConfig = z.output<
  typeof ImageGenerationServiceConfigSchema
>;
