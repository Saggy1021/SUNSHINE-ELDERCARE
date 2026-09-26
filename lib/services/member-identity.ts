import { db } from "../db";

export class MemberIdentityService {
  /**
   * Generates a unique business Member ID.
   * Format: SEC/S/1001/SAKR or SEC/D/1001/SAKR
   * S = Single, D = Couple
   */
  static async generateMemberId(
    firstName: string,
    lastName: string,
    type: "S" | "D" = "S"
  ): Promise<string> {
    // 1. Get first 2 letters of first name and last name
    const fInitial = firstName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase();
    const lInitial = lastName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase();
    const initials = `${fInitial}${lInitial}`;

    // 2. Safely increment the sequence using a database transaction
    // This avoids race conditions by locking/updating atomically.
    const sequence = await db.memberSequence.update({
      where: { id: "MEMBER_SEQ" },
      data: {
        current: {
          increment: 1,
        },
      },
    });

    const serialNumber = sequence.current;

    // 3. Construct ID
    return `SEC/${type}/${serialNumber}/${initials}`;
  }
}
