"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "@/components/common/logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="md:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-full max-w-[17rem] translate-x-0 translate-y-0 rounded-none border-r p-4 sm:rounded-none">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="mb-6">
          <Logo href="/dashboard" />
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
