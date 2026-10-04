"use client";

import { X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";

interface ModalFrameProps {
  children: ReactNode;
  footer?: ReactNode;
  labelId: string;
  onClose: () => void;
  widthClass?: string;
  panelClass?: string;
  footerClass?: string;
  closeClass?: string;
  overlayClass?: string;
  closeDisabled?: boolean;
  descriptionId?: string;
}

const openDialogs: HTMLElement[] = [];
const isolation = new Map<HTMLElement, { count: number; original: boolean }>();
let scrollLocks = 0;
let originalOverflow = "";

export function ModalFrame({ children, footer, labelId, onClose, closeDisabled = false, descriptionId, widthClass = "max-w-[600px]", panelClass = "rounded-2xl shadow-2xl border-border-hover bg-card", footerClass = "border-border-panel bg-panel/50 px-6 py-4", closeClass = "right-5 top-5 size-10 border-border-panel bg-card-hover text-text-muted", overlayClass = "bg-black/80 p-4 backdrop-blur-sm" }: ModalFrameProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeFromEffect = useEffectEvent(() => onClose());

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return;
    openDialogs.push(dialog);

    // Isolate siblings at each ancestor level without making this dialog inert.
    // Preserve pre-existing isolation so nested dialogs can restore their parent.
    const isolated: HTMLElement[] = [];
    let branch: HTMLElement = overlay;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          isolated.push(sibling);
          const state = isolation.get(sibling);
          if (state) state.count += 1;
          else isolation.set(sibling, { count: 1, original: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    if (scrollLocks++ === 0) originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog || openDialogs.at(-1) !== dialog || dialog.closest("[inert]")) return;
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
      if (dialog && openDialogs.at(-1) === dialog && !dialog.closest("[inert]") && !dialog.contains(event.target as Node)) {
        closeRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", keepFocusInside);
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      for (const element of isolated) {
        const state = isolation.get(element)!;
        if (--state.count === 0) {
          element.inert = state.original;
          isolation.delete(element);
        }
      }
      if (--scrollLocks === 0) document.body.style.overflow = originalOverflow;
      // A mutation may remove and recreate the same invoker while the dialog stays open.
      const returnTarget = previouslyFocused?.isConnected ? previouslyFocused :
        previouslyFocused?.id ? document.getElementById(previouslyFocused.id) : null;
      returnTarget?.focus();
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center overflow-y-auto ${overlayClass}`} ref={overlayRef}>
      <section
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-modal="true"
        className={`relative my-auto w-full overflow-hidden border ${panelClass} ${widthClass}`}
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          aria-label="Close dialog"
          disabled={closeDisabled}
          className={`absolute z-10 grid place-items-center rounded-lg border transition-colors hover:text-white ${closeClass}`}
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <X aria-hidden="true" size={19} />
        </button>
        {children}
        {footer ? <footer className={`flex items-center justify-end gap-3 border-t ${footerClass}`}>{footer}</footer> : null}
      </section>
    </div>
  );
}
