'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function MemberError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Member detail error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <AlertCircle className="h-10 w-10 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Failed to load member</h2>
      <p className="text-slate-600 max-w-md mb-8">
        There was a problem retrieving the member details. This could be due to a missing relation or a malformed ID.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
        <Link
          href="/admin/members"
          className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Members
        </Link>
      </div>
    </div>
  );
}
