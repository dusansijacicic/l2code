import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 text-zinc-500">
          Učitavanje…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
