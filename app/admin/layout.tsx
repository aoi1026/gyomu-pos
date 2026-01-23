'use client';

import { useState } from 'react';
import { Table } from 'lucide-react';
import RealTimeTableStatus from '@/components/admin/RealTimeTableStatus';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showTableStatus, setShowTableStatus] = useState(false);

  return (
    <>
      {children}
      
      {/* Floating Real-Time Table Status Button (Always visible on admin pages) */}
      <button
        onClick={() => setShowTableStatus(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
        aria-label="リアルタイムテーブル状態"
      >
        <Table className="w-6 h-6" />
        {/* <span className="hidden sm:inline font-medium">テーブル状態</span> */}
      </button>
      
      <RealTimeTableStatus 
        open={showTableStatus} 
        onClose={() => setShowTableStatus(false)} 
      />
    </>
  );
}

