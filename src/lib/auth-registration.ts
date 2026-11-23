export type RegistrationInput = {
  email: string;
  password: string;
  displayName: string;
  locale: string;
  nextPath: string;
  siteUrl: string;
};

type RegistrationAuthClient = {
  signUp(input: {
    email: string;
    password: string;
    options: {
      emailRedirectTo: string;
      data: {
        display_name: string;
        locale: string;
        auth_next: string;
      };
    };
  }): Promise<{ error: unknown }>;
};

export async function registerClient(
  auth: RegistrationAuthClient,
  input: RegistrationInput,
) {
  return auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.siteUrl,
      data: {
        display_name: input.displayName,
        locale: input.locale,
        auth_next: input.nextPath,
      },
    },
  });
}

export function acquireSubmitLock(lock: { current: boolean }) {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseSubmitLock(lock: { current: boolean }) {
  lock.current = false;
}
