import {AgentCommandService} from "@tokenring-ai/agent";
import type {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";
import {RpcService} from "@tokenring-ai/rpc";
import {WebHostService} from "@tokenring-ai/web-host";
import type {BunRouter} from "@tokenring-ai/web-host/types";
import {z} from "zod";
import agentCommands from "./commands.ts";
import ImageGenerationService from "./ImageGenerationService.ts";
import packageJSON from "./package.json" with {type: "json"};
import imageGenerationRPC from "./rpc/imageGeneration.ts";
import {ImageGenerationServiceConfigSchema} from "./schema.ts";
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  imageGeneration: ImageGenerationServiceConfigSchema,
});

export default {
  name: packageJSON.name,
  displayName: "Image Generation",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.addServices(new ImageGenerationService(app, config.imageGeneration));
    app.waitForService(ChatService, (chatService) =>
      chatService.addTools(...tools),
    );
    app.waitForService(AgentCommandService, (agentCommandService) =>
      agentCommandService.addAgentCommands(agentCommands),
    );
    app.waitForService(RpcService, (rpcService) => {
      rpcService.registerEndpoint(imageGenerationRPC);
    });
    const outputDir = config.imageGeneration.agentDefaults.outputDirectory;
    app.waitForService(WebHostService, (webHostService) => {
      webHostService.registerResource("Image Media Files", {
        register(router: BunRouter) {
          router.static("/api/media", outputDir);
          return Promise.resolve();
        },
      });
    });
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
