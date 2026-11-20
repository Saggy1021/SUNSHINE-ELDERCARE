import { NextResponse } from "next/server";
import { getAuthenticatedMember } from "@/lib/auth/member-auth";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedMember(req);
    if (!auth.authenticated || !auth.member) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    return NextResponse.json({
      success: true,
      member: auth.member,
      subscription: auth.member.subscription,
    });
  } catch (error: any) {
    console.error("[MEMBER_ME_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch member details" },
      { status: 500 }
    );
  }
}
