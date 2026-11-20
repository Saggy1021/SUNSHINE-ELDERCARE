import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedMember } from "@/lib/auth/member-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedMember(req);
    if (!auth.authenticated || !auth.member) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const { member } = auth;

    // Strict isolation: only fetch complaints belonging to the authenticated member
    const complaints = await db.memberComplaint.findMany({
      where: { userId: member.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        complaintNumber: true,
        category: true,
        subject: true,
        description: true,
        status: true,
        adminResponse: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      complaints,
    });
  } catch (error: any) {
    console.error("[MEMBER_COMPLAINTS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch complaints" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedMember(req);
    if (!auth.authenticated || !auth.member) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.statusCode || 401 }
      );
    }

    const { member } = auth;
    const body = await req.json();
    const { category, subject, description } = body;

    if (!category || !subject?.trim() || !description?.trim()) {
      return NextResponse.json(
        { success: false, error: "Category, subject, and description are required." },
        { status: 400 }
      );
    }

    // Generate atomic sequential complaint number
    const seq = await db.complaintSequence.upsert({
      where: { id: "CMP_SEQ" },
      update: { current: { increment: 1 } },
      create: { id: "CMP_SEQ", current: 1001 },
    });
    const complaintNumber = `CMP-${seq.current}`;

    const newComplaint = await db.memberComplaint.create({
      data: {
        complaintNumber,
        userId: member.id,
        memberId: member.memberId,
        memberName: member.name,
        memberPhone: member.phone || null,
        category: category.trim(),
        subject: subject.trim(),
        description: description.trim(),
        status: "NEW",
      },
      select: {
        id: true,
        complaintNumber: true,
        category: true,
        subject: true,
        description: true,
        status: true,
        adminResponse: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your complaint has been submitted successfully to the Sunshine Care Operations Desk.",
        complaint: newComplaint,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[MEMBER_COMPLAINTS_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit complaint" },
      { status: 500 }
    );
  }
}
