import { extractSkills, resolveSkill } from "@/lib/skills/normalize";
import type {
  AIProvider,
  AIResponse,
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

const USAGE = { provider: "mock", model: "mock-1" };
function wrap<T>(data: T): AIResponse<T> {
  return { data, usage: { ...USAGE } };
}

const YEARS_RE = /(\d+)\s*\+?\s*(?:-\s*(\d+)\s*)?(?:years?|yrs?)/i;

function detectYears(text: string): { min: number | null; max: number | null } {
  const m = text.match(YEARS_RE);
  if (!m) return { min: null, max: null };
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : null;
  return { min: Number.isFinite(min) ? min : null, max };
}

function detectSeniority(title: string, text: string): JobAnalysis["seniorityLevel"] {
  const t = `${title} ${text}`.toLowerCase();
  if (/\bprincipal\b/.test(t)) return "principal";
  if (/\bstaff\b/.test(t)) return "staff";
  if (/\blead\b/.test(t)) return "lead";
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return "senior";
  if (/\bjunior\b|\bjr\.?\b|\bgraduate\b|\bentry[- ]level\b/.test(t)) return "junior";
  if (/\bintern(ship)?\b/.test(t)) return "intern";
  return "mid";
}

function detectArrangement(text: string): JobAnalysis["workArrangement"] {
  const t = text.toLowerCase();
  if (/\bfully remote\b|\b100% remote\b|\bremote[- ]first\b|\bwork from home\b/.test(t))
    return "REMOTE";
  if (/\bhybrid\b/.test(t)) return "HYBRID";
  if (/\bon[- ]?site\b|\bin[- ]office\b|\bin person\b/.test(t)) return "ONSITE";
  if (/\bremote\b/.test(t)) return "REMOTE";
  return "UNKNOWN";
}

function detectSponsorship(text: string): JobAnalysis["sponsorshipAvailable"] {
  const t = text.toLowerCase();
  if (
    /no\s+(visa\s+)?sponsorship|not\s+able\s+to\s+sponsor|unable\s+to\s+sponsor|without\s+sponsorship|do not provide sponsorship/.test(
      t,
    )
  )
    return "NO";
  if (
    /sponsorship\s+(is\s+)?(available|provided|offered)|will\s+sponsor|visa\s+sponsorship\s+available/.test(
      t,
    )
  )
    return "YES";
  return "UNKNOWN";
}

function detectWorkAuth(text: string, country?: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (
    /authoriz(ed|ation) to work in the (us|united states)|us work authorization|must be a us citizen|us citizen(ship)? required|security clearance/.test(
      t,
    )
  )
    out.push("US");
  if (/right to work in the uk|uk work authorization|settled status/.test(t)) out.push("GB");
  if (out.length === 0 && country && /(clearance|citizen)/.test(t)) out.push(country);
  return [...new Set(out)];
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async analyzeJob(job: JobContext): Promise<AIResponse<JobAnalysis>> {
    const text = `${job.description}\n${job.requirementsText ?? ""}`;
    const skills = extractSkills(text);
    // Heuristic: skills mentioned near "required"/"must" are required; rest preferred.
    const required: string[] = [];
    const preferred: string[] = [];
    for (const s of skills) {
      const near = new RegExp(
        `(require|must have|essential|strong)[^.]{0,80}\\b${s.name.toLowerCase()}\\b|\\b${s.name.toLowerCase()}\\b[^.]{0,40}(required|essential)`,
        "i",
      );
      if (near.test(text.toLowerCase()) || required.length + preferred.length < 4)
        required.push(s.name);
      else preferred.push(s.name);
    }
    const years = detectYears(text);
    const data = jobAnalysisSchema.parse({
      requiredSkills: required.length ? required : skills.slice(0, 6).map((s) => s.name),
      preferredSkills: preferred,
      minYears: years.min,
      maxYears: years.max,
      seniorityLevel: detectSeniority(job.title, text),
      workArrangement: detectArrangement(text),
      requiresWorkAuthorization: detectWorkAuth(text, job.country),
      sponsorshipAvailable: detectSponsorship(text),
      responsibilitiesSummary: splitSentences(job.description).slice(0, 2).join(" "),
      confidence: 0.55,
    });
    return wrap(data);
  }

  async structureResume(rawText: string): Promise<AIResponse<StructuredResume>> {
    const lines = rawText.split(/\n/).map((l) => l.trim());
    const emailMatch = rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const phoneMatch = rawText.match(/(\+?\d[\d\s().-]{7,}\d)/);
    const links = [...rawText.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]).slice(0, 5);
    const firstNonEmpty = lines.find((l) => l.length > 0) ?? "";

    // Very rough section splitter for the mock.
    const sectionIndex = (names: string[]) =>
      lines.findIndex((l) => names.some((n) => new RegExp(`^${n}\\b`, "i").test(l)));
    const expIdx = sectionIndex(["experience", "employment", "work history"]);
    const eduIdx = sectionIndex(["education", "academic"]);
    const skillsIdx = sectionIndex(["skills", "technologies", "technical skills"]);

    const skillsText =
      skillsIdx >= 0 ? lines.slice(skillsIdx + 1, skillsIdx + 6).join(", ") : rawText;
    const skills = extractSkills(skillsText).map((s) => s.name);

    const summaryBlock = lines
      .slice(1, expIdx > 1 ? Math.min(expIdx, 6) : 4)
      .join(" ")
      .trim();

    const experience =
      expIdx >= 0
        ? lines
            .slice(expIdx + 1, eduIdx > expIdx ? eduIdx : expIdx + 12)
            .filter(Boolean)
            .reduce<StructuredResume["experience"]>((acc, line) => {
              const m = line.match(/^(.+?)\s+(?:—|–|-|,|@|at)\s+(.+?)(?:\s+\((.+)\))?$/);
              if (m) {
                acc.push({
                  title: m[1].trim(),
                  company: m[2].trim(),
                  location: "",
                  startDate: m[3]?.split(/[-–—]/)[0]?.trim() ?? "",
                  endDate: m[3]?.split(/[-–—]/)[1]?.trim() ?? "",
                  current: /present|current/i.test(line),
                  bullets: [],
                  techs: extractSkills(line).map((s) => s.name),
                });
              } else if (acc.length && line.startsWith("-")) {
                acc[acc.length - 1].bullets.push(line.replace(/^-\s*/, ""));
              }
              return acc;
            }, [])
        : [];

    const education =
      eduIdx >= 0
        ? lines
            .slice(eduIdx + 1, eduIdx + 5)
            .filter(Boolean)
            .map((line) => {
              const m = line.match(/^(.+?),\s*(.+)$/);
              return {
                institution: m ? m[2].trim() : line,
                degree: m ? m[1].trim() : "",
                field: "",
                startDate: "",
                endDate: (line.match(/\b(19|20)\d{2}\b/) ?? [""])[0],
                grade: "",
              };
            })
        : [];

    const data = structuredResumeSchema.parse({
      fullName: /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(firstNonEmpty) ? firstNonEmpty : "",
      email: emailMatch?.[0] ?? "",
      phone: phoneMatch?.[0] ?? "",
      location: "",
      links,
      summary: summaryBlock.slice(0, 600),
      experience,
      education,
      skills,
      certifications: [],
      projects: [],
      languages: [],
    });
    return wrap(data);
  }

  async analyzeResume(resume: StructuredResume): Promise<AIResponse<ResumeAnalysis>> {
    const skills = resume.skills
      .map((s) => resolveSkill(s)?.name)
      .filter((v): v is string => Boolean(v));
    const years = resume.experience.length * 1.5;
    return wrap(
      resumeAnalysisSchema.parse({
        summary:
          resume.summary ||
          `${resume.experience[0]?.title ?? "Engineer"} with experience across ${skills
            .slice(0, 3)
            .join(", ")}.`,
        strengths: skills.slice(0, 5).map((s) => `Demonstrated ${s} experience`),
        weaknesses: resume.experience.every((e) => e.bullets.length === 0)
          ? ["Experience entries lack quantified achievement bullets"]
          : [],
        detectedSkills: skills,
        totalYearsExperience: years || null,
      }),
    );
  }

  async explainMatch(ctx: MatchContext): Promise<AIResponse<MatchExplanation>> {
    const verdictText: Record<MatchContext["verdict"], string> = {
      APPLY: "This is a strong match and worth a tailored application.",
      MAYBE: "This is a partial match. Apply if you can address the concerns below.",
      DONT_APPLY: "This role is unlikely to be a fit right now — focus your energy elsewhere.",
    };
    const base = verdictText[ctx.verdict];
    const strong = ctx.strongMatches.slice(0, 4).join(", ");
    const gaps = ctx.missingSkills.slice(0, 3).join(", ");
    const recommendation =
      `${base} Your technical fit is ${ctx.scores.technical}% and experience fit ${ctx.scores.experience}%.` +
      (strong ? ` Strengths: ${strong}.` : "") +
      (gaps ? ` Consider strengthening: ${gaps}.` : "");
    return wrap(
      matchExplanationSchema.parse({
        recommendation,
        reasons: ctx.deterministicReasons,
        concerns: ctx.deterministicConcerns,
      }),
    );
  }

  async tailorResume(ctx: TailorContext): Promise<AIResponse<TailorResult>> {
    const jobSkills = extractSkills(`${ctx.job.description} ${ctx.job.requirementsText ?? ""}`).map(
      (s) => s.name,
    );
    const allowed = new Set(ctx.allowedSkills.map((s) => s.toLowerCase()));
    const highlight = jobSkills.filter((s) => allowed.has(s.toLowerCase()));

    const changes: TailorResult["changes"] = [];
    if (ctx.resume.summary) {
      changes.push({
        section: "Summary",
        location: "Summary",
        original: ctx.resume.summary,
        improved: `${ctx.job.title} candidate. ${ctx.resume.summary}`.slice(0, 600),
        reason: `Leads with the target role (${ctx.job.title}) so a recruiter sees relevance immediately.`,
      });
    }
    ctx.resume.experience.slice(0, 2).forEach((exp, i) => {
      const relevant = exp.techs.filter((t) =>
        highlight.some((h) => h.toLowerCase() === t.toLowerCase()),
      );
      if (exp.bullets[0]) {
        changes.push({
          section: "Experience",
          location: `Experience · ${exp.company} · bullet 1`,
          original: exp.bullets[0],
          improved: relevant.length
            ? `${exp.bullets[0]} (${relevant.join(", ")})`
            : exp.bullets[0].replace(/^(Worked on|Helped|Responsible for)/i, "Delivered"),
          reason: relevant.length
            ? `Surfaces ${relevant.join(", ")}, which this job asks for and which you already list here.`
            : "Uses a stronger action verb; content unchanged.",
        });
      }
      void i;
    });

    return wrap(
      tailorResultSchema.parse({
        changes,
        skillsToHighlight: highlight,
        overallNote:
          "Mock tailoring: wording and emphasis only. No new experience, skills or claims were added.",
      }),
    );
  }

  async generateCoverLetter(ctx: CoverLetterContext): Promise<AIResponse<{ content: string }>> {
    const content = [
      `Dear ${ctx.job.company} Hiring Team,`,
      "",
      `I'm applying for the ${ctx.job.title} role. ${ctx.resumeSummary}`.trim(),
      "",
      ctx.highlights.length
        ? `In particular, my experience with ${ctx.highlights.slice(0, 3).join(", ")} maps closely to what you've described.`
        : `My background lines up well with the responsibilities you've outlined.`,
      "",
      `I'd welcome the chance to discuss how I can contribute to ${ctx.job.company}.`,
      "",
      "Best regards,",
      ctx.profile.currentTitle ? `A ${ctx.profile.currentTitle}` : "The candidate",
    ].join("\n");
    return wrap({ content });
  }

  async generateInterviewQuestions(
    job: JobContext,
    profile: ProfileContext,
  ): Promise<AIResponse<InterviewQuestions>> {
    const skills = extractSkills(`${job.description} ${job.requirementsText ?? ""}`)
      .map((s) => s.name)
      .slice(0, 6);
    const s = (i: number) => skills[i % Math.max(skills.length, 1)] ?? "the core stack";
    return wrap(
      interviewQuestionsSchema.parse({
        technical: [
          `Walk through how you'd design a system using ${s(0)} and ${s(1)}.`,
          `How do you debug a production issue involving ${s(2)}?`,
          `What are common failure modes with ${s(3)} and how do you mitigate them?`,
        ],
        scenario: [
          `A deployment to production has doubled error rates. What are your first three steps?`,
          `You inherit an undocumented ${s(0)} setup that's costing too much. How do you approach it?`,
        ],
        behavioral: [
          "Tell me about a time you disagreed with a technical decision. What happened?",
          "Describe a project that slipped. What did you learn?",
        ],
        hr: [
          "Tell me about yourself.",
          `Why do you want to work at ${job.company}?`,
          "What are your salary expectations?",
        ],
        jobSpecific: [
          `This role emphasises ${s(0)}. Describe your most relevant hands-on experience.`,
          `How does your background as a ${profile.currentTitle ?? "engineer"} prepare you for ${job.title}?`,
        ],
      }),
    );
  }

  async evaluateAnswer(
    question: string,
    answer: string,
    _job: JobContext,
  ): Promise<AIResponse<AnswerFeedback>> {
    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    const hasStar = /(situation|task|action|result|impact|metric|%|\d)/i.test(answer);
    const score = Math.max(20, Math.min(95, 40 + Math.min(words, 120) / 3 + (hasStar ? 15 : 0)));
    const feedback =
      words < 40
        ? "Your answer is quite short. Add concrete context, the actions you personally took, and a measurable outcome."
        : hasStar
          ? "Good structure and specifics. Tighten the opening and make the result even more quantified."
          : "Reasonable length, but it lacks specifics. Use the STAR structure and include at least one metric.";
    return wrap(
      answerFeedbackSchema.parse({
        feedback,
        improvedAnswer: `${answer.trim()}${
          hasStar ? "" : "\n\nResult: quantify the impact here (e.g. reduced deploy time by 40%)."
        }`,
        score: Math.round(score),
      }),
    );
  }

  async skillGapAnalysis(
    _targetTitles: string[],
    jobSkillFrequencies: { skill: string; count: number }[],
    userSkills: string[],
  ): Promise<AIResponse<SkillGap>> {
    const have = new Set(userSkills.map((s) => s.toLowerCase()));
    const max = Math.max(1, ...jobSkillFrequencies.map((f) => f.count));
    const topSkills = jobSkillFrequencies
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((f) => ({
        skill: f.skill,
        demand: Math.round((f.count / max) * 100),
        haveIt: have.has(f.skill.toLowerCase()),
      }));
    const gaps = topSkills.filter((s) => !s.haveIt).map((s) => s.skill);
    return wrap(
      skillGapSchema.parse({
        topSkills,
        summary: gaps.length
          ? `The most common skills in your target roles that you don't yet list are ${gaps
              .slice(0, 4)
              .join(", ")}. Prioritising ${gaps[0]} would unlock the most matches.`
          : "You already cover the most in-demand skills for your target roles.",
      }),
    );
  }
}
