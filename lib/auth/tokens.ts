import { db } from "@/lib/db";
import crypto from "crypto";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateEmailVerificationToken(email: string) {
  // Generate a cryptographically secure 6-digit OTP
  const rawToken = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const hashedToken = hashToken(rawToken);
  // Expire in 15 minutes
  const expires = new Date(new Date().getTime() + 1000 * 60 * 15); 
  const identifier = `verify_${email}`;

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
