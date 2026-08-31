import OpenAI from "openai";
import { env } from "@/lib/env";
import { BaseAIProvider, type RawCompletion } from "./base";

export class OpenAIProvider extends BaseAIProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    super();
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_MODEL || "gpt-4o-mini";
  }

  protected async complete(system: string, user: string): Promise<RawCompletion> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return {
      text: res.choices[0]?.message?.content ?? "",
      usage: {
        provider: this.name,
        model: this.model,
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
      },
    };
  }
}
