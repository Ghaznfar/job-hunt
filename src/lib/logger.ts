import pino from "pino";

/**
 * Structured JSON logging.
 *
 * Rules:
 *  - Never log raw CV text, parsed resume content, passwords, tokens or full
 *    personal-information payloads. Log identifiers and counts instead.
 *  - `redact` below is a defensive backstop for accidental leakage.
 */

const redactPaths = [
  "password",
  "hashedPassword",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "rawText",
  "cvText",
  "resumeText",
  "content",
  "*.password",
  "*.hashedPassword",
  "*.token",
  "*.rawText",
];

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  redact: { paths: redactPaths, censor: "[redacted]" },
  base: { service: "jobhunt" },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service" },
      },
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
