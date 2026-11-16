import { db } from "../db";

export class EmployeeIdentityService {
  /**
   * Generates a unique business Employee ID.
   * Format: SEC/101/SAKA
   * 
   * @param firstName Employee first name
   * @param lastName Employee last name
   * @returns Generated Employee ID string
   */
  static async generateEmployeeId(
    firstName: string,
    lastName: string
  ): Promise<string> {
    // 1. Get first 2 letters of first name and last name with fallback
    const fLetters = firstName.replace(/[^A-Za-z]/g, "");
    const lLetters = lastName.replace(/[^A-Za-z]/g, "");

    const fInitial = (fLetters.length >= 2 ? fLetters.substring(0, 2) : (fLetters + "X").substring(0, 2)).toUpperCase();
    const lInitial = (lLetters.length >= 2 ? lLetters.substring(0, 2) : (lLetters + "X").substring(0, 2)).toUpperCase();
    const initials = `${fInitial}${lInitial}`;

    // 2. Safely increment the sequence using a database transaction with collision loop
    let candidateId = "";
    let collision = true;

    while (collision) {
      const sequence = await db.employeeSequence.upsert({
        where: { id: "EMP_SEQ" },
        create: { id: "EMP_SEQ", current: 101 },
        update: {
          current: {
            increment: 1,
          },
        },
      });

      const serialNumber = sequence.current;
      candidateId = `SEC/${serialNumber}/${initials}`;

      const existing = await db.employee.findUnique({
        where: { employeeId: candidateId },
        select: { id: true },
      });

      if (!existing) {
        collision = false;
      }
    }

    return candidateId;
  }
}
