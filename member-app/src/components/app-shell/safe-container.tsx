import React from 'react';

export function SafeContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF9F5] flex justify-center">
      <div className="w-full max-w-md bg-[#FAF9F5] min-h-screen flex flex-col shadow-xl relative border-x border-[#E8E6DF]/60">
        {children}
      </div>
    </div>
  );
}

