import { AdminInviteClient } from "./AdminInviteClient";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export const metadata = {
  title: "Accept Admin Invitation - Sunshine Eldercare",
};

export const dynamic = 'force-dynamic';

export default async function AdminInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Basic validation that the token exists and is valid
  const invitations = await db.adminInvitation.findMany({
    where: { status: 'PENDING' }
  });
  console.log("Found pending invitations:", invitations.map(i => ({ email: i.email, hash: i.tokenHash, expiresAt: i.expiresAt })));
  console.log("Testing against token:", token);

  let validInvitation = null;
  for (const inv of invitations) {
    if (inv.expiresAt < new Date()) continue;
    const isMatch = await bcrypt.compare(token, inv.tokenHash);
    if (isMatch) {
      validInvitation = inv;
      break;
    }
  }

  if (!validInvitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Invalid Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            This invitation link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Accept Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Welcome, {validInvitation.name}! Please set your password to activate your account.
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AdminInviteClient token={token} />
        </div>
      </div>
    </div>
  );
}
