import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { Avatar } from "@/app/(app)/_components/avatar";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export default async function UserSettingsPage() {
  const { userId } = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      timezone: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to projects
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <Avatar user={user} size={48} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-medium">Profile</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your name, avatar, and timezone.
          </p>
        </div>
        <ProfileForm
          initial={{
            name: user.name,
            avatarUrl: user.avatarUrl ?? "",
            timezone: user.timezone,
          }}
          email={user.email}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-medium">Password</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Change your password. You&apos;ll stay signed in on this device.
          </p>
        </div>
        <PasswordForm />
      </section>
    </div>
  );
}
