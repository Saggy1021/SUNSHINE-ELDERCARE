"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { calculateEndDate } from "@/lib/services/dates"
import { carePricingService } from "@/lib/services/care-plans"
import { taxService } from "@/lib/services/tax"
import { invoiceService } from "@/lib/services/invoice"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { notificationService } from "@/lib/services/notification"
import { RateLimitService } from "@/lib/services/rate-limit"

export async function getUserSubscription() {
  const session = await auth()
  if (!session?.user?.id) return null

  const sub = await db.subscription.findFirst({
    where: { userId: session.user.id },
    include: {
      carePlan: {
        include: {
          variants: {
            include: {
              services: true,
              durations: true
            }
          }
        }
      },
      addOns: {
        include: { addOn: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return sub
}

export async function getEmergencyContact() {
  const session = await auth()
  if (!session?.user?.id) return null

  return db.emergencyContact.findUnique({
    where: { userId: session.user.id }
  })
}

export async function updateEmergencyContact(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await RateLimitService.checkLimit('ADMINISTRATIVE')

  const fullName = formData.get("fullName") as string
  const relationship = formData.get("relationship") as string
  const phone = formData.get("phone") as string
  const alternatePhone = formData.get("alternatePhone") as string || null
  const email = formData.get("email") as string || null
  const address = formData.get("address") as string || null
  const notes = formData.get("notes") as string || null

  await db.emergencyContact.upsert({
    where: { userId: session.user.id },
    update: { fullName, relationship, phone, alternatePhone, email, address, notes },
    create: { userId: session.user.id, fullName, relationship, phone, alternatePhone, email, address, notes }
  })

  revalidatePath('/dashboard/emergency-contact')
}

export async function submitFeedback(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await RateLimitService.checkLimit('PUBLIC_FORMS') // Or ADMINISTRATIVE

  const category = formData.get("category") as string
  const rating = parseInt(formData.get("rating") as string, 10)
  const message = formData.get("message") as string

  await db.feedback.create({
    data: {
      userId: session.user.id,
      category,
      rating,
      message
    }
  })

  revalidatePath('/dashboard/feedback')
}

export async function submitRenewalRequest(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  await RateLimitService.checkLimit('FINANCIAL')

  const carePlanId = formData.get("carePlanId") as string
  const variantType = formData.get("variantType") as string
  const durationMonths = parseInt(formData.get("durationMonths") as string, 10)
  const requestedStartDate = new Date(formData.get("requestedStartDate") as string)
  
  // Validate selected add-ons
  const addOnIds = formData.getAll("addOns") as string[]
  
  // Validate with authoritative catalog
  const carePlan = await db.carePlan.findUnique({
    where: { id: carePlanId },
    include: { variants: { where: { variantType } } }
  })
  if (!carePlan || carePlan.variants.length === 0) throw new Error("Invalid Care Plan")
  
  const pricingTotal = await carePricingService.lookupPrice({ planSlug: carePlan.slug, variantType: variantType as "SINGLE" | "COUPLE", months: durationMonths })
  if (!pricingTotal) throw new Error("Invalid Pricing configuration")

  const calculatedEndDate = calculateEndDate(requestedStartDate, durationMonths)

  const currentSub = await db.subscription.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: 'desc' },
    include: { carePlan: true }
  })
  let requestType = "RENEWAL"
  
  // Phase 20: Enforce downgrade rules
  if (currentSub && currentSub.carePlan && currentSub.endDate) {
    const currentPrice = await carePricingService.lookupPrice({
      planSlug: currentSub.carePlan.slug,
      variantType: currentSub.variantType as "SINGLE" | "COUPLE",
      months: 1
    })
    
    const newPrice = await carePricingService.lookupPrice({
      planSlug: carePlan.slug,
      variantType: variantType as "SINGLE" | "COUPLE",
      months: 1
    })

    const isDowngrade = newPrice && currentPrice && (newPrice.monthlyBasePrice < currentPrice.monthlyBasePrice)
    const isUpgrade = newPrice && currentPrice && (newPrice.monthlyBasePrice > currentPrice.monthlyBasePrice)
    
    if (isDowngrade && requestedStartDate < currentSub.endDate) {
      throw new Error("Mid-cycle downgrades are not permitted. Downgrades may only become effective at the end of the current membership period.")
    }
    
    if (isUpgrade && requestedStartDate < currentSub.endDate) {
      requestType = "UPGRADE"
    }
  }

  // Start Transaction
  let createdRequest: any = null
  // Get addOn details for invoice
  let addOnsDetails: { id: string, name: string, price: number }[] = []
  
  await db.$transaction(async (tx) => {
    createdRequest = await tx.renewalRequest.create({
      data: {
        userId: session.user.id,
        currentSubscriptionId: currentSub?.id || null,
        carePlanId,
        variantType,
        durationMonths,
        requestedStartDate,
        calculatedEndDate,
        status: "PENDING_PAYMENT",
        requestType,
        planName: carePlan.name,
        documentedTotal: pricingTotal.documentedTotal
      }
    })

    if (addOnIds.length > 0) {
      const dbAddOns = await tx.addOn.findMany({ where: { id: { in: addOnIds } } })
      if (dbAddOns.length !== addOnIds.length) throw new Error("Invalid Add-ons")
      
      addOnsDetails = dbAddOns.map(a => ({ id: a.id, name: a.name, price: a.price }))
      
      await tx.renewalRequestAddOn.createMany({
        data: dbAddOns.map(a => ({
          renewalRequestId: createdRequest.id,
          addOnId: a.id
        }))
      })
    }
  })

  // Calculate tax and create invoice with authoritative pricing
  const taxResult = await taxService.calculateCarePlanTax(pricingTotal)
  const invoice = await invoiceService.createCarePlanInvoice(
    session.user.id,
    pricingTotal,
    taxResult,
    createdRequest.id,
    addOnsDetails
  )

  redirect(`/checkout/${invoice.id}?renewal=${createdRequest.id}`)
}

export async function getPlaceHolderAddOns() {
  return db.addOn.findMany({
    where: {
      name: { in: ['Care Visit Plus', 'Doctor Consultation', 'Wellness Support'] }
    }
  })
}

export async function getFeedbackHistory() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db.feedback.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })
}
export async function getUserRenewalState() {
  const session = await auth()
  if (!session?.user?.id) return null

  const pendingRenewal = await db.renewalRequest.findFirst({
    where: { 
      userId: session.user.id,
      status: { in: ['SUBMITTED', 'APPROVED', 'PENDING_PAYMENT', 'PAID_PENDING_APPROVAL', 'REJECTED_REFUND_DUE'] }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!pendingRenewal) return null

  // Check if there is a payment attempt for this renewal
  const payment = await db.payment.findFirst({
    where: { renewalRequestId: pendingRenewal.id },
    orderBy: { createdAt: 'desc' }
  })

  return {
    renewal: pendingRenewal,
    payment: payment
  }
}

export async function getMembershipHistory() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db.subscription.findMany({
    where: { userId: session.user.id },
    include: {
      carePlan: true,
      customPlan: true
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getMemberDocuments() {
  const session = await auth()
  if (!session?.user?.id) return { invoices: [], receipts: [], documents: [] }

  const invoices = await db.invoice.findMany({
    where: { userId: session.user.id, invoiceNumber: { not: null } },
    orderBy: { issueDate: 'desc' }
  })

  const receipts = await db.receipt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })
  
  const documents = await db.memberDocument.findMany({
    where: { userId: session.user.id, visibility: "PRIVATE", status: "ACTIVE" },
    orderBy: { createdAt: 'desc' }
  })

  return { invoices, receipts, documents }
}
