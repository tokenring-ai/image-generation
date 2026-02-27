import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import ImageGenerationService from "../ImageGenerationService.ts";

const description = "/image [action] - Manage image generation";

const help = `# /image - Manage image generation

## /image reindex

Regenerate the image_index.json file in the image directory by scanning all images and reading their metadata.

### Examples

/image reindex
`;

const execute = createSubcommandRouter({
  reindex
})

async function reindex(remainder: string, agent: Agent): Promise<string> {
  const imageService = agent.requireServiceByType(ImageGenerationService);
  const directory = imageService.getOutputDirectory();

  await imageService.reindex(directory, agent);
  return "Image index reindexed successfully.";
}

export default {
  name: "image",
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand;
