import { db } from "@/lib/db";
import crypto from "crypto";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateEmailVerificationToken(email: string) {
  // Generate a cryptographically secure 6-digit OTP
  const rawToken = crypto.randomInt(100000, 1000000).toString();
  const hashedToken = hashToken(rawToken);
  // Expire in 5 minutes
  const expires = new Date(Date.now() + 1000 * 60 * 5); 
  const identifier = `verify_${email.toLowerCase().trim()}`;

  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  await db.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires,
    },
  });

  return rawToken;
}

export async function generateLoginOtpToken(email: string) {
  // Generate a cryptographically secure 6-digit OTP
  const rawToken = crypto.randomInt(100000, 1000000).toString();
  const hashedToken = hashToken(rawToken);
  // Expire in 5 minutes
  const expires = new Date(Date.now() + 1000 * 60 * 5);
  const identifier = `login_${email.toLowerCase().trim()}`;

  // Invalidate any previously unconsumed OTPs for this email
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  await db.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires,
    },
  });

  return rawToken;
}

export async function verifyLoginOtpToken(email: string, rawOtp: string): Promise<{ valid: boolean; reason?: 'INVALID' | 'EXPIRED' }> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOtp = rawOtp.trim();

  // Validate format
  if (!/^\d{6}$/.test(trimmedOtp)) {
    return { valid: false, reason: 'INVALID' };
  }

  const hashedToken = hashToken(trimmedOtp);
  const identifier = `login_${normalizedEmail}`;

  const existingToken = await db.verificationToken.findFirst({
    where: { identifier, token: hashedToken },
  });

  if (!existingToken) {
    return { valid: false, reason: 'INVALID' };
  }

  // Check expiration
  if (new Date(existingToken.expires) < new Date()) {
    // Delete expired token
    await db.verificationToken.deleteMany({
      where: { identifier },
    });
    return { valid: false, reason: 'EXPIRED' };
  }

  // Token is valid! Consume/invalidate immediately to prevent replay
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  return { valid: true };
}

export async function generatePasswordResetToken(email: string) {
  const rawToken = crypto.randomUUID();
  const hashedToken = hashToken(rawToken);
  // Expire in 1 hour
  const expires = new Date(new Date().getTime() + 1000 * 60 * 60); 
  const identifier = `reset_${email}`;

  const existingToken = await db.verificationToken.findFirst({
    where: { identifier },
  });

  if (existingToken) {
    await db.verificationToken.delete({
      where: { identifier_token: { identifier, token: existingToken.token } },
    });
  }

  await db.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires,
    },
  });

  return rawToken;
}
