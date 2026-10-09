"use client";

import { useState } from "react";
import { acceptAdminInvitationAction } from "@/app/actions/admin-users";
import { useRouter } from "next/navigation";

export function AdminInviteClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await acceptAdminInvitationAction(token, new FormData(e.currentTarget));
      alert("Account activated successfully! You can now log in.");
      router.push("/login");
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-slate-700">New Password</label>
        <div className="mt-1">
          <input
            name="password"
            type="password"
            required
            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? "Activating..." : "Set Password & Activate"}
        </button>
      </div>
    </form>
  );
}
