import { NextResponse } from "next/server";
import { destroyMemberSession } from "@/lib/auth/member-auth";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      await destroyMemberSession(token);
    }
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: true });
  }
}
