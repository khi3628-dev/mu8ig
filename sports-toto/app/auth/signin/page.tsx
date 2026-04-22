import Link from "next/link";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-1">로그인</h1>
      <p className="text-sm text-(--muted-foreground) mb-6">
        계정이 없다면{" "}
        <Link href="/auth/signup" className="underline">
          회원가입
        </Link>{" "}
        하세요.
      </p>
      <SignInForm callbackUrl={sp.callbackUrl} initialError={sp.error} />
    </div>
  );
}
