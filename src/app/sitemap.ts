import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "http://localhost:3000";
  const routes = [
    "",
    "/features",
    "/how-it-works",
    "/pricing",
    "/faq",
    "/about",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
    "/login",
    "/signup",
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
