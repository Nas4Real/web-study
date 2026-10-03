"use client";

import { X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";

interface ModalFrameProps {
  children: ReactNode;
  footer?: ReactNode;
  labelId: string;
  onClose: () => void;
  widthClass?: string;
}

export function ModalFrame({ children, footer, labelId, onClose, widthClass = "max-w-[600px]" }: ModalFrameProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeFromEffect = useEffectEvent(() => onClose());

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return;

    // Isolate siblings at each ancestor level without making this dialog inert.
    // Preserve pre-existing isolation so nested dialogs can restore their parent.
    const isolated: Array<{ element: HTMLElement; inert: boolean }> = [];
    let branch: HTMLElement = overlay;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          isolated.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog || dialog.closest("[inert]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeFromEffect();
      } else if (event.key === "Tab") {
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]',
        )).filter(element => element.tabIndex >= 0 && !element.matches(":disabled") &&
          !element.closest("[inert]") && element.getClientRects().length > 0);
        const current = focusable.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey
          ? (current <= 0 ? focusable.length - 1 : current - 1)
          : (current + 1) % focusable.length;
        event.preventDefault();
        (focusable[next] ?? dialog).focus();
      }
    }

    function keepFocusInside(event: FocusEvent) {
      if (dialog && !dialog.closest("[inert]") && !dialog.contains(event.target as Node)) {
        closeRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", keepFocusInside);
      for (const { element, inert } of isolated) element.inert = inert;
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" ref={overlayRef}>
      <section
        aria-labelledby={labelId}
        aria-modal="true"
        className={`relative my-auto w-full overflow-hidden rounded-2xl border border-border-hover bg-card shadow-2xl ${widthClass}`}
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
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
