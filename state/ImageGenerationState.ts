import {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import type {ParsedImageGenerationConfig} from "../schema.ts";

const serializationSchema = z.object({
  model: z.string().nullable(),
  outputDirectory: z.string(),
});

export class ImageGenerationState extends AgentStateSlice<typeof serializationSchema> {
  model: string | null;
  outputDirectory: string;

  constructor(readonly initialConfig: ParsedImageGenerationConfig["agentDefaults"]) {
    super("ImageGenerationState", serializationSchema);
    this.model = initialConfig.model ?? null;
    this.outputDirectory = initialConfig.outputDirectory;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {model: this.model, outputDirectory: this.outputDirectory};
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.model = data.model;
    this.outputDirectory = data.outputDirectory;
  }

  show(): string[] {
    return [
      `Image Model: ${this.model ?? "(none)"}`,
      `Output Directory: ${this.outputDirectory}`,
    ];
  }
}
