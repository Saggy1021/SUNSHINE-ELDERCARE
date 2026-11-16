"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { AuthorizationService } from "@/lib/services/authorization"
import { RateLimitService } from "@/lib/services/rate-limit"
import { EmailService } from "@/lib/services/email"
import { memberDeletionOtpEmail } from "@/lib/services/email/templates"
import { hashToken } from "@/lib/auth/tokens"
import { DASHBOARD_EXCLUDED_EMAILS } from "@/lib/constants/members"

// --- Helper: Permission Guard ---
async function requirePermission(permission: string) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  await AuthorizationService.require(session.user.id, permission)
  return session.user.id
}

// --- Helper: Audit Logger ---
async function logAudit(actorId: string, action: string, entityType: string, entityId: string, metadata?: any, database: any = db) {
  await database.auditLog.create({
    data: {
      actorUserId: actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || {}
    }
  })
}

// ============================================================================
// 1. FINANCIAL & DEPENDENCY INTEGRITY CHECKS (PHASE 4)
// ============================================================================

export interface DeletionEligibilityResult {
  eligible: boolean;
  hasFinancialDependencies?: boolean;
  hasPendingSubscriptionsOnly?: boolean;
  pendingSubscriptionCount?: number;
  dependencies?: string[];
  reason?: string;
  eligibleNotice?: string;
  recommendedAction?: "ARCHIVE" | "NONE";
  member?: any;
}

/**
 * Inspects all foreign key and legal dependencies for a member.
 * Permanent deletion must NEVER silently cascade-delete financial records.
 * Rules:
 * - No subscription records and no protected dependencies -> Allow deletion
 * - Only PENDING subscriptions with no associated financial or legal records -> Allow deletion
 * - ACTIVE subscription -> Block deletion
 * - EXPIRED subscription -> Block deletion
 * - CANCELLED or historical subscription -> Block deletion
 * - Any invoice record, including unpaid or draft invoices -> Block deletion
 * - Any payment or payment verification record -> Block deletion
 * - Any receipt -> Block deletion
 * - Any legally or statutorily required document or record -> Block deletion
 * - Unknown or unexpected subscription status -> Block deletion safely
 */
