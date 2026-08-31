import {
  LayoutDashboard,
  Search,
  FileText,
  Target,
  Mail,
  MessagesSquare,
  KanbanSquare,
  TrendingUp,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/jobs", label: "Job Search", icon: Search },
  { href: "/dashboard/resumes", label: "CV / Resume", icon: FileText },
  { href: "/dashboard/match", label: "Match Analysis", icon: Target },
  { href: "/dashboard/cover-letters", label: "Cover Letters", icon: Mail },
  { href: "/dashboard/interviews", label: "Interview Prep", icon: MessagesSquare },
  { href: "/dashboard/applications", label: "Applications", icon: KanbanSquare },
  { href: "/dashboard/skill-gaps", label: "Skill Gaps", icon: TrendingUp },
];

export const dashboardSecondaryNav: NavItem[] = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
