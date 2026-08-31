import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env, adminEmails, isGoogleAuthConfigured } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }
  interface User {
    role?: "USER" | "ADMIN";
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase().trim();

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.hashedPassword || user.disabledAt) return null;

      const ok = await verifyPassword(parsed.data.password, user.hashedPassword);
      if (!ok) return null;

      if (!user.emailVerified) {
        // Surface a specific reason to the sign-in page.
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
    },
  }),
];

if (isGoogleAuthConfigured) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  secret: env.AUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.uid = user.id;
        token.role = (user.role as "USER" | "ADMIN") ?? "USER";
      }
      // Keep role fresh on session refresh / admin promotion.
      if (trigger === "update" || (token.uid && !token.role)) {
        const db = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, disabledAt: true },
        });
        token.role = db?.role ?? "USER";
        token.disabled = Boolean(db?.disabledAt);
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      return session;
    },
    async signIn({ user, account }) {
      // Promote configured admin emails on every sign-in.
      const email = user.email?.toLowerCase();
      if (email && adminEmails.has(email)) {
        await prisma.user
          .update({ where: { email }, data: { role: "ADMIN" } })
          .catch(() => undefined);
      }
      // OAuth sign-ins are considered verified; ensure a subscription row exists.
      if (account?.provider === "google" && user.id) {
        await prisma.user
          .update({
            where: { id: user.id },
            data: {
              emailVerified: new Date(),
              subscription: { connectOrCreate: { where: { userId: user.id }, create: {} } },
              profile: { connectOrCreate: { where: { userId: user.id }, create: {} } },
            },
          })
          .catch((e) => logger.warn({ err: String(e) }, "post-oauth provisioning failed"));
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.subscription
        .create({ data: { userId: user.id } })
        .catch(() => undefined);
    },
  },
});