export async function checkMemberDeletionEligibilityCore(
  memberUserId: string,
  database: any = db
): Promise<DeletionEligibilityResult> {
  const member = await database.user.findUnique({
    where: { id: memberUserId },
    include: {
      memberProfile: true,
      invoices: { select: { id: true, invoiceNumber: true, status: true, total: true } },
      payments: { select: { id: true, amount: true, status: true } },
      receipts: { select: { id: true, receiptNumber: true } },
      subscriptions: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          careCases: { select: { id: true } },
          documents: { select: { id: true } },
        }
      },
      ownedDocuments: { select: { id: true, displayName: true } },
      userRoles: { include: { role: true } },
    }
  });

  if (!member) {
    return { eligible: false, reason: "Member record not found in system." };
  }

  // Prevent deleting Primary Owner or system administrators
  if (
    DASHBOARD_EXCLUDED_EMAILS.includes(member.email) ||
    member.role === "ADMIN" ||
    member.userRoles?.some((ur: any) => ur.role?.name === "Owner")
  ) {
    return {
      eligible: false,
      reason: "Administrative and system accounts cannot be permanently deleted."
    };
  }

  const dependencies: string[] = [];

  // 1. Invoices: Any invoice record (including unpaid, draft, cancelled, or paid) blocks deletion
  if (member.invoices?.length > 0) {
    const statuses = Array.from(new Set(member.invoices.map((inv: any) => inv.status || 'RECORDED'))).join(', ');
    dependencies.push(`${member.invoices.length} invoice(s) [${statuses}]`);
  }

  // 2. Payments: Any payment or payment verification record blocks deletion
  if (member.payments?.length > 0) {
    const statuses = Array.from(new Set(member.payments.map((p: any) => p.status || 'RECORDED'))).join(', ');
    dependencies.push(`${member.payments.length} payment record(s) [${statuses}]`);
  }

  // 3. Receipts: Any statutory receipt blocks deletion
  if (member.receipts?.length > 0) {
    dependencies.push(`${member.receipts.length} statutory receipt(s)`);
  }

  // 4. Documents & Legal Records: Any legally or statutorily required document blocks deletion
  if (member.ownedDocuments?.length > 0) {
    dependencies.push(`${member.ownedDocuments.length} legal/compliance document(s)`);
  }

  // 5. Subscriptions:
  // - No subscriptions: Permitted
  // - Only PENDING subscriptions with no associated financial or legal records: Permitted
  // - ACTIVE subscription: Block
  // - EXPIRED subscription: Block
  // - CANCELLED or historical subscription: Block
  // - Unknown / unexpected subscription status: Block safely
  // - Subscriptions with operational care cases or documents: Block
  let pendingCount = 0;
  if (member.subscriptions && member.subscriptions.length > 0) {
    const activeSubs: any[] = [];
    const expiredSubs: any[] = [];
    const cancelledSubs: any[] = [];
    const otherProtectedSubs: any[] = [];
    const unknownSubs: any[] = [];

    for (const sub of member.subscriptions) {
      if (sub.careCases && sub.careCases.length > 0) {
        dependencies.push(`${sub.careCases.length} care case(s) linked to subscription ${sub.id}`);
      }
      if (sub.documents && sub.documents.length > 0) {
        dependencies.push(`${sub.documents.length} document(s) linked to subscription ${sub.id}`);
      }

      const status = sub.status;
      if (status === "PENDING") {
        pendingCount++;
      } else if (status === "ACTIVE") {
        activeSubs.push(sub);
      } else if (status === "EXPIRED") {
        expiredSubs.push(sub);
      } else if (status === "CANCELLED") {
        cancelledSubs.push(sub);
      } else if (["SCHEDULED", "APPROVED", "SUSPENDED", "EXPIRING"].includes(status)) {
        otherProtectedSubs.push(sub);
      } else {
        // Unknown or unexpected status -> must block safely
        unknownSubs.push(sub);
      }
    }

    if (activeSubs.length > 0) {
      dependencies.push(`${activeSubs.length} active subscription(s) [ACTIVE]`);
    }
    if (expiredSubs.length > 0) {
      dependencies.push(`${expiredSubs.length} expired subscription(s) [EXPIRED]`);
    }
    if (cancelledSubs.length > 0) {
      dependencies.push(`${cancelledSubs.length} historical subscription(s) [CANCELLED]`);
    }
    if (otherProtectedSubs.length > 0) {
      const statuses = Array.from(new Set(otherProtectedSubs.map((s) => s.status))).join(', ');
      dependencies.push(`${otherProtectedSubs.length} non-pending subscription(s) [${statuses}]`);
    }
    if (unknownSubs.length > 0) {
      const statuses = Array.from(new Set(unknownSubs.map((s) => s.status || 'UNKNOWN'))).join(', ');
      dependencies.push(`${unknownSubs.length} subscription(s) with unrecognized status [${statuses}]`);
    }
  }

  // If ANY protected dependency exists:
  if (dependencies.length > 0) {
    return {
      eligible: false,
      hasFinancialDependencies: true,
      hasPendingSubscriptionsOnly: false,
      pendingSubscriptionCount: pendingCount,
      dependencies,
      reason: `Permanent deletion blocked: Member has protected dependencies: ${dependencies.join(', ')}. Financial, operational, and audit records cannot be permanently destroyed. Please use 'Archive Member' instead.`,
      recommendedAction: "ARCHIVE",
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        memberId: member.memberProfile?.memberId || "UNASSIGNED",
      }
    };
  }

  const hasPendingOnly = pendingCount > 0;
  return {
    eligible: true,
    hasFinancialDependencies: false,
    hasPendingSubscriptionsOnly: hasPendingOnly,
    pendingSubscriptionCount: pendingCount,
    eligibleNotice: hasPendingOnly
      ? "This member has only pending subscription records and no protected financial or legal dependencies. Permanent deletion is available after the required security verification."
      : "This member has no subscriptions and no protected financial or legal dependencies. Permanent deletion is available after the required security verification.",
    recommendedAction: "NONE",
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      memberId: member.memberProfile?.memberId || "UNASSIGNED",
    }
  };
}

