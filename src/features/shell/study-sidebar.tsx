"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BookOpen,
  CalendarDays,
  ChevronsUpDown,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Settings,
  SquareCheckBig,
  X,
} from "lucide-react";

import { signOutAction } from "@/server/auth/auth-actions";
import { NavigationSearch } from "./navigation-search";

const navigation = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "planning", label: "Calendar", href: "/calendar", icon: CalendarDays },
  { id: "documents", label: "Documents", href: "/documents", icon: FolderOpen },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: SquareCheckBig },
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
              {navigation.map((item) => {
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
      <aside className="sticky top-3 hidden h-[calc(100vh-24px)] w-[260px] shrink-0 flex-col justify-between px-5 py-8 lg:flex">
        <div className="flex flex-col gap-10">
          <Link className="flex items-center gap-3 px-2 text-white" href="/">
            <span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-lg font-bold text-black">G</span>
            <span className="text-[22px] font-bold tracking-tight">GetStudy</span>
          </Link>

          <nav aria-label="Primary navigation" className="flex flex-col gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeItem;
              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3.5 rounded-[14px] border px-4 py-3.5 text-[15px] font-semibold transition-all ${
                    isActive
                      ? "border-border-panel bg-card-hover text-white shadow-sm"
                      : "border-transparent text-zinc-400 hover:bg-card hover:text-zinc-200"
                  }`}
                  href={item.href}
                  key={item.id}
                >
                  <Icon aria-hidden="true" className={isActive ? "text-white" : "text-zinc-500"} size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-6">
          <nav aria-label="Secondary navigation" className="flex flex-col gap-1 border-b border-border-panel pb-6">
            <Link
              aria-current={activeItem === "settings" ? "page" : undefined}
              className={`flex items-center gap-3.5 rounded-[14px] px-4 py-3 text-[15px] font-semibold transition-colors ${
                activeItem === "settings"
                  ? "bg-card-hover text-white"
                  : "text-zinc-400 hover:bg-card hover:text-zinc-200"
              }`}
              href="/settings"
            >
              <Settings
                aria-hidden="true"
                className={activeItem === "settings" ? "text-white" : "text-zinc-500"}
                size={20}
              />
              <span>Settings</span>
            </Link>
            <a
              className="flex items-center gap-3.5 rounded-[14px] px-4 py-3 text-[15px] font-semibold text-zinc-400 transition-colors hover:bg-card hover:text-zinc-200"
              href="#support"
            >
              <HelpCircle aria-hidden="true" className="text-zinc-500" size={20} />
              <span>Support</span>
            </a>
          </nav>

          <div className="relative">
            {profileOpen ? (
              <div
                aria-label="Profile menu"
                className="absolute bottom-[76px] left-0 right-0 overflow-hidden rounded-2xl border border-border-panel bg-card shadow-2xl"
                role="menu"
              >
                <div className="border-b border-border-panel p-3">
                  <p className="truncate text-xs font-semibold text-text-secondary">{displayName || "Student"}</p>
                  <p className="mt-0.5 truncate text-[10px] text-text-tertiary">{email}</p>
                </div>
                <Link
                  className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-text-muted hover:bg-card-hover hover:text-white"
                  href="/settings"
                  role="menuitem"
                >
                  <Settings aria-hidden="true" size={14} />
                  Profile &amp; Settings
                </Link>
                <form action={signOutAction}>
                  <button
                    className="flex w-full items-center gap-2 border-t border-border-panel px-3 py-3 text-left text-xs font-semibold text-red-400 hover:bg-red-950/30"
                    role="menuitem"
                    type="submit"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            ) : null}
            <button
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
              className="group flex w-full items-center justify-between overflow-hidden rounded-2xl border border-border-panel bg-card p-3.5 text-left shadow-sm transition-colors hover:border-zinc-600"
              onClick={() => setProfileOpen((open) => !open)}
              type="button"
            >
              <span className="flex min-w-0 flex-1 items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-border-panel bg-zinc-200 text-sm font-bold text-black transition-colors group-hover:border-zinc-400">
                  {initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{displayName || "Student"}</span>
                  <span className="block truncate text-xs font-medium text-zinc-500">{email}</span>
                </span>
              </span>
              <ChevronsUpDown aria-hidden="true" className="ml-auto shrink-0 text-zinc-600 transition-colors group-hover:text-white" size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
