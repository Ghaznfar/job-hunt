import { z } from "zod";
import { prompts } from "./prompts";
import type {
  AIProvider,
  AIResponse,
  AIUsage,
  JobContext,
  ProfileContext,
  MatchContext,
  TailorContext,
  CoverLetterContext,
} from "./provider";
import {
  structuredResumeSchema,
  jobAnalysisSchema,
  resumeAnalysisSchema,
  matchExplanationSchema,
  tailorResultSchema,
  interviewQuestionsSchema,
  answerFeedbackSchema,
  skillGapSchema,
  type StructuredResume,
  type JobAnalysis,
  type ResumeAnalysis,
  type MatchExplanation,
  type TailorResult,
  type InterviewQuestions,
  type AnswerFeedback,
  type SkillGap,
} from "./types";

export interface RawCompletion {
  text: string;
  usage: AIUsage;
}

/** Extract the first balanced JSON object from a model response. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  if (start === -1) throw new Error("No JSON object in AI response");
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON in AI response");
}

/**
 * Concrete AI providers implement `complete()`; this base turns each provider
 * method into a prompt + JSON-parse + Zod-validate pipeline with one retry.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  protected abstract complete(system: string, user: string): Promise<RawCompletion>;

  private async json<S extends z.ZodTypeAny>(
    system: string,
    user: string,
    schema: S,
  ): Promise<AIResponse<z.infer<S>>> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.complete(
        system,
        attempt === 0
          ? user
          : `${user}\n\nYour previous response was not valid JSON. Return ONLY the JSON object.`,
      );
      try {
        const parsed = schema.parse(extractJson(res.text));
        return { data: parsed, usage: res.usage };
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`AI response failed schema validation: ${String(lastErr)}`);
  }

  analyzeJob(job: JobContext): Promise<AIResponse<JobAnalysis>> {
    const p = prompts.analyzeJob(job);
    return this.json(p.system, p.user, jobAnalysisSchema);
  }
  structureResume(rawText: string): Promise<AIResponse<StructuredResume>> {
    const p = prompts.structureResume(rawText);
    return this.json(p.system, p.user, structuredResumeSchema);
  }
  analyzeResume(resume: StructuredResume): Promise<AIResponse<ResumeAnalysis>> {
    const p = prompts.analyzeResume(JSON.stringify(resume));
    return this.json(p.system, p.user, resumeAnalysisSchema);
  }
  explainMatch(ctx: MatchContext): Promise<AIResponse<MatchExplanation>> {
    const p = prompts.explainMatch(ctx);
    return this.json(p.system, p.user, matchExplanationSchema);
  }
  tailorResume(ctx: TailorContext): Promise<AIResponse<TailorResult>> {
    const p = prompts.tailorResume(ctx);
    return this.json(p.system, p.user, tailorResultSchema);
  }
  generateCoverLetter(ctx: CoverLetterContext): Promise<AIResponse<{ content: string }>> {
    const p = prompts.coverLetter(ctx);
    return this.json(p.system, p.user, z.object({ content: z.string() }));
  }
  generateInterviewQuestions(
    job: JobContext,
    profile: ProfileContext,
  ): Promise<AIResponse<InterviewQuestions>> {
    const p = prompts.interviewQuestions(job, profile);
    return this.json(p.system, p.user, interviewQuestionsSchema);
  }
  evaluateAnswer(
    question: string,
    answer: string,
    job: JobContext,
  ): Promise<AIResponse<AnswerFeedback>> {
    const p = prompts.evaluateAnswer(question, answer, job);
    return this.json(p.system, p.user, answerFeedbackSchema);
  }
  skillGapAnalysis(
    targetTitles: string[],
    jobSkillFrequencies: { skill: string; count: number }[],
    userSkills: string[],
  ): Promise<AIResponse<SkillGap>> {
    const p = prompts.skillGap(targetTitles, jobSkillFrequencies, userSkills);
    return this.json(p.system, p.user, skillGapSchema);
  }
}
