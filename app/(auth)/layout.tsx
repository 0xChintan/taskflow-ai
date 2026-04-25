export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 bg-muted/40">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md text-lg font-bold">
            T
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
          <p className="text-sm text-muted-foreground">
            AI-augmented project management
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
