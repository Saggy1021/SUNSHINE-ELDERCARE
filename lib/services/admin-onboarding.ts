import { db } from '@/lib/db'
import { memberRegistrationSchema } from '@/lib/validations/member'
import { ROLES } from '@/lib/auth/roles'
import bcrypt from 'bcryptjs'
import { carePricingService } from '@/lib/services/care-plans'
import { taxService } from '@/lib/services/tax'
import { invoiceService } from '@/lib/services/invoice'
import { Prisma } from '@prisma/client'
import { validateUpload } from '@/lib/services/document/validation'
import { documentService } from '@/lib/services/document'
import { storageService } from '@/lib/services/storage'
import { calculateMembershipEndDate } from '@/lib/services/dates'

export type AdminOnboardDependencies = {
  dbClient?: any
  storage?: any
  documents?: any
  invoices?: any
  pricing?: any
}

/**
 * Internal/private onboarding pipeline helper.
 *
 * NOTE: This is NOT a Next.js Server Action and cannot be invoked over HTTP by web clients.
 * It is called exclusively by the authenticated `adminOnboardMember` Server Action
 * or by authorized server-side test harnesses.
 */
export async function executeAdminOnboardMember(
  formData: FormData,
  adminId: string,
  dependencies: AdminOnboardDependencies = {}
) {
  const database = dependencies.dbClient || db
  const storage = dependencies.storage || storageService
  const documents = dependencies.documents || documentService
  const invoices = dependencies.invoices || invoiceService
  const pricing = dependencies.pricing || carePricingService

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

  const existingUser = await database.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) return { success: false, error: 'User with this email already exists' }

  // 2. Extract Plan/Pricing Data
  const planId = formData.get('planId') as string
  const addOnIdsStr = formData.get('addOnIds') as string
  const addOnIds = addOnIdsStr ? JSON.parse(addOnIdsStr) : []
  const customPriceStr = formData.get('customPrice') as string
  const customPriceReason = formData.get('customPriceReason') as string
  const isCustomPrice = !!customPriceStr

  if (!planId) return { success: false, error: 'Membership plan must be selected' }
  if (isCustomPrice && !customPriceReason) {
    return { success: false, error: 'Reason required for custom pricing' }
  }

  // 3. Extract Payment Details
  const paymentMethod = formData.get('paymentMethod') as string
  const paymentReference = formData.get('paymentReference') as string
  if (!paymentMethod) return { success: false, error: 'Payment method is required' }

  // 4. Validate and Process Documents (Primary ID, Spouse ID, and Offline Payment Proof)
  const uploadedStorageKeys: string[] = []

  const idProofFile = formData.get('idProofFile') as File | null
  let idProofBuffer: Buffer | null = null
  if (idProofFile && idProofFile.size > 0) {
    if (idProofFile.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Primary Member ID Proof file exceeds the 2MB size limit.' }
    }
    idProofBuffer = Buffer.from(await idProofFile.arrayBuffer())
    try {
      validateUpload('ID_PROOF', idProofFile.type, idProofBuffer)
    } catch (err: any) {
      return { success: false, error: `Primary ID Proof: ${err.message}` }
    }
  }

  const spouseIdProofFile = formData.get('spouseIdProofFile') as File | null
  let spouseIdProofBuffer: Buffer | null = null
  if (spouseIdProofFile && spouseIdProofFile.size > 0) {
    if (spouseIdProofFile.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Spouse ID Proof file exceeds the 2MB size limit.' }
    }
    spouseIdProofBuffer = Buffer.from(await spouseIdProofFile.arrayBuffer())
    try {
      validateUpload('ID_PROOF', spouseIdProofFile.type, spouseIdProofBuffer)
    } catch (err: any) {
      return { success: false, error: `Spouse ID Proof: ${err.message}` }
    }
  }

  const paymentDocumentFile = formData.get('paymentDocument') as File | null
  let paymentDocumentBuffer: Buffer | null = null
  if (paymentDocumentFile && paymentDocumentFile.size > 0) {
    if (paymentDocumentFile.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Payment Document exceeds the 10MB size limit.' }
    }
    paymentDocumentBuffer = Buffer.from(await paymentDocumentFile.arrayBuffer())
    try {
      validateUpload('OTHER', paymentDocumentFile.type, paymentDocumentBuffer)
    } catch (err: any) {
      return { success: false, error: `Payment Document: ${err.message}` }
    }
  }

  // 5. Calculate Authoritative Prices
  const [planSlug, variantType, monthsStr] = planId.split('|')
  const months = parseInt(monthsStr, 10)
  const durationMonths = months || 1

  const membershipStartDateStr = (formData.get('membershipStartDate') as string) || new Date().toISOString()
  const membershipStartDate = new Date(membershipStartDateStr)
  const calculatedEndDate = calculateMembershipEndDate(membershipStartDate, durationMonths)

  let carePlanResult
  try {
    carePlanResult = await pricing.lookupPrice({
      planSlug,
      variantType: variantType as 'SINGLE' | 'COUPLE',
      months
    })
  } catch (error) {
    return { success: false, error: 'The selected plan configuration is not available' }
  }

  // 6. Execute Atomic Transaction
  const passwordHash = await bcrypt.hash(validatedData.password, 10)
  
  let txResult: { userId: string; documentUrl: string | null; subscriptionId?: string }
  try {
    txResult = await database.$transaction(async (tx: any) => {
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

      // Upload ID Documents securely if provided
      let idProofDocumentId: string | null = null
      if (idProofFile && idProofBuffer) {
        const uploadedDoc = await documents.uploadDocument(
          newUser.id,
          idProofBuffer,
          idProofFile.name,
          idProofFile.type,
          'ID_PROOF',
          adminId,
          tx
        )
        idProofDocumentId = uploadedDoc.id
        if (uploadedDoc?.storageKey) {
          uploadedStorageKeys.push(uploadedDoc.storageKey)
        }
      }

      let spouseIdProofDocumentId: string | null = null
      if (spouseIdProofFile && spouseIdProofBuffer) {
        const uploadedDoc = await documents.uploadDocument(
          newUser.id,
          spouseIdProofBuffer,
          spouseIdProofFile.name,
          spouseIdProofFile.type,
          'ID_PROOF',
          adminId,
          tx
        )
        spouseIdProofDocumentId = uploadedDoc.id
        if (uploadedDoc?.storageKey) {
          uploadedStorageKeys.push(uploadedDoc.storageKey)
        }
      }

      // Upload Offline Payment Document securely if provided
      let documentUrl: string | null = null
      if (paymentDocumentFile && paymentDocumentBuffer) {
        const uploadedPaymentDoc = await documents.uploadDocument(
          newUser.id,
          paymentDocumentBuffer,
          paymentDocumentFile.name,
          paymentDocumentFile.type,
          'OTHER',
          adminId,
          tx
        )
        if (uploadedPaymentDoc?.storageKey) {
          uploadedStorageKeys.push(uploadedPaymentDoc.storageKey)
        }
        documentUrl = `/api/documents/${uploadedPaymentDoc.id}`
      }

      // Create Member Profile with both Primary and Spouse Details
      const profile = await tx.memberProfile.create({
        data: {
          userId: newUser.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          idProofType: validatedData.idProofType || null,
          idProofNumber: validatedData.idProofNumber || null,
          idProofDocumentId,
          dateOfBirth: new Date(validatedData.dateOfBirth),
          gender: validatedData.gender,
          serviceAddress: validatedData.serviceAddress,
          nearestLandmark: validatedData.nearestLandmark || null,
          mobileNumber: validatedData.mobileNumber,
          alternateNumber: validatedData.alternateNumber || null,
          email: normalizedEmail,
          medicalConditions: validatedData.medicalConditions || null,
          bloodGroup: validatedData.bloodGroup || null,

          // Spouse / Second Member Details (Optional)
          spouseFirstName: validatedData.spouseFirstName || null,
          spouseLastName: validatedData.spouseLastName || null,
          spouseDateOfBirth: validatedData.spouseDateOfBirth ? new Date(validatedData.spouseDateOfBirth) : null,
          spouseGender: validatedData.spouseGender || null,
          spouseMobileNumber: validatedData.spouseMobileNumber || null,
          spouseIdProofType: validatedData.spouseIdProofType || null,
          spouseIdProofNumber: validatedData.spouseIdProofNumber || null,
          spouseIdProofDocumentId,
        }
      })
      
      // Emergency Contact
      await tx.emergencyContact.create({
        data: {
          userId: newUser.id,
          fullName: validatedData.emergencyContactName,
          relationship: validatedData.emergencyContactRelationship,
          phone: validatedData.emergencyContactMobile,
          alternatePhone: validatedData.emergencyContactOther || null,
          email: validatedData.emergencyContactEmail || null,
        }
      })

      // Sponsor
      await tx.sponsor.create({
        data: {
          memberProfileId: profile.id,
          fullName: validatedData.sponsorName,
          relationship: validatedData.sponsorRelationship,
          mobileNumber: validatedData.sponsorMobile,
          alternateNumber: validatedData.sponsorOther || null,
          email: validatedData.sponsorEmail || null,
        }
      })

      // Health Insurance (if provided)
      if (validatedData.insuranceProvider || validatedData.policyNumber) {
        await tx.insuranceDetails.create({
          data: {
            memberProfileId: profile.id,
            providerName: validatedData.insuranceProvider || '',
            policyNumber: validatedData.policyNumber || '',
            coverageAmount: validatedData.coverageAmount || null,
          }
        })
      }

      // Medical Authorization (if provided)
      if (validatedData.hospitalForSos || validatedData.nomineeLocalContact || validatedData.shiftAuthorization) {
        await tx.medicalAuthorization.create({
          data: {
            memberProfileId: profile.id,
            hospitalForSos: validatedData.hospitalForSos || null,
            nomineeLocalContact: validatedData.nomineeLocalContact || null,
            shiftAuthorization: validatedData.shiftAuthorization || false,
          }
        })
      }

      // Create Pending Subscription with the calculated start and end dates
      let subscriptionId: string | undefined
      if (tx.subscription?.create) {
        const subscription = await tx.subscription.create({
          data: {
            userId: newUser.id,
            carePlanId: carePlanResult.carePlanId || null,
            variantType: carePlanResult.variantType,
            durationMonths,
            startDate: membershipStartDate,
            endDate: calculatedEndDate,
            status: 'PENDING',
          }
        })
        subscriptionId = subscription.id
      }

      return { userId: newUser.id, documentUrl, subscriptionId }
    })
  } catch (txError: any) {
    // Transaction failed BEFORE commit: Postgres rolled back all database records.
    // Rollback cleanup: clean up every R2 storage object uploaded during this aborted transaction
    // to prevent orphaned storage objects.
    if (uploadedStorageKeys.length > 0) {
      await Promise.allSettled(
        uploadedStorageKeys.map((key) =>
          storage.delete(key).catch((err: any) => {
            console.error('Failed to cleanup uncommitted storage object after transaction failure', {
              error: err instanceof Error ? err.message : 'Unknown error',
            })
          })
        )
      )
    }
    return { success: false, error: txError.message || 'Onboarding transaction failed' }
  }

  // 7. Post-Commit Phase: Invoice, Payment & Audit Log
  // At this point, User, MemberProfile, and MemberDocument records are safely COMMITTED.
  // Their corresponding R2 objects must be PRESERVED and NEVER deleted if a post-commit step fails.
  try {
    let invoice
    let taxResultTotal = 0
    if (isCustomPrice) {
      const customAmt = parseFloat(customPriceStr)
      if (isNaN(customAmt) || customAmt < 0) throw new Error('Invalid custom price')

      const customPricingResult = {
        basePrice: customAmt,
        addOnsTotal: 0,
        discount: 0,
        subtotal: customAmt,
        currency: 'INR',
        lineItems: [{
          description: `Custom Pricing: ${carePlanResult.planName} - ${carePlanResult.variantType}`,
          quantity: 1,
          unitPrice: customAmt,
          total: customAmt,
          type: 'PLAN' as const,
          referenceId: planSlug,
          taxClassification: 'CARE_PLAN_GST'
        }]
      }
      const customTaxResult = await taxService.calculateTax(customPricingResult)
      taxResultTotal = customTaxResult.total

      invoice = await invoices.createInvoice(
        txResult.userId,
        customPricingResult,
        customTaxResult,
        planSlug
      )
    } else {
      const carePlanTaxResult = await taxService.calculateCarePlanTax(carePlanResult)
      taxResultTotal = carePlanTaxResult.total

      invoice = await invoices.createCarePlanInvoice(
        txResult.userId,
        carePlanResult,
        carePlanTaxResult
      )
    }

    // Create pending payment for OFFLINE
    if (paymentMethod === 'OFFLINE') {
      const paymentNotes = txResult.documentUrl
        ? `Document uploaded: ${txResult.documentUrl}${isCustomPrice ? ` | Custom Price Reason: ${customPriceReason}` : ''}`
        : (isCustomPrice ? `Custom Price Reason: ${customPriceReason}` : undefined)

      await database.payment.create({
        data: {
          userId: txResult.userId,
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(taxResultTotal),
          currency: 'INR',
          paymentMethod: 'OFFLINE',
          status: 'VERIFICATION_PENDING',
          reference: paymentReference,
          notes: paymentNotes,
          metadata: {
            subscriptionId: txResult.subscriptionId,
            startDate: membershipStartDate.toISOString(),
            endDate: calculatedEndDate.toISOString(),
            durationMonths,
          }
        }
      })
    }

    // Audit Event
    await database.auditLog.create({
      data: {
        action: 'MEMBER_ONBOARDED',
        entityId: txResult.userId,
        entityType: 'USER',
        actorUserId: adminId,
        metadata: {
          planId,
          isCustomPrice,
          paymentMethod,
          customPriceReason,
          startDate: membershipStartDate.toISOString(),
          endDate: calculatedEndDate.toISOString(),
          durationMonths,
        }
      }
    })

    return { success: true, userId: txResult.userId, invoiceId: invoice.id }
  } catch (postCommitError: any) {
    // Transaction already committed successfully.
    // Document records and their R2 objects are safely preserved in the database and storage.
    // DO NOT delete R2 objects here — metadata and storage remain consistent.
    console.error('Post-commit onboarding setup failed', {
      error: postCommitError instanceof Error ? postCommitError.message : 'Unknown error',
    })
    return {
      success: false,
      userId: txResult.userId,
      error: `Member profile was created successfully, but billing setup encountered an issue: ${postCommitError.message || 'Billing error'}. Please review in admin console.`,
    }
  }
}
