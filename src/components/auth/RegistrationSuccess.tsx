"use client";

import { useEffect, useRef } from "react";

export const AUTH_PANEL_CLASS =
  "rounded-3xl border border-white/10 bg-surface p-6 md:p-8";
export const REGISTRATION_PANEL_HEIGHT_CLASS = "min-h-[640px] sm:min-h-[612px]";
export const DEFAULT_AUTH_PANEL_HEIGHT_CLASS = "min-h-[540px]";

export type EmailSuccessCopy = {
  title: string;
  instruction: string;
  spamHint: string;
  login: string;
};

export type RegistrationSuccessCopy = EmailSuccessCopy & {
  sentTo: string;
};

function EmailSuccess({
  email,
  sentTo,
  loginHref,
  copy,
  headingId,
  panelHeightClass,
}: {
  email?: string;
  sentTo?: string;
  loginHref: string;
  copy: EmailSuccessCopy;
  headingId: string;
  panelHeightClass: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className={`${AUTH_PANEL_CLASS} ${panelHeightClass} flex flex-col justify-center`}
      role="status"
      aria-live="polite"
      aria-labelledby={headingId}
    >
      <div
        className="flex size-16 items-center justify-center rounded-2xl border border-accent/35 bg-accent/10 text-accent md:size-20"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-8 md:size-10">
          <path
            d="M4 6.5h16v11H4v-11Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="m5 7.5 7 5 7-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="mt-7 text-[clamp(32px,4vw,48px)] font-semibold leading-tight text-paper outline-none"
      >
        {copy.title}
      </h2>
      {email && sentTo && (
        <>
          <p className="mt-5 text-[16px] leading-relaxed text-muted">{sentTo}</p>
          <p className="mt-2 break-all text-[17px] font-semibold text-paper">{email}</p>
        </>
      )}
      <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted">{copy.instruction}</p>
      <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] leading-relaxed text-paper">
        {copy.spamHint}
      </p>
      <a
        href={loginHref}
        className="mt-8 inline-flex w-fit rounded-full border border-white/20 px-6 py-3.5 font-semibold text-paper transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {copy.login}
      </a>
    </section>
  );
}

export function RegistrationSuccess({
  email,
  loginHref,
  copy,
}: {
  email: string;
  loginHref: string;
  copy: RegistrationSuccessCopy;
}) {
  return (
    <EmailSuccess
      email={email}
      sentTo={copy.sentTo}
      loginHref={loginHref}
      copy={copy}
      headingId="registration-success-title"
      panelHeightClass={REGISTRATION_PANEL_HEIGHT_CLASS}
    />
  );
}

export function RecoverySuccess({
  loginHref,
  copy,
}: {
  loginHref: string;
  copy: EmailSuccessCopy;
}) {
  return (
    <EmailSuccess
      loginHref={loginHref}
      copy={copy}
      headingId="recovery-success-title"
      panelHeightClass={DEFAULT_AUTH_PANEL_HEIGHT_CLASS}
    />
  );
}
