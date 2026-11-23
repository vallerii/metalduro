"use client";

import { useFormStatus } from "react-dom";
import { clearCalculatorDraft } from "@/lib/calculator-draft";

export function HeaderSignOutButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="header-signout"
      disabled={pending}
      aria-label={label}
      onClick={() => clearCalculatorDraft(window.localStorage)}
    >
      {pending ? "…" : label}
    </button>
  );
}
