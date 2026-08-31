import type { CandidateInput, JobInput, SkillScore, WorkAuthStatus } from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// ---------------------------------------------------------------------------
// Technical fit
// ---------------------------------------------------------------------------

export function scoreTechnical(candidate: CandidateInput, job: JobInput) {
  const required = job.requiredSkillSlugs;
  const preferred = job.preferredSkillSlugs.filter(
    (p) => !required.some((r) => r.slug === p.slug),
  );

  const skillScores: SkillScore[] = [];
  const add = (list: typeof required, importance: "REQUIRED" | "PREFERRED") => {
    for (const s of list) {
      const have = candidate.skillSlugs.has(s.slug);
      skillScores.push({ slug: s.slug, name: s.name, importance, have, score: have ? 100 : 0 });
    }
  };
  add(required, "REQUIRED");
  add(preferred, "PREFERRED");

  if (skillScores.length === 0) {
    return {
      score: 70,
      skillScores,
      strongMatches: [] as string[],
      missingSkills: [] as string[],
      note: "The posting lists no specific technical skills to match against.",
    };
  }

  const W_REQ = 2;
  const W_PREF = 1;
  let weightSum = 0;
  let scoreSum = 0;
  for (const s of skillScores) {
    const w = s.importance === "REQUIRED" ? W_REQ : W_PREF;
    weightSum += w;
    scoreSum += w * s.score;
  }
  const score = clamp(scoreSum / weightSum);

  const strongMatches = skillScores.filter((s) => s.have).map((s) => s.name);
  const missingSkills = [
    ...skillScores.filter((s) => !s.have && s.importance === "REQUIRED").map((s) => s.name),
    ...skillScores.filter((s) => !s.have && s.importance === "PREFERRED").map((s) => s.name),
  ];

  const missingRequired = skillScores.filter((s) => !s.have && s.importance === "REQUIRED").length;
  const note =
    missingRequired === 0
      ? "You have every required skill listed."
      : `Missing ${missingRequired} required skill${missingRequired > 1 ? "s" : ""}.`;

  return { score, skillScores, strongMatches, missingSkills, note };
}

// ---------------------------------------------------------------------------
// Experience fit
// ---------------------------------------------------------------------------

export function scoreExperience(candidate: CandidateInput, job: JobInput) {
  const years = candidate.yearsExperience;
  const min = job.minYearsRequired;
  const max = job.maxYearsRequired ?? (min != null ? min + 3 : null);

  if (min == null) {
    return { score: years == null ? 70 : 80, note: "No explicit experience requirement stated." };
  }
  if (years == null) {
    return { score: 55, note: "Add your years of experience to your profile for an accurate score." };
  }
  if (years >= min && (max == null || years <= max)) {
    return { score: 100, note: `Your ${years} years is within the required ${min}${max ? `–${max}` : "+"} years.` };
  }
  if (years < min) {
    const gap = min - years;
    return {
      score: clamp(100 - gap * 22),
      note: `You have ${years} years; the role asks for ${min}${max ? `–${max}` : "+"}. ${gap} year${gap > 1 ? "s" : ""} short.`,
    };
  }
  // Over the stated max
  const over = years - (max as number);
  return {
    score: clamp(100 - over * 5, 70),
    note: `You have ${years} years, above the stated ${max}. Likely fine, possibly over-levelled.`,
  };
}

// ---------------------------------------------------------------------------
// Location fit
// ---------------------------------------------------------------------------

export function scoreLocation(candidate: CandidateInput, job: JobInput) {
  const isTarget = candidate.targetCountries.includes(job.country);
  const sameCountry = candidate.country === job.country;
  const arr = job.workArrangement;

  let score: number;
  let note: string;

  if (arr === "REMOTE") {
    score = isTarget || sameCountry ? 100 : 80;
    note = isTarget
      ? "Remote role in one of your target countries."
      : "Remote role, though not in a country you've targeted.";
  } else if (arr === "UNKNOWN") {
    score = isTarget ? 70 : 45;
    note = "Work arrangement isn't stated — confirm whether remote is an option.";
  } else {
    // HYBRID or ONSITE
    if (sameCountry) {
      score = arr === "HYBRID" ? 90 : 85;
      note = `${arr === "HYBRID" ? "Hybrid" : "On-site"} role in your country.`;
    } else if (isTarget) {
      score = 40;
      note = `${arr === "HYBRID" ? "Hybrid" : "On-site"} in a target country — you'd need to relocate.`;
    } else {
      score = 20;
      note = `${arr === "HYBRID" ? "Hybrid" : "On-site"} and not in a country you've targeted.`;
    }
  }

  if (candidate.workPreference === "REMOTE" && (arr === "ONSITE" || arr === "HYBRID")) {
    score = Math.min(score, arr === "ONSITE" ? 45 : 65);
    note += " You've set your preference to remote.";
  }

  return { score: clamp(score), note };
}

