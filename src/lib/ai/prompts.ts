import type {
  JobContext,
  ProfileContext,
  MatchContext,
  TailorContext,
  CoverLetterContext,
} from "./provider";

/**
 * Shared prompt templates used by every real AI provider. Each returns a
 * `{ system, user }` pair; the provider is responsible only for transport and
 * for coercing the response to JSON.
 *
 * Anti-hallucination rules are repeated in every relevant prompt on purpose.
 */

const NO_FABRICATION =
  "CRITICAL RULES: Use ONLY facts explicitly present in the input. Never invent, assume, or embellish employment history, job titles, dates, companies, education, certifications, skills, metrics, or achievements. If information is missing, leave the field empty or null. Do not infer skills that are not clearly stated.";

const JSON_ONLY =
  "Respond with a single valid JSON object and nothing else. No markdown, no code fences, no commentary.";

export const prompts = {
  structureResume(rawText: string) {
    return {
      system: `You extract structured data from a résumé. ${NO_FABRICATION} ${JSON_ONLY}`,
      user: `Extract this résumé into JSON with keys: fullName, email, phone, location, links[], summary, experience[] (company,title,location,startDate,endDate,current,bullets[],techs[]), education[] (institution,degree,field,startDate,endDate,grade), skills[], certifications[] (name,issuer), projects[] (name,description,techs[],url), languages[] (name,proficiency).\n\nRésumé:\n"""\n${rawText.slice(0, 15000)}\n"""`,
    };
  },

  analyzeJob(job: JobContext) {
    return {
      system: `You extract hiring requirements from a job posting. ${NO_FABRICATION} ${JSON_ONLY}`,
      user: `From this job posting, produce JSON: requiredSkills[], preferredSkills[], minYears (number|null), maxYears (number|null), seniorityLevel (intern|junior|mid|senior|staff|principal|lead|unknown), workArrangement (REMOTE|HYBRID|ONSITE|UNKNOWN), requiresWorkAuthorization[] (ISO country codes, only if the posting explicitly requires it), sponsorshipAvailable (YES|NO|UNKNOWN — only YES/NO if explicitly stated), responsibilitiesSummary (<=2 sentences), confidence (0..1, how confident you are given how explicit the posting is).\n\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location ?? ""} ${job.country ?? ""}\n\nDescription:\n"""\n${job.description.slice(0, 12000)}\n"""\n${job.requirementsText ? `Requirements:\n"""\n${job.requirementsText.slice(0, 4000)}\n"""` : ""}`,
    };
  },

  analyzeResume(resumeJson: string) {
    return {
      system: `You analyse a structured résumé. ${NO_FABRICATION} ${JSON_ONLY}`,
      user: `Given this structured résumé JSON, produce JSON: summary (2-3 sentences, factual), strengths[] (grounded in the résumé), weaknesses[] (gaps or presentation issues), detectedSkills[] (only skills clearly evidenced), totalYearsExperience (number|null, computed from dates if possible).\n\n${resumeJson.slice(0, 12000)}`,
    };
  },

  explainMatch(ctx: MatchContext) {
    return {
      system: `You write a concise, honest recommendation for whether a candidate should apply to a job. A deterministic engine has ALREADY decided the verdict and computed the scores and the reason/concern lists — you must NOT contradict or change them. ${NO_FABRICATION} ${JSON_ONLY}`,
      user: `Verdict (fixed): ${ctx.verdict}
Scores: overall ${ctx.scores.overall}, technical ${ctx.scores.technical}, experience ${ctx.scores.experience}, location ${ctx.scores.location}, salary ${ctx.scores.salary}, seniority ${ctx.scores.seniority}, eligibility ${ctx.scores.eligibility}
Strong matches: ${ctx.strongMatches.join(", ") || "none"}
Missing skills: ${ctx.missingSkills.join(", ") || "none"}
Deterministic reasons: ${ctx.deterministicReasons.join("; ") || "none"}
Deterministic concerns: ${ctx.deterministicConcerns.join("; ") || "none"}

Candidate: ${ctx.profile.currentTitle ?? "engineer"}, ${ctx.profile.yearsExperience ?? "?"} years, skills: ${ctx.profile.skills.join(", ")}
Job: ${ctx.job.title} at ${ctx.job.company}

Produce JSON: recommendation (2-4 sentences, matches the ${ctx.verdict} verdict), reasons[] (echo/clarify the deterministic reasons, do not add unsupported ones), concerns[] (same for concerns).`,
    };
  },

  tailorResume(ctx: TailorContext) {
    return {
      system: `You tailor an existing résumé to a specific job by improving WORDING and EMPHASIS only. ${NO_FABRICATION} You may ONLY reference skills from this allowed list: [${ctx.allowedSkills.join(", ")}]. Never add a skill, tool, employer, project, date or achievement that is not already in the résumé. ${JSON_ONLY}`,
      user: `Résumé JSON:\n${JSON.stringify(ctx.resume).slice(0, 12000)}\n\nJob: ${ctx.job.title} at ${ctx.job.company}\nJob description:\n"""\n${ctx.job.description.slice(0, 8000)}\n"""\n\nProduce JSON: changes[] (section, location e.g. "Experience · Acme · bullet 2", original (verbatim from résumé), improved (rewritten, same facts), reason), skillsToHighlight[] (subset of the allowed list that this job wants), overallNote.`,
    };
  },

  coverLetter(ctx: CoverLetterContext) {
    return {
      system: `You write a concise, specific cover letter (200-320 words). Avoid clichés and generic AI phrasing ("I am excited to apply", "team player", "fast-paced environment"). ${NO_FABRICATION} Use only the candidate details provided. ${JSON_ONLY}`,
      user: `Tone: ${ctx.tone}
Job: ${ctx.job.title} at ${ctx.job.company} (${ctx.job.location ?? ""})
Job description:\n"""\n${ctx.job.description.slice(0, 6000)}\n"""
Candidate summary: ${ctx.resumeSummary}
Relevant highlights: ${ctx.highlights.join("; ")}
Candidate current title: ${ctx.profile.currentTitle ?? ""}, years: ${ctx.profile.yearsExperience ?? ""}

Produce JSON: { "content": "<the letter as plain text with paragraph breaks>" }`,
    };
  },

  interviewQuestions(job: JobContext, profile: ProfileContext) {
    return {
      system: `You generate realistic interview questions grounded in a specific job. ${JSON_ONLY}`,
      user: `Job: ${job.title} at ${job.company}\nDescription:\n"""\n${job.description.slice(0, 8000)}\n"""\nCandidate: ${profile.currentTitle ?? "engineer"}, skills: ${profile.skills.join(", ")}\n\nProduce JSON with keys technical[], scenario[], behavioral[], hr[], jobSpecific[] — 3-5 questions each, specific to this job where possible.`,
    };
  },

  evaluateAnswer(question: string, answer: string, job: JobContext) {
    return {
      system: `You are an interview coach. Give direct, actionable feedback. ${NO_FABRICATION} The improved answer must only use facts from the candidate's answer. ${JSON_ONLY}`,
      user: `Role: ${job.title} at ${job.company}\nQuestion: ${question}\nCandidate answer:\n"""\n${answer.slice(0, 4000)}\n"""\n\nProduce JSON: feedback (specific, 2-4 sentences), improvedAnswer (a stronger version using ONLY the candidate's own facts; if facts are missing, insert a bracketed placeholder like "[add metric]"), score (0-100).`,
    };
  },

  skillGap(
    targetTitles: string[],
    freqs: { skill: string; count: number }[],
    userSkills: string[],
  ) {
    return {
      system: `You analyse skill gaps for a job seeker. ${JSON_ONLY}`,
      user: `Target roles: ${targetTitles.join(", ")}\nSkill demand across matching jobs (skill: count): ${freqs
        .map((f) => `${f.skill}:${f.count}`)
        .join(
          ", ",
        )}\nCandidate's current skills: ${userSkills.join(", ")}\n\nProduce JSON: topSkills[] (skill, demand 0-100 relative, haveIt boolean), summary (2-3 sentences on what to learn next and why).`,
    };
  },
};
