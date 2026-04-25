import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Get started in less than a minute.
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted-foreground text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
