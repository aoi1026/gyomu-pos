'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableViewerProps {
  tableId: number | null;
  onClose: () => void;
}

export default function TableViewer({ tableId, onClose }: TableViewerProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dataSentRef = useRef(false);

  useEffect(() => {
    if (tableId) {
      setIsLoading(true);
      setError(null);
      dataSentRef.current = false;
      // Force iframe reload when tableId changes
      setIframeKey(prev => prev + 1);
      
      // Fetch table storage data
      fetchTableStorageData(tableId);
    }
  }, [tableId]);

  const fetchTableStorageData = async (tableId: number) => {
    try {
      const response = await fetch(`/api/admin/table-storage/${tableId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Wait for iframe to load, then send data
        const checkIframeReady = setInterval(() => {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow && !dataSentRef.current) {
            try {
              // Send localStorage data to iframe
              iframe.contentWindow.postMessage({
                type: 'ADMIN_TABLE_STORAGE_DATA',
                localStorageData: result.data.localStorageData,
                table: result.data.table,
                session: result.data.session
              }, '*');
              
              dataSentRef.current = true;
              clearInterval(checkIframeReady);
              setIsLoading(false);
            } catch (err) {
              console.error('Failed to send data to iframe:', err);
            }
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkIframeReady);
          if (!dataSentRef.current) {
            setError('テーブルデータの送信に失敗しました');
            setIsLoading(false);
          }
        }, 5000);
      } else {
        setError(result.error || 'テーブルデータの取得に失敗しました');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('テーブルストレージデータ取得エラー:', err);
      setError('テーブルデータの取得に失敗しました');
      setIsLoading(false);
    }
  };

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

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">テーブルデータを読み込み中...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => {
                setError(null);
                setIsLoading(true);
                if (tableId) fetchTableStorageData(tableId);
              }}>
                再試行
              </Button>
            </div>
          </div>
        )}

        {/* Iframe container */}
        <div className="flex-1 relative overflow-hidden">
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={`/table/${tableId}`}
            className="absolute inset-0 w-full h-full border-0"
            title={`テーブル ${tableId}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            onLoad={() => {
              // Iframe loaded, data will be sent by the interval check
              if (!dataSentRef.current) {
                // Wait a bit more for the page to initialize
                setTimeout(() => {
                  if (tableId) {
                    fetchTableStorageData(tableId);
                  }
                }, 500);
              }
            }}
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

