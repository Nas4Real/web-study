import { Bell, HardDrive, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/server/auth/auth-actions";
import type { SettingsPageData } from "@/server/study/settings-page-loader";

import { SettingsProfileForm } from "./settings-profile-form";
import { SettingsSubjectForm } from "./settings-subject-form";

function SettingsRow({
  action,
  description,
  icon: Icon,
  title,
}: {
  action: React.ReactNode;
  description: string;
  icon: typeof Bell;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border-panel bg-card-hover text-text-muted">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SettingsPage({ data }: Readonly<{ data: SettingsPageData }>) {
  const usedMegabytes = Math.round(data.storageUsedBytes / 1_000_000);
  const usedPercent = data.storageQuotaBytes > 0
    ? Math.min(100, Math.round((data.storageUsedBytes / data.storageQuotaBytes) * 100))
    : 0;

  return (
    <div className="min-h-full overflow-y-auto">
      <header className="border-b border-border-panel px-4 py-7 sm:px-8">
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Manage your account preferences and configurations.</p>
      </header>
      <div className="mx-auto max-w-3xl space-y-9 px-4 py-8 sm:px-6">
        {data.errorCode ? (
          <p className="rounded-lg border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300" role="alert">
            Settings are temporarily unavailable. Refresh the page or sign in again.
          </p>
        ) : null}

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">Profile</h2>
          <div className="rounded-xl border border-border-panel bg-card p-5 sm:p-6">
            <SettingsProfileForm displayName={data.displayName} email={data.email} />
          </div>
        </section>

        <section id="subjects">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">Subjects</h2>
          <div className="rounded-xl border border-border-panel bg-card p-5 sm:p-6">
            <div className="mb-5">
              <h3 className="text-sm font-bold">Your Subjects</h3>
              <p className="mt-1 text-sm text-text-muted">Subjects organize your tasks, calendar sessions, and documents.</p>
            </div>
            <SettingsSubjectForm subjects={data.subjects} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">Security</h2>
          <div className="rounded-xl border border-border-panel bg-card">
            <SettingsRow
              action={<Link className="rounded-full border border-border-hover px-4 py-2 text-sm font-bold" href="/forgot-password">Update Password</Link>}
              description="Update your password to keep your account secure from unauthorized access."
              icon={ShieldCheck}
              title="Change Password"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-text-muted">Preferences</h2>
          <div className="divide-y divide-border-panel rounded-xl border border-border-panel bg-card">
            <SettingsRow
              action={<button aria-label="Notification preferences are not available yet" className="rounded-full border border-border-hover px-5 py-2 text-sm font-bold" disabled type="button">Manage</button>}
              description="Choose what updates you want to receive about your tasks and events."
              icon={Bell}
              title="Notification Preferences"
            />
            <div className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border-panel bg-card-hover text-text-muted">
                  <HardDrive aria-hidden="true" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold">Storage Usage</h3>
                      <p className="mt-1 text-sm text-text-muted">Manage files, documents, and attachments stored in your account.</p>
                    </div>
                    <span className="rounded-lg border border-border-panel bg-panel px-3 py-1.5 text-sm font-bold">{usedMegabytes} MB / 2 GB</span>
                  </div>
                  <div aria-label={`${usedPercent}% storage used`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={usedPercent} className="mt-4 h-2 overflow-hidden rounded-full bg-border-panel" role="progressbar">
                    <div className="h-full rounded-full bg-white" style={{ width: `${usedPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-red-400">Danger Zone</h2>
          <div className="divide-y divide-red-900/50 overflow-hidden rounded-xl border border-red-900/60 bg-red-950/10">
            <SettingsRow
              action={<form action={signOutAction}><button className="rounded-full border border-red-800 bg-red-950/40 px-5 py-2 text-sm font-bold text-red-400" type="submit">Sign Out</button></form>}
              description="Sign out of your account on this device safely."
              icon={LogOut}
              title="Sign Out"
            />
            <SettingsRow
              action={<button aria-label="Account deletion is not available yet" className="rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white" disabled type="button">Delete Account</button>}
              description="Permanently delete your account and all associated data. Confirmation is required."
              icon={Trash2}
              title="Delete Account"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
