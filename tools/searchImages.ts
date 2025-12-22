import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingToolDefinition} from "@tokenring-ai/chat/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import {z} from "zod";
import ImageGenerationService from "../ImageGenerationService.ts";

const name = "image/search";

function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 1.0;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
  
  const aWords = aLower.split(/\s+/);
  const bWords = bLower.split(/\s+/);
  const matches = aWords.filter(w => bWords.includes(w)).length;
  return matches / Math.max(aWords.length, bWords.length);
}

async function execute(
  {query, limit = 10}: z.infer<typeof inputSchema>,
  agent: Agent,
) {
  const imageService = agent.requireServiceByType(ImageGenerationService);
  const fileSystem = agent.requireServiceByType(FileSystemService);

  const targetDir = imageService.getOutputDirectory();

  const indexPath = `${targetDir}/image_index.json`;
  const indexContent = await fileSystem.getFile(indexPath);
  
  if (!indexContent) {
    throw new Error(`No index found at ${indexPath}. Run /image reindex first.`);
  }

  const lines = indexContent.trim().split("\n");
  const results: Array<{filename: string; score: number; mimeType: string; width: number; height: number; keywords: string[]}> = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const keywordText = entry.keywords.join(" ");
      const score = similarity(query, keywordText);
      
      if (score > 0) {
        results.push({...entry, score});
      }
    } catch (error) {
      agent.warningLine(`Failed to parse index line: ${line}`);
    }
  }

  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, limit);

  agent.infoLine(`[${name}] Found ${results.length} matches, returning top ${topResults.length}`);

  return {
    success: true,
    results: topResults.map(r => ({
      filename: r.filename,
      path: `${targetDir}/${r.filename}`,
      score: r.score,
      mimeType: r.mimeType,
      width: r.width,
      height: r.height,
      keywords: r.keywords
    })),
    message: `Found ${topResults.length} images matching "${query}"`,
  };
}

const description = "Search for images in the index based on keyword similarity";

const inputSchema = z.object({
  query: z.string().describe("Search query to match against image keywords"),
  limit: z.number().int().positive().default(10).describe("Maximum number of results to return").optional(),
});

export default {
  name, description, inputSchema, execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
