import { Suspense } from "react";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-(--muted-foreground)">로딩…</div>}>
      <SignupForm />
    </Suspense>
  );
}
