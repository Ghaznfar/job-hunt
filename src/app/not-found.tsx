import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-primary text-sm font-semibold">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
