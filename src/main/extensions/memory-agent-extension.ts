import { log, logError } from '../utils/logger';
import type {
  AgentRuntimeExtension,
  BeforeSessionRunContext,
  BeforeSessionRunResult,
} from './agent-runtime-extension';
import type { MemoryService } from '../memory/memory-service';

const MAX_INJECTED_RESULTS = 4;
const MEMORY_INJECTION_THRESHOLD = 0.1; // minimum score to consider relevant

/**
 * Injects top memory search results into the agent's prompt prefix,
 * giving it persistent context from previous sessions.
 */
export class MemoryAgentExtension implements AgentRuntimeExtension {
  name = 'MemoryAgentExtension';

  constructor(private readonly memoryService: MemoryService) {}

  async beforeSessionRun(
    context: BeforeSessionRunContext
  ): Promise<BeforeSessionRunResult | void> {
    const { prompt, session } = context;

    // Skip for very short prompts (keystroke-level messages)
    if (prompt.trim().length < 6) return {};

    try {
      // memoryService.search() returns MemorySearchResult[] directly
      const results = await this.memoryService.search({
        query: prompt,
        scope: 'all',
        limit: MAX_INJECTED_RESULTS,
        cwd: session.cwd ?? undefined,
      });

      if (
        !results ||
        results.length === 0 ||
        results[0].score < MEMORY_INJECTION_THRESHOLD
      ) {
        return {};
      }

      const memoryLines = results
        .filter((r) => r.score >= MEMORY_INJECTION_THRESHOLD)
        .map((r) => {
          const label = r.sourceWorkspace ?? r.title ?? r.id;
          return `[${label}] ${r.summary}`;
        });

      if (memoryLines.length === 0) return {};

      const memoryBlock = [
        '<relevant_memory>',
        ...memoryLines,
        '</relevant_memory>',
      ].join('\n');

      log(`[MemoryAgentExtension] Injected ${memoryLines.length} memory results (top score: ${results[0].score?.toFixed(3)})`);

      return {
        promptPrefix: `${memoryBlock}\n`,
      };
    } catch (err) {
      logError('[MemoryAgentExtension] Failed to search memory:', err);
      // Memory lookup failure is non-fatal — run without memory context
      return {};
    }
  }
}
