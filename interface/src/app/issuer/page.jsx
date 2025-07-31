"use client";

import ConnectionsList from "@/components/ConnectionsList";

export default function IssuerPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-4xl w-full p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Issuer Panel</h1>
        <ConnectionsList />
      </div>
    </div>
  );
}
