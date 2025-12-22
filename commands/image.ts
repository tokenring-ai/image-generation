import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import ImageGenerationService from "../ImageGenerationService.ts";

const description = "/image [action] - Manage image generation";

const help = `# /image - Manage image generation

## /image reindex [directory]

Regenerate the image_index.json file for a directory by scanning all images and reading their metadata.

If no directory is specified, will prompt to select from configured output directories.

### Examples

/image reindex ./images
/image reindex
`;

async function execute(remainder: string, agent: Agent): Promise<void> {
  const imageService = agent.requireServiceByType(ImageGenerationService);
  const [action, ...args] = remainder.split(/\s+/);

  if (action === "reindex") {
    const directory = imageService.getOutputDirectory();

    await imageService.reindex(directory, agent);
  } else {
    agent.infoLine(help);
  }
}

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand;
