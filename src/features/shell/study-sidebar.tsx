"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BarChart2,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronsUpDown,
  Database,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  SquareCheckBig,
  X,
} from "lucide-react";

import { signOutAction } from "@/server/auth/auth-actions";
import { NavigationSearch } from "./navigation-search";

const navigation = [
  {
    label: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
      { id: "planning", label: "Planning", href: "/calendar", icon: CalendarDays },
      { id: "tasks", label: "Tasks", href: "/tasks", icon: SquareCheckBig },
      { id: "tutor", label: "AI Tutor", href: "#ai-tutor", icon: Bot },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "documents", label: "Documents", href: "/documents", icon: FileText },
      { id: "knowledge", label: "Knowledge Base", href: "#knowledge-base", icon: Database },
      { id: "statistics", label: "Statistiques", href: "#statistics", icon: BarChart2 },
    ],
  },
] as const;

export function StudySidebar({
  displayName,
  email,
}: Readonly<{ displayName: string; email: string }>) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = displayName.trim().charAt(0).toUpperCase() || email.trim().charAt(0).toUpperCase() || "?";
  const activeItem = pathname.startsWith("/calendar")
    ? "planning"
    : pathname.startsWith("/tasks")
      ? "tasks"
      : pathname.startsWith("/documents")
        ? "documents"
        : pathname.startsWith("/settings")
          ? "settings"
          : "dashboard";

  const mobileDestinations = [
    navigation[0].items[0],
    navigation[0].items[1],
    navigation[0].items[2],
    navigation[1].items[0],
  ] as const;

  return (
    <>
      <header className="sticky top-3 z-40 flex min-h-14 items-center gap-3 rounded-xl border border-border-panel bg-base/95 px-3 shadow-xl backdrop-blur lg:hidden">
        <Link aria-label="Web Study dashboard" className="grid size-8 shrink-0 place-items-center rounded bg-zinc-100 text-panel" href="/">
          <BookOpen aria-hidden="true" size={16} />
        </Link>
        <div className="min-w-0 flex-1"><NavigationSearch compact /></div>
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border-base bg-card text-text-secondary"
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          {mobileOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
        </button>
        {mobileOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-xl border border-border-panel bg-card p-2 shadow-2xl">
            <nav aria-label="Mobile primary navigation" className="grid gap-1">
              {mobileDestinations.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeItem;
                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${isActive ? "bg-card-hover text-white" : "text-text-muted"}`}
                    href={item.href}
                    key={item.id}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon aria-hidden="true" size={17} />{item.label}
                  </Link>
                );
              })}
              <Link className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${activeItem === "settings" ? "bg-card-hover text-white" : "text-text-muted"}`} href="/settings" onClick={() => setMobileOpen(false)}>
                <Settings aria-hidden="true" size={17} />Settings
              </Link>
            </nav>
            <div className="mt-2 flex items-center gap-3 border-t border-border-panel px-3 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded bg-physics text-xs font-bold text-[#07110a]">{initial}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-text-secondary">{displayName || "Student"}</span>
                <span className="block truncate text-[10px] text-text-tertiary">{email}</span>
              </span>
              <form action={signOutAction}><button className="text-xs font-semibold text-red-400" type="submit">Sign Out</button></form>
            </div>
          </div>
        ) : null}
      </header>
    <aside className="sticky top-3 hidden h-[calc(100vh-24px)] w-60 shrink-0 flex-col py-2 lg:flex">
      <div className="mb-[18px] flex h-9 items-center gap-3 px-4">
        <span className="grid size-6 place-items-center rounded bg-zinc-100 text-panel">
          <BookOpen aria-hidden="true" size={14} />
        </span>
        <span className="text-sm font-bold tracking-[-0.02em] text-white">Web Study</span>
      </div>

      <div className="mb-[22px] px-3">
        <NavigationSearch />
      </div>

      <nav aria-label="Primary navigation" className="flex min-h-0 flex-1 flex-col gap-[22px] px-2">
        {navigation.map((section) => (
          <div className="flex flex-col gap-0.5" key={section.label}>
            <p className="mb-[5px] px-2 text-[9px] font-bold uppercase leading-3 tracking-[0.14em] text-text-disabled">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeItem;
              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-8 items-center gap-[11px] rounded-md px-2.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-card-hover text-white"
                      : "text-text-muted hover:bg-card hover:text-text-secondary"
                  }`}
                  href={item.href}
                  key={item.id}
                >
                  <Icon aria-hidden="true" size={15} />
                  <span>{item.label}</span>
                  {isActive ? <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-white" /> : null}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-0.5">
          <p className="mb-[5px] px-2 text-[9px] font-bold uppercase leading-3 tracking-[0.14em] text-text-disabled">
            System
          </p>
          <Link
            aria-current={activeItem === "settings" ? "page" : undefined}
            className={`flex h-8 items-center gap-[11px] rounded-md px-2.5 text-[13px] font-medium transition-colors ${
              activeItem === "settings"
                ? "bg-card-hover text-white"
                : "text-text-muted hover:bg-card hover:text-text-secondary"
            }`}
            href="/settings"
          >
            <Settings aria-hidden="true" size={15} />
            <span>Settings</span>
            {activeItem === "settings" ? <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-white" /> : null}
          </Link>
        </div>
      </nav>

      <div className="relative mt-2.5 px-2">
        {profileOpen ? (
          <div
            aria-label="Profile menu"
            className="absolute bottom-14 left-2 right-2 overflow-hidden rounded-lg border border-border-panel bg-card shadow-2xl"
            role="menu"
          >
            <div className="border-b border-border-panel p-3">
              <p className="truncate text-xs font-semibold text-text-secondary">{displayName || "Student"}</p>
              <p className="mt-0.5 truncate text-[10px] text-text-tertiary">{email}</p>
            </div>
            <Link className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-text-muted hover:bg-card-hover hover:text-white" href="/settings" role="menuitem">
              <Settings aria-hidden="true" size={14} />
              Profile &amp; Settings
            </Link>
            <form action={signOutAction}>
              <button className="flex w-full items-center gap-2 border-t border-border-panel px-3 py-3 text-left text-xs font-semibold text-red-400 hover:bg-red-950/30" role="menuitem" type="submit">
                Sign Out
              </button>
            </form>
          </div>
        ) : null}
        <button
          aria-expanded={profileOpen}
          aria-label="Open profile menu"
          className="flex h-12 w-full items-center rounded-lg border border-border-base bg-[#0a0a0c] p-2 text-left"
          onClick={() => setProfileOpen((open) => !open)}
          type="button"
        >
          <span className="grid size-7 place-items-center rounded bg-physics text-xs font-bold text-[#07110a]">{initial}</span>
          <span className="ml-2.5 min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold leading-[14px] text-text-secondary">{displayName || "Student"}</span>
            <span className="block truncate text-[10px] font-medium leading-[13px] text-text-tertiary">{email}</span>
          </span>
          <ChevronsUpDown aria-hidden="true" className="text-text-tertiary" size={14} />
        </button>
      </div>
    </aside>
    </>
  );
}
