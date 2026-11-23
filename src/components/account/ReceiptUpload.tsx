/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountCopy } from "@/content/account";
import { finalizeReceiptAction } from "@/app/account/applications/actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

export function ReceiptUpload({
  applicationId,
  userId,
  signedUrl,
  recoveryStoragePath,
  copy,
}: {
  applicationId: string;
  userId: string;
  signedUrl: string | null;
  recoveryStoragePath: string | null;
  copy: AccountCopy;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(signedUrl);
  const [pendingStoragePath, setPendingStoragePath] = useState<string | null>(
    recoveryStoragePath,
  );
  const [uploading, setUploading] = useState(false);
  const [isFinalizing, startFinalization] = useTransition();
  const [message, setMessage] = useState<string | null>(
    recoveryStoragePath ? copy.receipt.pendingFinalization : null,
  );
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  const storagePath = `${userId}/${applicationId}/receipt`;
  const busy = uploading || isFinalizing;

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function selectFile(nextFile: File | undefined) {
    setError(null);
    setMessage(null);

    if (!nextFile) return;
    if (!allowedTypes.has(nextFile.type)) {
      setFile(null);
      setError(copy.receipt.invalidType);
      return;
    }
    if (nextFile.size <= 0 || nextFile.size > maxBytes) {
      setFile(null);
      setError(copy.receipt.tooLarge);
      return;
    }

    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(nextFile);
    setPreviewUrl(objectUrl.current);
    setFile(nextFile);
  }

  function finalize(path: string, fallbackMessage: string) {
    startFinalization(async () => {
      const result = await finalizeReceiptAction(applicationId, path);
      if (!result.ok) {
        setPendingStoragePath(path);
        setError(result.message || fallbackMessage);
        setMessage(copy.receipt.pendingFinalization);
        return;
      }

      setError(null);
      setMessage(copy.receipt.success);
      router.refresh();
    });
  }

  async function uploadAndFinalize() {
    if (busy) return;

    if (pendingStoragePath) {
      setError(null);
      finalize(pendingStoragePath, copy.receipt.finalizeError);
      return;
    }

    if (!file) {
      setError(copy.receipt.invalidType);
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    setUploading(false);

    if (uploadError) {
      finalize(storagePath, copy.receipt.uploadError);
      return;
    }

    setPendingStoragePath(storagePath);
    finalize(storagePath, copy.receipt.finalizeError);
  }

  return (
    <div>
      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink">
          <img
            src={previewUrl}
            alt={copy.receipt.previewAlt}
            className="max-h-[420px] w-full object-contain"
          />
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/20 bg-ink/50 px-6 text-center text-muted">
          {copy.receipt.allowed}
        </div>
      )}

      {!pendingStoragePath ? (
        <label className="mt-5 flex cursor-pointer items-center justify-center rounded-full border border-white/20 px-5 py-3.5 font-semibold transition-colors hover:border-accent hover:text-accent">
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {file ? copy.receipt.replace : copy.receipt.choose}
        </label>
      ) : null}

      <p className="mt-3 text-center text-[13px] text-muted">{copy.receipt.allowed}</p>

      {message ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-5 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[14px] text-accent-deep" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || (!file && !pendingStoragePath)}
        onClick={uploadAndFinalize}
        className="mt-5 flex w-full items-center justify-between rounded-full bg-accent px-6 py-4 font-semibold text-ink transition-colors hover:bg-accent-deep disabled:cursor-wait disabled:opacity-50"
      >
        <span>
          {busy
            ? copy.receipt.uploading
            : pendingStoragePath
              ? copy.receipt.retryFinalization
              : copy.receipt.upload}
        </span>
        <span aria-hidden>↗</span>
      </button>
    </div>
  );
}

export function AttachedReceipt({
  signedUrl,
  copy,
}: {
  signedUrl: string;
  copy: AccountCopy;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink">
        <img
          src={signedUrl}
          alt={copy.receipt.previewAlt}
          className="max-h-[480px] w-full object-contain"
        />
      </div>
      <p className="mt-4 text-[14px] text-muted">{copy.receipt.attached}</p>
    </div>
  );
}
