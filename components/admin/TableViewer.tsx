'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableViewerProps {
  tableId: number | null;
  onClose: () => void;
}

export default function TableViewer({ tableId, onClose }: TableViewerProps) {
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    if (tableId) {
      // Force iframe reload when tableId changes
      setIframeKey(prev => prev + 1);
    }
  }, [tableId]);

  if (!tableId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header with back button */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">テーブル {tableId} - 管理者ビュー</h2>
            <p className="text-sm text-blue-100">このウィンドウから直接テーブルを操作できます</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Iframe container */}
        <div className="flex-1 relative overflow-hidden">
          <iframe
            key={iframeKey}
            src={`/table/${tableId}`}
            className="absolute inset-0 w-full h-full border-0"
            title={`テーブル ${tableId}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>

        {/* Footer indicator */}
        <div className="bg-gray-100 px-6 py-2 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            管理者モード - テーブル操作中
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-700"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

