export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-augmented project management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
