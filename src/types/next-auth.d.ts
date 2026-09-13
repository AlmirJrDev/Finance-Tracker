import type { DefaultSession } from 'next-auth';

type AuthError = 'BackendAuthError' | 'BackendTokenExpired';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'];
    backendToken?: string;
    error?: AuthError;
  }

  interface User {
    backendToken?: string;
    backendTokenExpiresAt?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken?: string;
    backendTokenExpiresAt?: string;
    error?: AuthError;
  }
}
