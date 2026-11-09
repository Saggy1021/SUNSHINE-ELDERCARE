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
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        authType: { label: "AuthType", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        const normalizedEmail = (credentials.email as string).toLowerCase().trim()
        const authType = (credentials.authType as string) || (credentials.otp ? 'otp' : 'password')

        if (authType === 'otp') {
          const rawOtp = (credentials.otp as string)?.trim()
          if (!rawOtp) {
            return null
          }

          try {
            const { RateLimitService } = await import('@/lib/services/rate-limit')
            await RateLimitService.checkLimit('OTP_VERIFICATION', normalizedEmail)
          } catch (e: any) {
            if (e.name === 'RateLimitError') {
              // Delete active tokens on rate limit violation to prevent brute forcing
              await db.verificationToken.deleteMany({
                where: { identifier: `login_${normalizedEmail}` }
              })
              throw new Error('Too many failed attempts. OTP invalidated. Please request a new one.')
            }
            throw e
          }

          const { verifyLoginOtpToken } = await import('@/lib/auth/tokens')
          const verifyResult = await verifyLoginOtpToken(normalizedEmail, rawOtp)
          if (!verifyResult.valid) {
            if (verifyResult.reason === 'EXPIRED') {
              throw new Error('OTP has expired. Please request a new code.')
            }
            return null
          }

          const user = await db.user.findUnique({
            where: { email: normalizedEmail }
          })

          if (!user || user.status === 'INACTIVE') {
            return null
          }

          // If user was pending email verification, verifying login OTP activates account
          if (user.status === 'PENDING_VERIFICATION') {
            await db.user.update({
              where: { id: user.id },
              data: { status: 'ACTIVE', emailVerified: new Date() }
            })
            user.status = 'ACTIVE'
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            sessionVersion: user.sessionVersion,
          }
        }

        // --- PASSWORD AUTHENTICATION (PRESERVED) ---
        if (!credentials?.password) {
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
