"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { submitOfflinePayment } from "@/lib/services/payment"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { AuthorizationService } from "@/lib/services/authorization"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { RateLimitService } from '@/lib/services/rate-limit'

export async function processOfflinePayment(
  invoiceId: string, 
  renewalRequestId: string, 
  amount: number, 
  reference: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await RateLimitService.checkLimit('FINANCIAL')

  // Submit offline payment
  await submitOfflinePayment(
    session.user.id,
    invoiceId,
    renewalRequestId,
    amount,
    reference
  )

  // Redirect to success page or dashboard
  revalidatePath("/dashboard")
  redirect("/dashboard?payment=submitted")
}

// Admin Server Actions for Payment Verification
export async function getPendingPayments() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const authorized = await AuthorizationService.can(session.user.id, PERMISSIONS.PAYMENT_VIEW)
  if (!authorized) {
    throw new Error("Forbidden")
  }

  return db.payment.findMany({
    where: { status: "VERIFICATION_PENDING" },
    include: {
      user: { select: { name: true, email: true } },
      invoice: true,
      renewalRequest: { select: { planName: true, variantType: true, durationMonths: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}
