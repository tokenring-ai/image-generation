import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import ImageGenerationService from "../ImageGenerationService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const imageService = agent.requireServiceByType(ImageGenerationService);
  await imageService.reindex(imageService.getOutputDirectory(), agent);
  return "Image index re-indexed successfully.";
}

export default {
  name: "image reindex",
  description: "Reindex the image directory",
  inputSchema,
  execute,
  help: `Regenerate the image_index.json file by scanning all images in the image directory and reading their metadata.

## Example

/image reindex`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
