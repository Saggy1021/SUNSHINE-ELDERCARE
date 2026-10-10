'use server'

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { memberRegistrationSchema } from '@/lib/validations/member'
import { ROLES } from '@/lib/auth/roles'
import bcrypt from 'bcryptjs'
import { pricingService } from '@/lib/services/pricing'
import { taxService } from '@/lib/services/tax'
import { invoiceService } from '@/lib/services/invoice'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'

import { AuthorizationService } from '@/lib/services/authorization'
import { RateLimitService } from '@/lib/services/rate-limit'

async function requirePermission(permission: string) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  await AuthorizationService.require(session.user.id, permission)
  
  return session.user.id
}

export async function adminOnboardMember(formData: FormData) {
  const adminId = await requirePermission('MEMBER_MANAGE')

  // 1. Extract and validate Member Data
  const memberDataStr = formData.get('memberData') as string
  if (!memberDataStr) return { success: false, error: 'Missing member data' }
  const memberData = JSON.parse(memberDataStr)

  const validationResult = memberRegistrationSchema.safeParse(memberData)
  if (!validationResult.success) {
    return { success: false, error: validationResult.error.issues[0].message }
  }
  const validatedData = validationResult.data
  const normalizedEmail = validatedData.email.toLowerCase()

  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) return { success: false, error: 'User with this email already exists' }

  // 2. Extract Plan/Pricing Data
  const planId = formData.get('planId') as string
  const addOnIdsStr = formData.get('addOnIds') as string
  const addOnIds = addOnIdsStr ? JSON.parse(addOnIdsStr) : []
  const customPriceStr = formData.get('customPrice') as string
  const customPriceReason = formData.get('customPriceReason') as string
  const isCustomPrice = !!customPriceStr

  if (!planId) return { success: false, error: 'Membership plan must be selected' }

  // Permissions for Custom Pricing
  if (isCustomPrice) {
    await requirePermission('FINANCIAL_OVERRIDE')
    if (!customPriceReason) return { success: false, error: 'Reason required for custom pricing' }
  }

  // 3. Extract Payment Details
  const paymentMethod = formData.get('paymentMethod') as string
  const paymentReference = formData.get('paymentReference') as string
  if (!paymentMethod) return { success: false, error: 'Payment method is required' }

  // Document Upload (if OFFLINE)
  let documentUrl = null
  const documentFile = formData.get('paymentDocument') as File
  // In a real app, we'd use storage adapter to save it securely, e.g., to R2
  // if (documentFile && documentFile.size > 0) { ... }

  // 4. Calculate Authoritative Prices
  let pricingResult
  if (isCustomPrice) {
    const customAmt = parseFloat(customPriceStr)
    if (isNaN(customAmt) || customAmt < 0) return { success: false, error: 'Invalid custom price' }
    
    // We get the base plan to get the name/tax info
    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) return { success: false, error: 'Plan not found' }
    
    pricingResult = {
      basePrice: customAmt,
      addOnsTotal: 0,
      discount: 0,
      subtotal: customAmt,
      currency: 'INR',
      lineItems: [{
        description: `Custom Pricing: ${plan.name}`,
        quantity: 1,
        unitPrice: customAmt,
        total: customAmt,
        type: 'PLAN' as const,
        referenceId: plan.id,
        taxClassification: plan.taxClassification || undefined
      }]
    }
  } else {
    pricingResult = await pricingService.calculateSubtotal({ planId, addOnIds })
  }

  const taxResult = await taxService.calculateTax(pricingResult)

  // 5. Execute Atomic Transaction
  const passwordHash = await bcrypt.hash(validatedData.password, 10)
  
  try {
    const result = await db.$transaction(async (tx) => {
      // Create User
      const newUser = await tx.user.create({
        data: {
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: normalizedEmail,
          passwordHash,
          role: ROLES.MEMBER,
          emailVerified: new Date(),
        }
      })

      // Create Member Profile
      const profile = await tx.memberProfile.create({
        data: {
          userId: newUser.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          idProofType: validatedData.idProofType || null,
          idProofNumber: validatedData.idProofNumber || null,
          dateOfBirth: new Date(validatedData.dateOfBirth),
          gender: validatedData.gender,
          serviceAddress: validatedData.serviceAddress,
          nearestLandmark: validatedData.nearestLandmark || null,
          mobileNumber: validatedData.mobileNumber,
          alternateNumber: validatedData.alternateNumber || null,
          email: normalizedEmail,
        }
      })
      
      // Emergency Contact
      await tx.emergencyContact.create({
        data: { userId: newUser.id, fullName: validatedData.emergencyContactName, relationship: validatedData.emergencyContactRelationship, phone: validatedData.emergencyContactMobile, alternatePhone: validatedData.emergencyContactOther || null, email: validatedData.emergencyContactEmail || null }
      })

      // Sponsor
      await tx.sponsor.create({
        data: { memberProfileId: profile.id, fullName: validatedData.sponsorName, relationship: validatedData.sponsorRelationship, mobileNumber: validatedData.sponsorMobile, alternateNumber: validatedData.sponsorOther || null, email: validatedData.sponsorEmail || null }
      })

      return { userId: newUser.id }
    })

    // Create Invoice (Immutable)
    const invoice = await invoiceService.createInvoice(
      result.userId,
      pricingResult,
      taxResult,
      planId
    )

    // Create pending payment for OFFLINE
    if (paymentMethod === 'OFFLINE') {
      await db.payment.create({
        data: {
          userId: result.userId,
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(taxResult.total),
          currency: 'INR',
          paymentMethod: 'OFFLINE',
          status: 'VERIFICATION_PENDING',
          reference: paymentReference,
          notes: documentUrl ? `Document uploaded: ${documentUrl}` : (isCustomPrice ? `Custom Price Reason: ${customPriceReason}` : undefined),
        }
      })
    }

    // Audit Event
    await db.auditLog.create({
      data: {
        action: 'MEMBER_ONBOARDED',
        entityId: result.userId,
        entityType: 'USER',
        actorUserId: adminId,
        metadata: {
          planId,
          isCustomPrice,
          paymentMethod,
          customPriceReason
        }
      }
    })

    return { success: true, userId: result.userId, invoiceId: invoice.id }
  } catch (error: any) {
    return { success: false, error: error.message || 'Onboarding failed' }
  }
}
