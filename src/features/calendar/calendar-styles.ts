import type { CalendarTone } from "@/domain/dto";

export const calendarToneStyles: Record<CalendarTone, { dot: string; text: string; border: string }> = {
  algebra: { dot: "bg-algebra", text: "text-algebra", border: "border-algebra/30" },
  analysis: { dot: "bg-analysis", text: "text-analysis", border: "border-analysis/30" },
  physics: { dot: "bg-physics", text: "text-physics", border: "border-physics/30" },
  mechanics: { dot: "bg-mechanics", text: "text-mechanics", border: "border-mechanics/30" },
  method: { dot: "bg-method", text: "text-method", border: "border-method/30" },
  languages: { dot: "bg-languages", text: "text-languages", border: "border-languages/30" },
};
