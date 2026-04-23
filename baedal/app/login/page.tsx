import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-(--muted-foreground)">로딩…</div>}>
      <LoginForm />
    </Suspense>
  );
}
