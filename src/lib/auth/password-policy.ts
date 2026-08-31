import { z } from "zod";

/**
 * Client-safe password policy helpers. No Node crypto / bcrypt imports here so
 * this module can be pulled into client bundles cheaply.
 */

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Password must contain a letter and a number",
  });

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}
