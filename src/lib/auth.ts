import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

// No servidor do Next pode ser um endereço interno; por padrão usa o mesmo do navegador.
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // igual ao JWT_EXPIRES_IN da API

export const devLoginEnabled =
  process.env.NEXT_PUBLIC_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production';

type BackendSession = {
  token: string;
  expiresAt: string;
  user: { id: string; email: string; name: string; avatar: string | null };
};

async function exchangeWithBackend(path: string, body: unknown): Promise<BackendSession> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.message ?? `API respondeu ${res.status}`);
  }
  return payload.data;
}

const providers: NextAuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  }),
];

if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: 'dev',
      name: 'Desenvolvimento',
      credentials: { email: { label: 'E-mail', type: 'email' } },
      async authorize(credentials) {
        const session = await exchangeWithBackend('/api/auth/dev', {
          email: credentials?.email || 'dev@local.test',
        });
        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.avatar,
          backendToken: session.token,
          backendTokenExpiresAt: session.expiresAt,
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    /**
     * A troca do token do Google pelo token da API acontece uma única vez, no login,
     * aqui no servidor — enquanto o id_token do Google ainda é válido (ele expira em 1h).
     */
    async jwt({ token, account, user }) {
      if (account?.provider === 'google') {
        try {
          const session = await exchangeWithBackend('/api/auth/google', { idToken: account.id_token });
          token.backendToken = session.token;
          token.backendTokenExpiresAt = session.expiresAt;
          delete token.error;
        } catch (err) {
          console.error('Falha ao autenticar na API:', err);
          token.error = 'BackendAuthError';
        }
      } else if (account?.provider === 'dev' && user) {
        token.backendToken = user.backendToken;
        token.backendTokenExpiresAt = user.backendTokenExpiresAt;
      }

      if (token.backendTokenExpiresAt && Date.parse(token.backendTokenExpiresAt) <= Date.now()) {
        token.error = 'BackendTokenExpired';
      }
      return token;
    },

    async session({ session, token }) {
      session.backendToken = token.error ? undefined : token.backendToken;
      session.error = token.error;
      return session;
    },
  },
};
