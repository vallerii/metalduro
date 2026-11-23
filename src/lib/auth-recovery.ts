type RecoveryError = {
  code?: string;
};

type RecoveryAuthClient = {
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string },
  ): PromiseLike<{ error: RecoveryError | null }>;
};

const ACCOUNT_LOOKUP_ERROR_CODES = new Set(["user_not_found", "email_not_found"]);

function masksAccountLookup(error: RecoveryError | null) {
  return Boolean(error?.code && ACCOUNT_LOOKUP_ERROR_CODES.has(error.code));
}

export async function requestPasswordRecovery(
  auth: RecoveryAuthClient,
  email: string,
  redirectTo: string,
) {
  try {
    const { error } = await auth.resetPasswordForEmail(email, { redirectTo });
    return { error: masksAccountLookup(error) ? null : error };
  } catch (error) {
    return { error };
  }
}
