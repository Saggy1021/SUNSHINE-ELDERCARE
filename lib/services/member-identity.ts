import { db } from "../db";

export class MemberIdentityService {
  /**
   * Normalizes any Member ID by removing separators (slashes, hyphens, spaces).
   * Ensures legacy slash format (e.g. SEC/D/1001/PRTY) is resolved to canonical format (SECD1001PRTY).
   */
  static normalizeMemberId(id?: string | null): string {
    if (!id) return "";
    return id.replace(/[\/\s-]/g, "").toUpperCase();
  }

  /**
   * Validates whether a Member ID matches either the canonical slash-free format
   * (e.g. SECD1001PRTY, SECS1002SAKR) or legacy slash format (SEC/D/1001/PRTY).
   */
  static isValidMemberId(id?: string | null): boolean {
    if (!id) return false;
    const clean = id.trim().toUpperCase();
    const canonicalRegex = /^SEC[SD]\d{4}[A-Z]{4}$/;
    const legacyRegex = /^SEC\/[SD]\/\d{4}\/[A-Z]{4}$/;
    return canonicalRegex.test(clean) || legacyRegex.test(clean);
  }

  /**
   * Generates a unique business Member ID in canonical format without separators.
   * Format: SECS1002SAKR or SECD1002SAKR
   * SECS = Senior / Single membership
   * SECD = Domestic / Couple membership
   *
   * 1001 is strictly reserved for Wg Cdr Prabir Chakraverty (SECD1001PRTY).
   * New registrations receive sequential serial numbers starting from 1002.
   *
   * Concurrency-safe: Uses transaction-aware client and atomic sequence upsert/increment.
   * Resilient: Handles missing, single-character, and non-ASCII names safely.
   */
  static async generateMemberId(
    firstName: string,
    lastName: string,
    type: "S" | "D" = "S",
    client: any = db
  ): Promise<string> {
    // 1. Strip any leading salutation or professional/military rank from firstName so salutation NEVER influences ID
    const titleRegex = /^(mr|mrs|ms|miss|dr|prof|col|lt|brig|capt|grp\s*cpt|wg\s*cdr|major|gen)\.?\s+/i;
    const strippedFirst = (firstName || "").trim().replace(titleRegex, "").trim();
    const strippedLast = (lastName || "").trim();

    // Get first 2 ASCII letters of first name and last name, with deterministic 'XX' padding
    const cleanFirst = (strippedFirst || firstName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
    const cleanLast = (strippedLast || lastName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
    const fInitial = (cleanFirst + "XX").substring(0, 2);
    const lInitial = (cleanLast + "XX").substring(0, 2);
    const initials = `${fInitial}${lInitial}`;

    // Special reservation check: If generating specifically for Prabir Chakraverty
    if (
      (cleanFirst.includes("PRABIR") || firstName?.toUpperCase().includes("PRABIR")) &&
      (cleanLast.includes("CHAKRAVERTY") || lastName?.toUpperCase().includes("CHAKRAVERTY"))
    ) {
      return `SECD1001PRTY`;
    }

    // 2. Safely increment the sequence using a database transaction with upsert for safe initialization.
    // 1001 is reserved for Prabir Chakraverty (SECD1001PRTY).
    // Initializing the sequence for new registrations starts at 1002.
    const sequence = await client.memberSequence.upsert({
      where: { id: "MEMBER_SEQ" },
      update: {
        current: {
          increment: 1,
        },
      },
      create: {
        id: "MEMBER_SEQ",
        current: 1002,
      },
    });

    const serialNumber = sequence.current;

    // 3. Construct canonical ID without separators: e.g. SECD1002SAKR or SECS1002SAKR
    return `SEC${type}${serialNumber}${initials}`;
  }

  /**
   * Ensures a user has a permanent unique Member ID after a verified payment.
   * If the user already has a Member ID, preserves it permanently without generating a duplicate.
   * Seamlessly normalizes any historical slash-separated ID to canonical format.
   * Concurrency-safe: Runs inside the settlement transaction client.
   */
  static async ensureMemberIdForUser(
    userId: string,
    variantType: string = "SINGLE",
    client: any = db
  ): Promise<string> {
    // 1. Check if user already has an assigned Member ID
    let profile = await client.memberProfile.findUnique({
      where: { userId },
    });

    if (profile?.memberId) {
      // If historical record has forward slashes, normalize to canonical format
      if (profile.memberId.includes("/")) {
        const canonical = this.normalizeMemberId(profile.memberId);
        await client.memberProfile.update({
          where: { userId },
          data: { memberId: canonical },
        });
        return canonical;
      }
      return profile.memberId;
    }

    // Special reservation check: Wg Cdr Prabir Chakraverty is always assigned SECD1001PRTY
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    const isPrabir =
      user?.email?.toLowerCase() === "p.chakraverty47@gmail.com" ||
      (user?.name?.toUpperCase().includes("PRABIR") &&
        user?.name?.toUpperCase().includes("CHAKRAVERTY"));

    if (isPrabir) {
      const prabirId = "SECD1001PRTY";
      if (profile) {
        await client.memberProfile.update({
          where: { userId },
          data: { memberId: prabirId },
        });
      } else {
        await client.memberProfile.create({
          data: {
            userId,
            memberId: prabirId,
            firstName: profile?.firstName || "Wg Cdr PRABIR",
            lastName: profile?.lastName || "CHAKRAVERTY",
          },
        });
      }
      return prabirId;
    }

    // 2. Determine member designation (S = Single, D = Couple)
    const type: "S" | "D" = variantType?.toUpperCase() === "COUPLE" ? "D" : "S";

    // 3. Extract member name from profile, or fall back to user record
    let firstName = profile?.firstName || "";
    let lastName = profile?.lastName || "";

    if (!firstName) {
      if (user?.name) {
        const cleanedUserName = user.name
          .replace(/^(mr|mrs|ms|miss|dr|prof|col|lt|brig|capt|grp\s*cpt|wg\s*cdr|major|gen)\.?\s+/i, "")
          .trim();
        const parts = cleanedUserName.split(/\s+/);
        firstName = parts[0] || "Member";
        lastName = parts.slice(1).join(" ") || "";
      } else {
        firstName = "Member";
      }
    }

    // 4. Generate unique Member ID in canonical format (SECS... or SECD...)
    const memberId = await this.generateMemberId(firstName, lastName, type, client);

    // 5. Permanently assign to MemberProfile
    if (profile) {
      await client.memberProfile.update({
        where: { userId },
        data: { memberId },
      });
    } else {
      await client.memberProfile.create({
        data: {
          userId,
          memberId,
          firstName: firstName || "Member",
          lastName: lastName || "",
        },
      });
    }

    return memberId;
  }
}
