import { LogoMark } from "@/app/(app)/_components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 bg-muted/40">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex text-primary">
            <LogoMark size={48} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-augmented project management
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
