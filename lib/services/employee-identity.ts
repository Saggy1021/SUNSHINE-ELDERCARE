import { db } from "../db";

export class EmployeeIdentityService {
  /**
   * Generates a 4-letter name-derived suffix:
   * Rule: First 2 letters of First Name + LAST 2 letters of Surname.
   * Salutations are strictly stripped and never influence generation.
   *
   * @param firstName Employee first name
   * @param lastName Employee last name
   * @returns 4-character uppercase suffix
   */
  static extractSuffix(firstName: string, lastName: string): string {
    // 1. Strip any leading salutation or professional/military rank from firstName so salutation NEVER influences ID
    const titleRegex = /^(mr|mrs|ms|miss|dr|prof|col|lt|brig|capt|grp\s*cpt|wg\s*cdr|major|gen)\.?\s+/i;
    const strippedFirst = (firstName || "").trim().replace(titleRegex, "").trim();
    const strippedLast = (lastName || "").trim();

    // Canonical Standard: First 2 ASCII letters of First Name + LAST 2 ASCII letters of Surname
    const cleanFirst = (strippedFirst || firstName || "").replace(/[^A-Za-z]/g, "").toUpperCase();
    const cleanLast = (strippedLast || lastName || "").replace(/[^A-Za-z]/g, "").toUpperCase();

    const fInitial = (cleanFirst + "XX").substring(0, 2);
    let lInitial = "XX";
    if (cleanLast.length >= 2) {
      lInitial = cleanLast.slice(-2);
    } else if (cleanLast.length === 1) {
      lInitial = `${cleanLast}X`;
    }

    return `${fInitial}${lInitial}`;
  }

  /**
   * Normalizes an Employee ID by stripping slashes, dashes, spaces, and converting to uppercase.
   * Seamlessly normalizes legacy slash format (e.g. SEC/184/SAAR -> SEC184SAAR).
   */
  static normalizeEmployeeId(id: string): string {
    if (!id) return "";
    return id.trim().replace(/[\/\s-]/g, "").toUpperCase();
  }

  /**
   * Validates whether an Employee ID adheres to the canonical format: SEC + number + 4-letter suffix.
   */
  static isValidEmployeeId(id: string): boolean {
    if (!id) return false;
    const normalized = this.normalizeEmployeeId(id);
    return /^SEC\d+[A-Z]{4}$/.test(normalized);
  }

  /**
   * Generates a unique business Employee ID.
   * Format: SEC + sequence number + name-derived suffix (e.g. SEC185TAAM).
   * Strictly NO slashes, spaces, or separators.
   *
   * @param firstName Employee first name
   * @param lastName Employee last name
   * @param client Database client or transaction client
   * @returns Generated Employee ID string
   */
  static async generateEmployeeId(
    firstName: string,
    lastName: string,
    client: any = db
  ): Promise<string> {
    const initials = this.extractSuffix(firstName, lastName);

    // Increment the sequence using atomic upsert with collision loop
    let candidateId = "";
    let collision = true;

    while (collision) {
      const sequence = await client.employeeSequence.upsert({
        where: { id: "EMP_SEQ" },
        create: { id: "EMP_SEQ", current: 101 },
        update: {
          current: {
            increment: 1,
          },
        },
      });

      const serialNumber = sequence.current;
      candidateId = `SEC${serialNumber}${initials}`;

      const existing = await client.employee.findUnique({
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

