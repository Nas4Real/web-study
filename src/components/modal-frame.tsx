"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface ModalFrameProps {
  children: ReactNode;
  footer?: ReactNode;
  labelId: string;
  onClose: () => void;
  widthClass?: string;
}

export function ModalFrame({ children, footer, labelId, onClose, widthClass = "max-w-[600px]" }: ModalFrameProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <section
        aria-labelledby={labelId}
        aria-modal="true"
        className={`relative my-auto w-full overflow-hidden rounded-2xl border border-border-hover bg-card shadow-2xl ${widthClass}`}
        role="dialog"
      >
        <button
          aria-label="Close dialog"
          className="absolute right-5 top-5 z-10 grid size-10 place-items-center rounded-lg border border-border-panel bg-card-hover text-text-muted transition-colors hover:text-white"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <X aria-hidden="true" size={19} />
        </button>
        {children}
        {footer ? <footer className="flex items-center justify-end gap-3 border-t border-border-panel bg-panel/50 px-6 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
}
