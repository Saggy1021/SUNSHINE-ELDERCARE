import { db } from "../db";

export class MemberIdentityService {
  /**
   * Generates a unique business Member ID.
   * Format: SEC/S/1001/SAKR or SEC/D/1001/SAKR
   * S = Single, D = Couple
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
    // 1. Get first 2 ASCII letters of first name and last name, with deterministic 'XX' padding
    const cleanFirst = (firstName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
    const cleanLast = (lastName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
    const fInitial = (cleanFirst + "XX").substring(0, 2);
    const lInitial = (cleanLast + "XX").substring(0, 2);
    const initials = `${fInitial}${lInitial}`;

    // 2. Safely increment the sequence using a database transaction with upsert for safe initialization
    const sequence = await client.memberSequence.upsert({
      where: { id: "MEMBER_SEQ" },
      update: {
        current: {
          increment: 1,
        },
      },
      create: {
        id: "MEMBER_SEQ",
        current: 1001,
      },
    });

    const serialNumber = sequence.current;

    // 3. Construct ID
    return `SEC/${type}/${serialNumber}/${initials}`;
  }

  /**
   * Ensures a user has a permanent unique Member ID after a verified payment.
   * If the user already has a Member ID, preserves it permanently without generating a duplicate.
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
      return profile.memberId;
    }

    // 2. Determine member designation (S = Single, D = Couple)
    const type: "S" | "D" = variantType?.toUpperCase() === "COUPLE" ? "D" : "S";

    // 3. Extract member name from profile, or fall back to user record
    let firstName = profile?.firstName || "";
    let lastName = profile?.lastName || "";

    if (!firstName) {
      const user = await client.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      if (user?.name) {
        const parts = user.name.trim().split(/\s+/);
        firstName = parts[0] || "Member";
        lastName = parts.slice(1).join(" ") || "";
      } else {
        firstName = "Member";
      }
    }

    // 4. Generate unique Member ID
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
