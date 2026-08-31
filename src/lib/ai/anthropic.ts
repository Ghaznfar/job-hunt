import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { BaseAIProvider, type RawCompletion } from "./base";

export class AnthropicProvider extends BaseAIProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor() {
    super();
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    this.model = env.ANTHROPIC_MODEL || "claude-sonnet-5";
  }

  protected async complete(system: string, user: string): Promise<RawCompletion> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      text,
      usage: {
        provider: this.name,
        model: this.model,
        promptTokens: res.usage.input_tokens,
        completionTokens: res.usage.output_tokens,
      },
    };
  }
}
