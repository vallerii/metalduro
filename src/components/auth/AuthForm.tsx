"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { AuthCopy } from "@/content/auth";
import {
  forgotPasswordAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/app/auth/actions";
import type { AuthActionState } from "@/app/auth/actions";
import {
  AUTH_PANEL_CLASS,
  DEFAULT_AUTH_PANEL_HEIGHT_CLASS,
  REGISTRATION_PANEL_HEIGHT_CLASS,
  RecoverySuccess,
  RegistrationSuccess,
} from "@/components/auth/RegistrationSuccess";
import {
  acquireSubmitLock,
  releaseSubmitLock,
} from "@/lib/auth-registration";

type Mode = "login" | "register" | "forgot" | "update";
const initialAuthActionState: AuthActionState = { status: "idle" };

export function AuthForm({
  mode,
  copy,
  nextPath,
}: {
  mode: Mode;
  copy: AuthCopy;
  nextPath?: string;
}) {
  const action =
    mode === "login"
      ? signInAction
      : mode === "register"
        ? signUpAction
        : mode === "forgot"
          ? forgotPasswordAction
          : updatePasswordAction;
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const submitLock = useRef(false);
  const section = copy[mode];
  const inputClass =
    "w-full rounded-xl border border-white/15 bg-ink-2 px-4 py-3.5 text-[16px] text-paper outline-none transition-colors placeholder:text-muted focus:border-accent";
  const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  const preservesEmail = mode === "register" || mode === "forgot";
  const locksSubmit = mode === "register" || mode === "forgot";
  const panelClass = `${AUTH_PANEL_CLASS} ${
    mode === "register" ? REGISTRATION_PANEL_HEIGHT_CLASS : DEFAULT_AUTH_PANEL_HEIGHT_CLASS
  }`;

  useEffect(() => {
    if (!pending && state.status !== "success") releaseSubmitLock(submitLock);
  }, [pending, state.status]);

  const registrationSucceeded =
    mode === "register" && state.status === "success" && Boolean(state.submittedEmail);
  const recoverySucceeded = mode === "forgot" && state.status === "success";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!locksSubmit) return;
    if (!acquireSubmitLock(submitLock)) event.preventDefault();
  }

  const pendingLabel =
    mode === "register"
      ? copy.register.pending
      : mode === "forgot"
        ? copy.forgot.pending
        : copy.common.pending;

  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-20">
      <div className="pt-3">
        <div className="label-mono flex items-center gap-2 text-accent">
          <span className="size-2 rounded-full bg-accent" />
          {section.kicker}
        </div>
        <h1 className="display mt-5 max-w-2xl text-[clamp(42px,5.6vw,76px)] text-paper">
          {section.title}
        </h1>
        <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted">{section.lead}</p>
      </div>

      {registrationSucceeded ? (
        <RegistrationSuccess
          email={state.submittedEmail!}
          loginHref={`/auth/login${nextQuery}`}
          copy={copy.register.success}
        />
      ) : recoverySucceeded ? (
        <RecoverySuccess loginHref="/auth/login" copy={copy.forgot.success} />
      ) : (
        <form
          action={formAction}
          onSubmit={handleSubmit}
          className={panelClass}
          aria-busy={pending}
        >
          {nextPath && <input type="hidden" name="next" value={nextPath} />}

        {state.status === "error" && state.message && (
          <p
            className="mb-6 rounded-2xl border border-accent/50 bg-accent/10 px-4 py-3 text-[15px] font-medium text-accent-deep"
            role="alert"
            aria-live="assertive"
          >
            {state.message}
          </p>
        )}

          <fieldset disabled={pending} className="contents">

        {mode === "register" && (
          <Field label={copy.common.displayName} errors={state.fieldErrors?.displayName}>
            <input
              className={inputClass}
              name="displayName"
              autoComplete="name"
              required
              maxLength={120}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Field>
        )}

        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <Field label={copy.common.email} errors={state.fieldErrors?.email}>
            <input
              className={inputClass}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              value={preservesEmail ? email : undefined}
              onChange={preservesEmail ? (event) => setEmail(event.target.value) : undefined}
            />
          </Field>
        )}

        {mode !== "forgot" && (
          <Field label={copy.common.password} errors={state.fieldErrors?.password}>
            <input
              className={inputClass}
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              maxLength={72}
            />
          </Field>
        )}

        {(mode === "register" || mode === "update") && (
          <Field label={copy.common.confirmPassword} errors={state.fieldErrors?.confirmPassword}>
            <input
              className={inputClass}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
          </Field>
        )}

        {state.status !== "error" && state.message && (
          <p
            className={`mt-6 rounded-xl border px-4 py-3 text-[15px] ${
              state.status === "success"
                ? "border-white/15 bg-white/5 text-paper"
                : "border-accent/50 bg-accent/10 text-accent-deep"
            }`}
            role="status"
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-8 w-full rounded-full bg-accent px-6 py-4 text-center font-semibold text-ink transition-colors hover:bg-accent-deep disabled:cursor-wait disabled:opacity-40"
        >
          {pending ? (
            <span className="inline-flex items-center justify-center gap-3" aria-live="polite">
              <span
                className="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink motion-reduce:animate-none"
                aria-hidden="true"
              />
              {pendingLabel}
            </span>
          ) : section.submit}
        </button>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[15px]">
          {mode === "login" && (
            <>
              <Link href={`/auth/register${nextQuery}`} className="text-paper underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
                {copy.login.register}
              </Link>
              <Link href="/auth/forgot-password" className="text-paper underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
                {copy.login.forgot}
              </Link>
            </>
          )}
          {mode === "register" && (
            <Link href={`/auth/login${nextQuery}`} className="text-paper underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
              {copy.register.login}
            </Link>
          )}
          {mode === "forgot" && (
            <Link href="/auth/login" className="text-paper underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-deep">
              {copy.forgot.login}
            </Link>
          )}
          <Link href="/" className="text-muted hover:text-paper">
            {copy.common.backHome}
          </Link>
        </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  errors,
  children,
}: {
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="mb-6 block">
      <span className="label-mono mb-2 block text-muted">{label}</span>
      {children}
      {errors?.map((error) => (
        <span key={error} className="mt-2 block text-[14px] text-accent-deep">
          {error}
        </span>
      ))}
    </label>
  );
}