export async function checkMemberDeletionEligibility(memberUserId: string) {
  await requirePermission("MEMBER_VIEW");
  return checkMemberDeletionEligibilityCore(memberUserId, db);
}

// ============================================================================
// 2. MEMBER ARCHIVING & RESTORING (PHASE 2)
// ============================================================================

/**
 * Core logic to archive a member. Reversible.
 * Sets user.status to "ARCHIVED", preserving profile, memberId, historical records.
 */
export async function adminArchiveMemberCore(
  params: { memberUserId: string; reason: string; actorUserId: string },
  database: any = db
) {
  const { memberUserId, reason, actorUserId } = params;

  if (!reason || reason.trim().length < 3) {
    return { success: false, error: "A valid reason for archiving is required (minimum 3 characters)." };
  }

  const user = await database.user.findUnique({
    where: { id: memberUserId },
    include: { memberProfile: true }
  });

  if (!user) {
    return { success: false, error: "Member not found." };
  }

  if (DASHBOARD_EXCLUDED_EMAILS.includes(user.email) || user.role === "ADMIN") {
    return { success: false, error: "Administrative and owner accounts cannot be archived." };
  }

  if (user.status === "ARCHIVED") {
    return { success: false, error: "Member is already archived." };
  }

  // Update status to ARCHIVED without altering profile or Member ID
  await database.user.update({
    where: { id: memberUserId },
    data: { status: "ARCHIVED" }
  });

  // Audit log
  await logAudit(
    actorUserId,
    "MEMBER_ARCHIVED",
    "User",
    memberUserId,
    {
      reason: reason.trim(),
      memberName: user.name,
      memberId: user.memberProfile?.memberId || null,
      previousStatus: user.status,
      timestamp: new Date().toISOString()
    },
    database
  );

  return {
    success: true,
    message: `Member ${user.name || user.email} has been safely archived. Member records and Member ID have been preserved.`
  };
}

export async function adminArchiveMember(memberUserId: string, reason: string) {
  const sessionUserId = await requirePermission("MEMBER_EDIT");
  const result = await adminArchiveMemberCore(
    { memberUserId, reason, actorUserId: sessionUserId },
    db
  );

  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${memberUserId}`);
    revalidatePath("/admin/members/archived");
  }

  return result;
}

/**
 * Core logic to restore an archived member.
 * Reverts user.status back to "ACTIVE".
 */
export async function adminRestoreMemberCore(
  params: { memberUserId: string; reason?: string; actorUserId: string },
  database: any = db
) {
  const { memberUserId, reason, actorUserId } = params;

  const user = await database.user.findUnique({
    where: { id: memberUserId },
    include: { memberProfile: true }
  });

  if (!user) {
    return { success: false, error: "Member not found." };
  }

  if (user.status !== "ARCHIVED") {
    return { success: false, error: "Member is not currently archived." };
  }

  await database.user.update({
    where: { id: memberUserId },
    data: { status: "ACTIVE" }
  });

  await logAudit(
    actorUserId,
    "MEMBER_RESTORED",
    "User",
    memberUserId,
    {
      reason: reason?.trim() || "Restored by administrator",
      memberName: user.name,
      memberId: user.memberProfile?.memberId || null,
      restoredAt: new Date().toISOString()
    },
    database
  );

  return {
    success: true,
    message: `Member ${user.name || user.email} has been restored to active status.`
  };
}

export async function adminRestoreMember(memberUserId: string, reason?: string) {
  const sessionUserId = await requirePermission("MEMBER_EDIT");
  const result = await adminRestoreMemberCore(
    { memberUserId, reason, actorUserId: sessionUserId },
    db
  );

  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${memberUserId}`);
    revalidatePath("/admin/members/archived");
  }

  return result;
}

// ============================================================================
// 3. PERMANENT DELETION WITH EMAIL OTP & OWNER APPROVAL (PHASE 3 & 5)
// ============================================================================

/**
 * Step 1: Request 6-digit cryptographic OTP for permanent member deletion.
 * Sent exclusively to authenticated administrator's registered email.
 */
