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

    // Strict member isolation: Query only receipts belonging to this authenticated member
    const receipts = await db.receipt.findMany({
      where: { userId: member.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentMethod: true,
        relatedPlanName: true,
        createdAt: true,
      },
    });

    const documents = receipts.map((r) => ({
      id: r.id,
      documentType: "PAYMENT_RECEIPT",
      title: `Official Receipt #${r.receiptNumber}`,
      receiptNumber: r.receiptNumber,
      amount: Number(r.amount),
      currency: "INR",
      issueDate: r.createdAt.toISOString().split("T")[0],
      paymentMethod: r.paymentMethod || "ONLINE",
      planName: r.relatedPlanName || "Sunshine Care Package",
      downloadUrl: `/api/receipts/${r.id}/download`,
    }));

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error("[MEMBER_DOCUMENTS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to load member documents" },
      { status: 500 }
    );
  }
}
