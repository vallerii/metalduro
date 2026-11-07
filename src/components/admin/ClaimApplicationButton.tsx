"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { claimApplicationAction, type AdminActionState } from "@/app/admin/actions";
import type { AdminCopy } from "@/content/admin";

const initialState: AdminActionState = { status: "idle" };

export function ClaimApplicationButton({ applicationId, copy }: { applicationId: string; copy: AdminCopy }) {
  const [state, action] = useActionState(claimApplicationAction, initialState);
  return (
    <form action={action} className="min-w-28">
      <input type="hidden" name="applicationId" value={applicationId} />
      <ClaimSubmit copy={copy} />
      {state.message ? (
        <p className="mt-2 max-w-56 text-[12px] leading-relaxed text-red-300" role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}

function ClaimSubmit({ copy }: { copy: AdminCopy }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-accent-deep disabled:cursor-wait disabled:opacity-50">
      {pending ? copy.list.taking : copy.list.take}
    </button>
  );
}
