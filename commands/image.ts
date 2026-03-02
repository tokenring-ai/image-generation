import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import ImageGenerationService from "../ImageGenerationService.ts";

export default {
  name: "image reindex",
  description: "/image reindex - Reindex the image directory",
  help: `# /image reindex

Regenerate the image_index.json file by scanning all images in the image directory and reading their metadata.

## Example

/image reindex`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const imageService = agent.requireServiceByType(ImageGenerationService);
    await imageService.reindex(imageService.getOutputDirectory(), agent);
    return "Image index reindexed successfully.";
  },
} satisfies TokenRingAgentCommand;
