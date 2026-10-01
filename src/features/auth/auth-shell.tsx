import { GraduationCap, Star, UserRound } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen overflow-hidden bg-base text-text">
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border-panel bg-panel p-12 lg:flex xl:p-16">
        <div aria-hidden="true" className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom_right,white_30%,transparent_90%)]" />
        <div aria-hidden="true" className="absolute -left-[10%] -top-[10%] size-[60%] rounded-full bg-analysis opacity-15 blur-[140px]" />
        <div aria-hidden="true" className="absolute bottom-[10%] right-[10%] size-[50%] rounded-full bg-algebra opacity-10 blur-[120px]" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-white text-black shadow-xl">
            <GraduationCap aria-hidden="true" size={26} />
          </span>
          <span className="text-[22px] font-bold tracking-tight">Web Study</span>
        </div>

        <div className="relative z-10 mb-10 max-w-[560px]">
          <h1 className="text-[42px] font-bold leading-[1.08] tracking-tight xl:text-[48px]">
            Master your academic schedule with quiet precision.
          </h1>
          <div className="mt-8 flex items-center gap-5">
            <div aria-hidden="true" className="flex -space-x-4">
              {["bg-zinc-100", "bg-zinc-200", "bg-zinc-300"].map((tone) => (
                <span className={`grid size-12 place-items-center rounded-full border-[3px] border-panel text-black ${tone}`} key={tone}>
                  <UserRound size={25} strokeWidth={1.7} />
                </span>
              ))}
            </div>
            <div>
              <div aria-label="Rated five stars" className="flex items-center gap-1 text-yellow-500">
                {Array.from({ length: 5 }, (_, index) => <Star aria-hidden="true" className="fill-current" key={index} size={16} />)}
              </div>
              <p className="mt-1 text-sm font-medium text-text-muted">Trusted by 10,000+ students globally</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-w-0 flex-1 flex-col items-center justify-center bg-base px-4 py-8 sm:px-8 lg:p-12">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <span className="grid size-12 place-items-center rounded-xl bg-white text-black shadow-lg">
            <GraduationCap aria-hidden="true" size={24} />
          </span>
          <span className="text-[22px] font-bold tracking-tight">Web Study</span>
        </div>
        {children}
        <p className="mt-9 max-w-[360px] text-center text-xs leading-relaxed text-text-tertiary">
          By continuing, you agree to our <a className="text-text-secondary underline underline-offset-4 hover:text-white" href="#terms">Terms of Service</a> and <a className="text-text-secondary underline underline-offset-4 hover:text-white" href="#privacy">Privacy Policy</a>.
        </p>
      </section>
    </main>
  );
}
