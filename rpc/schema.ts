import type {RPCSchema} from "@tokenring-ai/rpc/types";
import {z} from "zod";

export const ImageIndexEntrySchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  keywords: z.array(z.string()),
});

export type ImageIndexEntry = z.output<typeof ImageIndexEntrySchema>;

export default {
  name: "Image Generation RPC",
  path: "/rpc/image-generation",
  methods: {
    getImages: {
      type: "query",
      input: z.object({
        search: z.string().optional(),
        limit: z.number().int().positive().default(200).optional(),
      }),
      result: z.object({
        images: z.array(ImageIndexEntrySchema),
        count: z.number(),
      }),
    },
    generateImage: {
      type: "mutation",
      input: z.object({
        agentId: z.string(),
        prompt: z.string(),
        model: z.string().optional(),
        aspectRatio: z
          .enum(["square", "tall", "wide"])
          .default("square")
          .optional(),
        keywords: z.array(z.string()).optional(),
      }),
      result: z.object({
        filename: z.string(),
        width: z.number(),
        height: z.number(),
        mimeType: z.string(),
        message: z.string(),
      }),
    },
  },
} satisfies RPCSchema;