export async function requestMemberDeletionOtpCore(
  params: {
    memberUserId: string;
    reason: string;
    actorUserId: string;
    now?: Date;
  },
  database: any = db,
  emailService: any = new EmailService()
) {
  const { memberUserId, reason, actorUserId, now = new Date() } = params;

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "A detailed reason for permanent deletion is required (minimum 5 characters)." };
  }

  // Pre-check dependencies: Block immediately if financial records exist
  const eligibility = await checkMemberDeletionEligibilityCore(memberUserId, database);
  if (!eligibility.eligible) {
    return {
      success: false,
      hasFinancialDependencies: eligibility.hasFinancialDependencies,
      dependencies: eligibility.dependencies,
      error: eligibility.reason,
      recommendedAction: eligibility.recommendedAction
    };
  }

  // Retrieve requesting administrator
  const adminUser = await database.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, name: true, email: true }
  });

  if (!adminUser?.email) {
    return { success: false, error: "Requesting administrator email not found." };
  }

  // Check rate limit on OTP resends
  try {
    await RateLimitService.checkLimit('OTP_RESEND', adminUser.email);
  } catch (err: any) {
    if (err?.name === 'RateLimitError') {
      return { success: false, error: "Too many verification code requests. Please wait before requesting another." };
    }
  }

  // Generate 6-digit cryptographic OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashToken(rawOtp);
  const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiry

  // Identifiers binding OTP specifically to member, administrator and request
  const otpIdentifier = `del_otp:${memberUserId}:${actorUserId}`;
  const metaIdentifier = `del_meta:${memberUserId}:${actorUserId}`;
  const attemptsIdentifier = `del_att:${memberUserId}:${actorUserId}`;
  const approvedIdentifier = `del_appr:${memberUserId}`;

  // Purge any stale tokens
  await database.verificationToken.deleteMany({
    where: {
      identifier: {
        in: [otpIdentifier, metaIdentifier, attemptsIdentifier, approvedIdentifier]
      }
    }
  });

  // Store hashed OTP (plaintext never stored)
  await database.verificationToken.create({
    data: {
      identifier: otpIdentifier,
      token: hashedOtp,
      expires
    }
  });

  // Store deletion reason and metadata bound to token
  const metadataPayload = JSON.stringify({
    memberUserId,
    reason: reason.trim(),
    actorUserId,
    createdAt: now.toISOString()
  });
  await database.verificationToken.create({
    data: {
      identifier: metaIdentifier,
      token: hashToken(metadataPayload + "_" + rawOtp),
      expires
    }
  });

  // Dispatch email to administrator's registered address
  const template = memberDeletionOtpEmail({
    adminName: adminUser.name || adminUser.email,
    memberName: eligibility.member.name || eligibility.member.email,
    memberId: eligibility.member.memberId || "UNASSIGNED",
    otp: rawOtp,
    reason: reason.trim()
  });

  await emailService.send({
    to: adminUser.email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });

  // Audit log OTP request (plaintext OTP NEVER logged)
  await logAudit(
    actorUserId,
    "MEMBER_DELETION_OTP_REQUESTED",
    "User",
    memberUserId,
    {
      reason: reason.trim(),
      memberName: eligibility.member.name,
      memberId: eligibility.member.memberId,
      adminEmail: adminUser.email,
      expiresAt: expires.toISOString()
    },
    database
  );

  const maskedEmail = adminUser.email.replace(/(.{2})(.*)(?=@)/, (_: any, a: any, b: any) => a + '*'.repeat(b.length));

  return {
    success: true,
    message: `A 6-digit verification code has been dispatched to ${maskedEmail}. It expires in 5 minutes.`,
    targetMemberId: eligibility.member.memberId
  };
}

export async function requestMemberDeletionOtp(memberUserId: string, reason: string) {
  const sessionUserId = await requirePermission("MEMBER_DELETE");
  return requestMemberDeletionOtpCore(
    { memberUserId, reason, actorUserId: sessionUserId },
    db
  );
}

/**
 * Step 2: Verify OTP and exact Member ID match.
 * Enforces:
 * - 5-minute expiry
 * - 5-attempt lockout
 * - Single-use consumption
 * - Exact Member ID confirmation
 */
