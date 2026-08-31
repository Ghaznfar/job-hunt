import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Authenticated passthrough for privately-stored files (local storage driver).
 * The caller must own a Resume that references the requested key.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { key: parts } = await ctx.params;
  const key = decodeURIComponent(parts.join("/"));

  const owned = await prisma.resume.findFirst({
    where: { fileKey: key, userId: session.user.id },
    select: { id: true, fileType: true },
  });
  if (!owned) return new NextResponse("Not found", { status: 404 });

  try {
    const bytes = await getStorage().getBytes(key);
    const contentType =
      owned.fileType === "PDF"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="cv.${owned.fileType?.toLowerCase() ?? "bin"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
