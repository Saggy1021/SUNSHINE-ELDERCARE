import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";
import { AuthorizationService } from "@/lib/services/authorization";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    
    // Check if the user has any admin-level portal access
    const hasAccess = await AuthorizationService.hasAdminPortalAccess(user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const q = searchParams.get("q");

    if (role === "Member") {
      // Fetch users with role 'MEMBER', bounded for dropdowns
      const members = await db.user.findMany({
        where: { 
          role: 'MEMBER',
          ...(q ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          } : {})
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
        take: 100
      });
      return NextResponse.json(members);
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
