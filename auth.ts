import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

// A fixed hash for timing attack mitigation (hash of 'dummy' with salt rounds = 10)
const DUMMY_HASH = "$2a$10$w8uQe0bY8R4uU9m4F9w/u.bM/zHwS0E5V1q7xH0O9A3zX1sXwO0cK";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as any,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        try {
          const { RateLimitService } = await import('@/lib/services/rate-limit')
          await RateLimitService.checkLimit('AUTHENTICATION')
        } catch (e: any) {
          if (e.name === 'RateLimitError') {
            throw new Error('Too many login attempts. Please try again later.')
          }
        }

        const normalizedEmail = (credentials.email as string).toLowerCase()

        const user = await db.user.findUnique({
          where: {
            email: normalizedEmail
          }
        })

        // Always hash to prevent timing attacks for account enumeration
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user?.passwordHash || DUMMY_HASH
        )

        if (!user || !user.passwordHash || user.status === 'INACTIVE' || user.status === 'PENDING_VERIFICATION') {
          return null
        }

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user && token.role) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.sessionVersion = (user as any).sessionVersion
      }

      // Authoritative DB lookup to prevent stale roles and enforce password-reset invalidation
      if (token.sub) {
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: { role: true, sessionVersion: true, status: true }
        })

        // Invalidate session if user deleted, INACTIVE, PENDING_VERIFICATION, or sessionVersion incremented (e.g., password reset)
        if (!dbUser || dbUser.status === 'INACTIVE' || dbUser.status === 'PENDING_VERIFICATION' || dbUser.sessionVersion !== token.sessionVersion) {
          // Returning an empty token effectively revokes the session
          return {} as any
        }

        // Sync with authoritative role
        token.role = dbUser.role
      }

      return token
    }
  },
  pages: {
    signIn: "/login",
  }
})
