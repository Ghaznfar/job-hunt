import "server-only";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

export * from "./provider";
export * from "./types";

// Rough $/1M tokens for cost estimation (input+output blended, cents per 1k tokens).
const COST_PER_1K_CENTS: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 0.3, out: 1.5 },
  "gpt-4o-mini": { in: 0.015, out: 0.06 },
  "mock-1": { in: 0, out: 0 },
};

function estimateCostCents(model: string, promptTokens = 0, completionTokens = 0): number {
  const rate = COST_PER_1K_CENTS[model] ?? { in: 0.1, out: 0.3 };
  return Math.round((promptTokens / 1000) * rate.in + (completionTokens / 1000) * rate.out);
}

function buildProvider(): AIProvider {
  switch (env.AI_PROVIDER) {
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        logger.warn("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is empty — falling back to mock");
        return new MockAIProvider();
      }
      return new AnthropicProvider();
    case "openai":
      if (!env.OPENAI_API_KEY) {
        logger.warn("AI_PROVIDER=openai but OPENAI_API_KEY is empty — falling back to mock");
        return new MockAIProvider();
      }
      return new OpenAIProvider();
    default:
      return new MockAIProvider();
  }
}

/**
 * Wrap a provider so every call is timed, cost-estimated and written to
 * `AIRequest` for admin visibility and abuse monitoring.
 */
function withLogging(provider: AIProvider, opts?: { userId?: string | null }): AIProvider {
  return new Proxy(provider, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig !== "function" || prop === "name") return orig;
      const feature = String(prop);
      return async (...args: unknown[]) => {
        const started = Date.now();
        try {
          const result = (await orig.apply(target, args)) as { usage?: Record<string, unknown> };
          const usage = (result?.usage ?? {}) as {
            provider?: string;
            model?: string;
            promptTokens?: number;
            completionTokens?: number;
          };
          await prisma.aIRequest
            .create({
              data: {
                userId: opts?.userId ?? null,
                feature,
                provider: usage.provider ?? provider.name,
                model: usage.model ?? "unknown",
                promptTokens: usage.promptTokens ?? null,
                completionTokens: usage.completionTokens ?? null,
                costCents: estimateCostCents(
                  usage.model ?? "",
                  usage.promptTokens,
                  usage.completionTokens,
                ),
                latencyMs: Date.now() - started,
                status: "OK",
              },
            })
            .catch(() => undefined);
          return result;
        } catch (err) {
          await prisma.aIRequest
            .create({
              data: {
                userId: opts?.userId ?? null,
                feature,
                provider: provider.name,
                model: "unknown",
                latencyMs: Date.now() - started,
                status: "ERROR",
                error: err instanceof Error ? err.message.slice(0, 1000) : String(err),
              },
            })
            .catch(() => undefined);
          logger.error({ feature, err: err instanceof Error ? err.message : String(err) }, "AI call failed");
          throw err;
        }
      };
    },
  });
}

let cachedBase: AIProvider | null = null;

/** Get the configured AI provider, wrapped with usage logging. */
export function getAI(opts?: { userId?: string | null }): AIProvider {
  cachedBase ??= buildProvider();
  return withLogging(cachedBase, opts);
}

export const aiProviderName = env.AI_PROVIDER;
export const isAIConfigured =
  env.AI_PROVIDER === "mock" ||
  (env.AI_PROVIDER === "anthropic" && !!env.ANTHROPIC_API_KEY) ||
  (env.AI_PROVIDER === "openai" && !!env.OPENAI_API_KEY);