export async function verifyMemberDeletionOtpCore(
  params: {
    memberUserId: string;
    otp: string;
    confirmedMemberId: string;
    actorUserId: string;
    now?: Date;
  },
  database: any = db,
  authorizationService: any = AuthorizationService
) {
  const { memberUserId, otp, confirmedMemberId, actorUserId, now = new Date() } = params;

  if (!otp || !/^\d{6}$/.test(otp.trim())) {
    return { success: false, error: "Please enter a valid 6-digit verification code." };
  }
  if (!confirmedMemberId || !confirmedMemberId.trim()) {
    return { success: false, error: "You must enter the exact Member ID to confirm permanent deletion." };
  }

  const otpIdentifier = `del_otp:${memberUserId}:${actorUserId}`;
  const metaIdentifier = `del_meta:${memberUserId}:${actorUserId}`;
  const attemptsIdentifier = `del_att:${memberUserId}:${actorUserId}`;
  const approvedIdentifier = `del_appr:${memberUserId}`;

  // Check 5-attempt lockout
  const attemptRecord = await database.verificationToken.findFirst({
    where: { identifier: attemptsIdentifier }
  });

  let currentAttempts = attemptRecord ? parseInt(attemptRecord.token, 10) || 0 : 0;
  if (currentAttempts >= 5) {
    // Invalidate OTP on lockout
    await database.verificationToken.deleteMany({
      where: { identifier: { in: [otpIdentifier, metaIdentifier, attemptsIdentifier] } }
    });
    await logAudit(actorUserId, "MEMBER_DELETION_OTP_LOCKOUT", "User", memberUserId, { currentAttempts }, database);
    return {
      success: false,
      lockedOut: true,
      error: "Maximum verification attempts exceeded (5 attempts). For security, this deletion request has been cancelled. Please request a new code."
    };
  }

  // Lookup OTP token
  const existingOtp = await database.verificationToken.findFirst({
    where: { identifier: otpIdentifier }
  });

  if (!existingOtp) {
    return { success: false, error: "No active verification code found or code has already been used. Please request a new code." };
  }

  // Check expiration
  if (new Date(existingOtp.expires) < now) {
    await database.verificationToken.deleteMany({
      where: { identifier: { in: [otpIdentifier, metaIdentifier, attemptsIdentifier] } }
    });
    await logAudit(actorUserId, "MEMBER_DELETION_OTP_EXPIRED", "User", memberUserId, {}, database);
    return { success: false, expired: true, error: "Verification code has expired. Please request a new code." };
  }

  // Check OTP cryptographic match
  const hashedInput = hashToken(otp.trim());
  if (hashedInput !== existingOtp.token) {
    currentAttempts += 1;
    await database.verificationToken.deleteMany({ where: { identifier: attemptsIdentifier } });
    await database.verificationToken.create({
      data: {
        identifier: attemptsIdentifier,
        token: currentAttempts.toString(),
        expires: existingOtp.expires
      }
    });

    await logAudit(
      actorUserId,
      "MEMBER_DELETION_OTP_FAILED",
      "User",
      memberUserId,
      { attempt: currentAttempts, remainingAttempts: Math.max(0, 5 - currentAttempts) },
      database
    );

    return {
      success: false,
      remainingAttempts: Math.max(0, 5 - currentAttempts),
      error: `Invalid verification code. ${Math.max(0, 5 - currentAttempts)} attempt(s) remaining.`
    };
  }

  // Verify Member ID match
  const member = await database.user.findUnique({
    where: { id: memberUserId },
    include: { memberProfile: true }
  });

  const actualMemberId = (member?.memberProfile?.memberId || "UNASSIGNED").trim().toUpperCase();
  const suppliedMemberId = confirmedMemberId.trim().toUpperCase().replace(/[\/\s-]/g, "");
  const normalizedActual = actualMemberId.replace(/[\/\s-]/g, "");

  if (suppliedMemberId !== normalizedActual && confirmedMemberId.trim() !== actualMemberId) {
    return {
      success: false,
      error: `Member ID mismatch. You entered '${confirmedMemberId.trim()}', but the member's Member ID is '${actualMemberId}'.`
    };
  }

  // Single-use: Consume and delete OTP token immediately
  await database.verificationToken.deleteMany({
    where: { identifier: { in: [otpIdentifier, attemptsIdentifier] } }
  });

  // Verify whether the acting administrator is the Primary Owner
  const isOwner = await authorizationService.isOwner(actorUserId);

  // Record OTP verified state for Owner approval step (15-min window)
  const approvalToken = hashToken(`approved_${memberUserId}_${Date.now()}`);
  await database.verificationToken.deleteMany({ where: { identifier: approvedIdentifier } });
  await database.verificationToken.create({
    data: {
      identifier: approvedIdentifier,
      token: approvalToken,
      expires: new Date(now.getTime() + 15 * 60 * 1000)
    }
  });

  await logAudit(
    actorUserId,
    "MEMBER_DELETION_OTP_VERIFIED",
    "User",
    memberUserId,
    {
      memberName: member?.name,
      memberId: actualMemberId,
      isOwner,
      approvalTokenCreated: true
    },
    database
  );

  return {
    success: true,
    requiresOwnerApproval: !isOwner,
    isOwner,
    message: isOwner
      ? "Verification code and Member ID verified. As Primary Owner, you may now execute permanent deletion."
      : "Verification code and Member ID verified. Deletion request submitted for Primary Owner approval."
  };
}