// ---------------------------------------------------------------------------
// Salary fit
// ---------------------------------------------------------------------------

export function scoreSalary(candidate: CandidateInput, job: JobInput) {
  const want = candidate.salaryExpectation;
  const offer = job.salaryMax ?? job.salaryMin;
  if (!want || !offer) {
    return { score: 75, note: "Not enough salary information to compare." };
  }
  if (candidate.salaryCurrency && job.salaryCurrency && candidate.salaryCurrency !== job.salaryCurrency) {
    return {
      score: 70,
      note: `Salary is in ${job.salaryCurrency}; your expectation is in ${candidate.salaryCurrency}. Compare manually.`,
    };
  }
  if (offer >= want) return { score: 100, note: "The salary range meets or exceeds your expectation." };
  const ratio = offer / want;
  if (ratio >= 0.85) {
    return { score: clamp(70 + (ratio - 0.85) * 200), note: "Slightly below your expectation but negotiable." };
  }
  return { score: clamp(Math.max(20, ratio * 100)), note: "The salary is meaningfully below your expectation." };
}

// ---------------------------------------------------------------------------
// Seniority fit
// ---------------------------------------------------------------------------

const RANK: Record<string, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  staff: 4,
  principal: 5,
};

function candidateRank(candidate: CandidateInput): number {
  const t = (candidate.currentTitle ?? "").toLowerCase();
  if (/principal/.test(t)) return 5;
  if (/staff|lead|head of/.test(t)) return 4;
  if (/senior|sr\.?/.test(t)) return 3;
  if (/junior|jr\.?|graduate|intern/.test(t)) return 1;
  const y = candidate.yearsExperience;
  if (y == null) return 2;
  if (y < 2) return 1;
  if (y < 5) return 2;
  if (y < 9) return 3;
  return 4;
}

export function scoreSeniority(candidate: CandidateInput, job: JobInput) {
  if (!job.seniorityLevel || !(job.seniorityLevel in RANK)) {
    return { score: 80, note: "Seniority level not clearly stated." };
  }
  const jobRank = RANK[job.seniorityLevel];
  const userRank = candidateRank(candidate);
  const diff = jobRank - userRank;
  if (diff === 0) return { score: 100, note: "Your level matches the role." };
  if (diff === -1) return { score: 85, note: "You're slightly above this level — usually fine." };
  if (diff <= -2) return { score: 72, note: "You're well above this level; it may feel like a step back." };
  if (diff === 1) return { score: 68, note: "This is one level above where you are now — a stretch." };
  return { score: 38, note: "This role is well above your current level." };
}

// ---------------------------------------------------------------------------
// Eligibility fit (work authorization + visa sponsorship)
// ---------------------------------------------------------------------------

export function scoreEligibility(candidate: CandidateInput, job: JobInput) {
  const status: WorkAuthStatus = candidate.workAuthorizations[job.country] ?? "UNKNOWN";
  const sponsor = job.sponsorshipAvailable;
  const explicitlyRequiresAuth = job.requiresWorkAuthorization.includes(job.country);

  const flags = {
    sponsorshipBlocked: false,
    notWorkAuthorized: false,
    eligibilityUncertain: false,
  };

  let score: number;
  let note: string;

  if (status === "CITIZEN" || status === "PERMANENT_RESIDENT" || status === "VISA_HOLDER") {
    score = 100;
    note = "You're authorized to work in this country without sponsorship.";
  } else if (status === "NEEDS_SPONSORSHIP" || candidate.needsSponsorship) {
    if (sponsor === "YES") {
      score = 75;
      note = "You'd need sponsorship, and the employer says it's available.";
    } else if (sponsor === "NO") {
      score = 5;
      note = "You'd need sponsorship, but the posting says it isn't offered.";
      flags.sponsorshipBlocked = true;
    } else {
      score = 35;
      note = "You'd need sponsorship and the posting doesn't say whether it's available — verify before applying.";
      flags.eligibilityUncertain = true;
    }
  } else if (status === "NONE") {
    if (sponsor === "YES") {
      score = 45;
      note = "You're not currently authorized here; sponsorship is offered but this is a significant hurdle.";
    } else if (sponsor === "NO") {
      score = 3;
      note = "You're not authorized to work here and no sponsorship is offered.";
      flags.notWorkAuthorized = true;
      flags.sponsorshipBlocked = true;
    } else {
      score = 18;
      note = "You're not authorized to work here and sponsorship status is unclear.";
      flags.notWorkAuthorized = true;
      flags.eligibilityUncertain = true;
    }
  } else {
    // UNKNOWN status
    score = explicitlyRequiresAuth ? 45 : 65;
    note = "Set your work authorization for this country in your profile for an accurate check.";
    flags.eligibilityUncertain = true;
  }

  if (explicitlyRequiresAuth && score < 60) {
    note += " The posting explicitly requires local work authorization.";
  }

  return { score: clamp(score), note, flags };
}
