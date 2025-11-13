'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, ExternalLink, Circle } from 'lucide-react';
import TableViewer from './TableViewer';

interface TableData {
  id: number;
  name: string;
  capacity: number;
}

interface SessionData {
  id: number;
  table_id: number;
  client: number;
  set_count: number;
  status: number;
  created_at: string;
}

interface RealTimeTableStatusProps {
  open: boolean;
  onClose: () => void;
}

export default function RealTimeTableStatus({ open, onClose }: RealTimeTableStatusProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [viewingTableId, setViewingTableId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tables
      const tablesRes = await fetch('/api/tables');
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData.tables || []);
      }

      // Fetch active sessions (status=1)
      const sessionsRes = await fetch('/api/sessions');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.data?.filter((s: SessionData) => s.status === 1) || []);
      }
    } catch (error) {
      console.error('テーブル状態の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTableSession = (tableId: number) => {
    return sessions.find(s => s.table_id === tableId);
  };

  const handleAccessTable = (tableId: number) => {
    // Open table in embedded viewer
    setViewingTableId(tableId);
  };

  const handleCloseViewer = () => {
    setViewingTableId(null);
    // Refresh data when returning from viewer
    fetchData();
  };

  const filteredTables = tables.filter(table => {
    const hasSession = getTableSession(table.id);
    if (activeTab === 'empty') {
      return !hasSession;
    } else if (activeTab === 'active') {
      return !!hasSession;
    }
    return true; // 'all'
  });

  const renderTableCard = (table: TableData) => {
    const session = getTableSession(table.id);
    const isEmpty = !session;

    return (
      <Card 
        key={table.id} 
        className={`relative ${isEmpty ? 'bg-gray-50' : 'bg-blue-50 border-blue-300'}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">{table.name}</h3>
            {isEmpty ? (
              <Badge variant="secondary" className="bg-gray-300 text-gray-700">
                <Circle className="w-3 h-3 mr-1" />
                空席
              </Badge>
            ) : (
              <Badge className="bg-green-500 text-white">
                <Circle className="w-3 h-3 mr-1 fill-current" />
                セッション中
              </Badge>
            )}
          </div>

          {session ? (
            <div className="space-y-2 mt-3">
              <div className="flex items-center text-sm text-gray-700">
                <Users className="w-4 h-4 mr-2" />
                <span>顧客数: {session.client || 0}名</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <Clock className="w-4 h-4 mr-2" />
                <span>セット延長: {session.set_count}回</span>
              </div>
              <Button
                size="sm"
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                onClick={() => handleAccessTable(table.id)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                アクセス
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
              利用可能
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open && !viewingTableId} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">リアルタイムテーブル状態</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="empty">空テーブル</TabsTrigger>
              <TabsTrigger value="active">セッション中</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="all" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="empty" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    空テーブルがありません
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    アクティブなセッションがありません
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Embedded Table Viewer */}
      <TableViewer tableId={viewingTableId} onClose={handleCloseViewer} />
    </>
  );
}

