import { db } from "@/lib/db";
import crypto from "crypto";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateEmailVerificationToken(email: string) {
  const rawToken = crypto.randomUUID();
  const hashedToken = hashToken(rawToken);
  // Expire in 24 hours
  const expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24); 
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