export async function verifyMemberDeletionOtp(
  memberUserId: string,
  otp: string,
  confirmedMemberId: string
) {
  const sessionUserId = await requirePermission("MEMBER_DELETE");
  return verifyMemberDeletionOtpCore(
    { memberUserId, otp, confirmedMemberId, actorUserId: sessionUserId },
    db
  );
}

/**
 * Step 3: Owner Approval & Execution (PHASE 3 & 4)
 * Strict Requirement: ONLY the Primary Owner can authorize and execute permanent deletion.
 * Re-checks all financial and legal dependencies prior to execution.
 * Preserves audit history.
 */
export async function ownerApproveAndExecuteDeletionCore(
  params: {
    memberUserId: string;
    reason: string;
    actorUserId: string;
    now?: Date;
  },
  database: any = db,
  authorizationService: any = AuthorizationService
) {
  const { memberUserId, reason, actorUserId, now = new Date() } = params;

  // Strict server-side Primary Owner authorization
  await authorizationService.requireOwner(actorUserId);

  // Verify approval record exists
  const approvedIdentifier = `del_appr:${memberUserId}`;
  const approvalRecord = await database.verificationToken.findFirst({
    where: { identifier: approvedIdentifier }
  });

  if (!approvalRecord || new Date(approvalRecord.expires) < now) {
    return {
      success: false,
      error: "Cannot execute deletion: Verification code was not verified or has expired. A fresh OTP verification is required."
    };
  }

  // Re-verify financial dependency integrity (never silently cascade delete financial records)
  const eligibility = await checkMemberDeletionEligibilityCore(memberUserId, database);
  if (!eligibility.eligible) {
    return {
      success: false,
      hasFinancialDependencies: eligibility.hasFinancialDependencies,
      dependencies: eligibility.dependencies,
      error: eligibility.reason,
      recommendedAction: eligibility.recommendedAction
    };
  }

  // Prevent race conditions: Ensure member still exists
  const member = await database.user.findUnique({
    where: { id: memberUserId },
    include: { memberProfile: true }
  });

  if (!member) {
    return { success: false, error: "Member record not found or already deleted." };
  }

  const memberName = member.name || member.email || "Unknown";
  const memberId = member.memberProfile?.memberId || "UNASSIGNED";
  const memberEmail = member.email;

  // Execute deletion in transaction, preserving audit history
  try {
    await database.$transaction(async (tx: any) => {
      // 0. Concurrency guard: atomically consume approval token inside tx
      const delApproval = await tx.verificationToken.deleteMany({
        where: { identifier: approvedIdentifier }
      });
      if (delApproval.count === 0) {
        throw new Error("Deletion request already processed or concurrent execution detected.");
      }

      // Revalidate inside tx to prevent race conditions
      const txMember = await tx.user.findUnique({
        where: { id: memberUserId },
        include: {
          memberProfile: true,
          subscriptions: {
            select: {
              id: true,
              status: true,
              careCases: { select: { id: true } },
              documents: { select: { id: true } },
            }
          },
          invoices: { select: { id: true } },
          payments: { select: { id: true } },
          receipts: { select: { id: true } },
          ownedDocuments: { select: { id: true } },
        }
      });

      if (!txMember) {
        throw new Error("Member record not found or already deleted.");
      }

      // Strict in-transaction dependency re-verification
      if (
        txMember.invoices?.length > 0 ||
        txMember.payments?.length > 0 ||
        txMember.receipts?.length > 0 ||
        txMember.ownedDocuments?.length > 0 ||
        txMember.subscriptions?.some((s: any) => s.status !== "PENDING" || (s.careCases && s.careCases.length > 0) || (s.documents && s.documents.length > 0))
      ) {
        throw new Error("Transaction aborted: protected financial or operational dependencies detected.");
      }

      // 1. Delete subscription add-ons for eligible pending subscriptions
      if (txMember.subscriptions && txMember.subscriptions.length > 0) {
        await tx.subscriptionAddOn?.deleteMany({
          where: { subscription: { userId: memberUserId } }
        }).catch(() => {});
        // Delete eligible pending subscriptions
        await tx.subscription?.deleteMany({
          where: { userId: memberUserId, status: "PENDING" }
        });
      }

      // 2. Delete dependent profile records
      if (txMember.memberProfile?.id) {
        await tx.sponsor?.deleteMany({ where: { memberProfileId: txMember.memberProfile.id } }).catch(() => {});
        await tx.insuranceDetails?.deleteMany({ where: { memberProfileId: txMember.memberProfile.id } }).catch(() => {});
        await tx.medicalAuthorization?.deleteMany({ where: { memberProfileId: txMember.memberProfile.id } }).catch(() => {});
        await tx.memberProfile.delete({ where: { id: txMember.memberProfile.id } });
      }

      // 3. Delete non-financial direct child relations
      await tx.emergencyContact?.deleteMany({ where: { userId: memberUserId } }).catch(() => {});
      await tx.userRole?.deleteMany({ where: { userId: memberUserId } }).catch(() => {});
      await tx.account?.deleteMany({ where: { userId: memberUserId } }).catch(() => {});
      await tx.session?.deleteMany({ where: { userId: memberUserId } }).catch(() => {});
      await tx.verificationToken?.deleteMany({ where: { identifier: { startsWith: `del_` } } }).catch(() => {});

      // 4. Delete user record
      await tx.user.delete({ where: { id: memberUserId } });

      // 5. Record permanent deletion in AuditLog (entityId preserved; actorUserId = Owner)
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "MEMBER_PERMANENTLY_DELETED",
          entityType: "User",
          entityId: memberUserId,
          metadata: {
            deletedMemberName: memberName,
            deletedMemberId: memberId,
            deletedMemberEmail: memberEmail,
            deletionReason: reason?.trim() || "Owner approved permanent deletion",
            pendingSubscriptionsDeleted: txMember.subscriptions?.length || 0,
            approvedBy: "info.sunshineeldercare@gmail.com",
            timestamp: new Date().toISOString()
          }
        }
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to execute permanent deletion. All changes rolled back."
    };
  }

  return {
    success: true,
    message: `Member ${memberName} (${memberId}) has been permanently deleted. Full audit record created.`
  };
}

export async function ownerApproveAndExecuteDeletion(memberUserId: string, reason: string) {
  const sessionUserId = await requirePermission("MEMBER_DELETE");
  await AuthorizationService.requireOwner(sessionUserId);

  const result = await ownerApproveAndExecuteDeletionCore(
    { memberUserId, reason, actorUserId: sessionUserId },
    db
  );

  if (result.success) {
    revalidatePath("/admin");
    revalidatePath("/admin/members");
    revalidatePath("/admin/members/archived");
  }

  return result;
}

// ============================================================================
// 4. ARCHIVED MEMBERS QUERY
// ============================================================================

export async function getArchivedMembers(query?: string, page: number = 1, limit: number = 50) {
  await requirePermission("MEMBER_VIEW");
  const { getMembersCore } = await import("@/app/actions/admin");
  return getMembersCore(query, page, limit, db, true, undefined, undefined, true);
}
