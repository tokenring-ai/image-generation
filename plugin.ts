import {AgentCommandService} from "@tokenring-ai/agent";
import TokenRingApp, {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";
import chatCommands from "./chatCommands.ts";
import {ImageGenerationConfigSchema} from "./index.ts";
import ImageGenerationService from "./ImageGenerationService.ts";
import packageJSON from './package.json' with {type: 'json'};
import tools from "./tools.ts";

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const config = app.getConfigSlice('imageGeneration', ImageGenerationConfigSchema.optional());
    if (config) {
      app.addServices(new ImageGenerationService(config));
      app.waitForService(ChatService, chatService =>
        chatService.addTools(packageJSON.name, tools)
      );
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
    }
  },
} satisfies TokenRingPlugin;
