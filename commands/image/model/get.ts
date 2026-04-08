import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import ImageGenerationService from "../../../ImageGenerationService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  return `Current image model: ${agent.requireServiceByType(ImageGenerationService).getModel(agent) ?? "(none)"}`;
}

export default {
  name: "image model get",
  description: "Show current image generation model",
  inputSchema,
  execute,
  help: `Show the currently active image generation model.

## Example

/image model get`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
