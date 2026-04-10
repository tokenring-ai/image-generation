import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand,} from "@tokenring-ai/agent/types";
import ImageGenerationService from "../../../ImageGenerationService.ts";
import {ImageGenerationState} from "../../../state/ImageGenerationState.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

function execute({
                   agent,
                 }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const initialModel = agent.getState(ImageGenerationState).initialConfig.model;
  if (!initialModel)
    throw new CommandFailedError("No initial image model configured");
  agent
    .requireServiceByType(ImageGenerationService)
    .setModel(initialModel, agent);
  return Promise.resolve(`Image model reset to ${initialModel}`);
}

export default {
  name: "image model reset",
  description: "Reset to initial image generation model",
  inputSchema,
  execute,
  help: `Reset the image generation model to the initial configured value.

## Example

/image model reset`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
