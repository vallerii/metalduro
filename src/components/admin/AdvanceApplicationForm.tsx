"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { advanceApplicationAction, type AdminActionState } from "@/app/admin/actions";
import type { AdminCopy } from "@/content/admin";
import type { ApplicationStatus } from "@/content/account";

const initialState: AdminActionState = { status: "idle" };

export function AdvanceApplicationForm({ applicationId, expectedStatus, nextStep, copy }: { applicationId: string; expectedStatus: ApplicationStatus; nextStep: string; copy: AdminCopy }) {
  const [state, action] = useActionState(advanceApplicationAction, initialState);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(copy.actions.confirm)) event.preventDefault();
      }}
      className="rounded-3xl border border-accent/30 bg-accent/10 p-6 md:p-8"
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      <div className="label-mono text-muted">{copy.detail.transition}</div>
      <h2 className="mt-3 text-[28px] font-medium">{nextStep}</h2>
      <AdvanceSubmit copy={copy} />
      {state.message ? (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-[14px] text-red-200" role="alert">{state.message}</p>
      ) : null}
    </form>
  );
}

function AdvanceSubmit({ copy }: { copy: AdminCopy }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="mt-6 flex w-full items-center justify-between rounded-full bg-accent px-6 py-4 font-semibold text-ink transition-colors hover:bg-accent-deep disabled:cursor-wait disabled:opacity-50">
      <span>{pending ? copy.actions.advancing : copy.actions.advance}</span>
      <span aria-hidden>↗</span>
    </button>
  );
}
