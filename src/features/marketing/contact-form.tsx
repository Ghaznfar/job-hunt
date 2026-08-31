"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactAction } from "@/features/marketing/actions";

export function ContactForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await submitContactAction(fd);
      if (res.ok) setSent(true);
      else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  }

  if (sent) {
    return (
      <div className="bg-card rounded-xl border p-6 text-center">
        <p className="font-medium">Thanks — we&apos;ve got your message.</p>
        <p className="text-muted-foreground mt-1 text-sm">We&apos;ll get back to you by email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-card space-y-4 rounded-xl border p-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
        {errors.name ? <p className="text-destructive text-xs">{errors.name[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        {errors.email ? <p className="text-destructive text-xs">{errors.email[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={5} required />
        {errors.message ? <p className="text-destructive text-xs">{errors.message[0]}</p> : null}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Send message
      </Button>
    </form>
  );
}
