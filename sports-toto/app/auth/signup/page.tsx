import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-1">회원가입</h1>
      <p className="text-sm text-(--muted-foreground) mb-6">
        이미 계정이 있다면{" "}
        <Link href="/auth/signin" className="underline">
          로그인
        </Link>{" "}
        하세요. 만 18세 이상만 가입 가능합니다.
      </p>
      <SignUpForm />
    </div>
  );
}
