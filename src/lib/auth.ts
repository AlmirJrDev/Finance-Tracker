// import NextAuth from 'next-auth'
// import GoogleProvider from 'next-auth/providers/google'
// import { NextAuthOptions } from 'next-auth'

// // Extend the built-in session types
// declare module "next-auth" {
//   interface Session {
//     accessToken?: string
//     refreshToken?: string
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     accessToken?: string
//     refreshToken?: string
//   }
// }

// export const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//       authorization: {
//         params: {
//           scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
//         }
//       }
//     })
//   ],
//   callbacks: {
//     async jwt({ token, account }) {
//       if (account) {
//         token.accessToken = account.access_token
//         token.refreshToken = account.refresh_token
//       }
//       return token
//     },
//     async session({ session, token }) {
//       session.accessToken = token.accessToken
//       session.refreshToken = token.refreshToken
//       return session
//     }
    
//   },
//   secret: process.env.AUTH_SECRET,

// }

// const handler = NextAuth(authOptions)

// export { handler as GET, handler as POST }

import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token  // necessário para autenticar no backend
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.idToken = token.idToken as string  // expõe para o frontend
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }