import type { DashboardTone } from "@/domain/dto";

export const toneStyles: Record<DashboardTone, { accent: string; badge: string; icon: string }> = {
  algebra: {
    accent: "text-algebra",
    badge: "bg-algebra/20 text-algebra",
    icon: "bg-algebra/10 text-algebra",
  },
  analysis: {
    accent: "text-analysis",
    badge: "bg-analysis/20 text-analysis",
    icon: "bg-analysis/10 text-analysis",
  },
  physics: {
    accent: "text-physics",
    badge: "bg-physics/20 text-physics",
    icon: "bg-physics/10 text-physics",
  },
  mechanics: {
    accent: "text-mechanics",
    badge: "bg-mechanics/20 text-mechanics",
    icon: "bg-mechanics/10 text-mechanics",
  },
  method: {
    accent: "text-method",
    badge: "bg-method/20 text-method",
    icon: "bg-method/10 text-method",
  },
};
