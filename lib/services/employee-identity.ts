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
    // 1. Get first 2 letters of first name and last name
    const fLetters = firstName.replace(/[^A-Za-z]/g, "");
    const lLetters = lastName.replace(/[^A-Za-z]/g, "");

    if (fLetters.length < 2 || lLetters.length < 2) {
      throw new Error("First name and last name must each contain at least two alphabetical characters.");
    }

    const fInitial = fLetters.substring(0, 2).toUpperCase();
    const lInitial = lLetters.substring(0, 2).toUpperCase();
    const initials = `${fInitial}${lInitial}`;

    // 2. Safely increment the sequence using a database transaction
    // Seed is 100, so first employee will be 101.
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

    // 3. Construct ID
    return `SEC/${serialNumber}/${initials}`;
  }
}
