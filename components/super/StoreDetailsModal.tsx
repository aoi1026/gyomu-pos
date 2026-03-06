'use client';

import { X, Store, Users, BarChart3, TrendingUp, Clock, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store as StoreModel, mockStaff, mockTables, mockOrders } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/mock-data';

interface StoreDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreModel | null;
}

export default function StoreDetailsModal({ isOpen, onClose, store }: StoreDetailsModalProps) {
  if (!isOpen || !store) return null;

  const storeStaff = mockStaff.filter(s => s.store_id === store.id);
  const storeTables = mockTables.filter(t => t.store_id === store.id);
  const storeOrders = mockOrders.filter(o => o.store_id === store.id);

  const activeStaff = storeStaff.filter(s => s.active);
  const totalSales = storeOrders.reduce((sum, order) => sum + order.total_yen, 0);
  const averageOrderValue = storeOrders.length > 0 ? totalSales / storeOrders.length : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
              <p className="text-sm text-gray-500">店舗詳細情報</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">スタッフ数</p>
                    <p className="text-xl font-bold text-blue-900">{activeStaff.length}/{storeStaff.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">総売上</p>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(totalSales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">平均注文額</p>
                    <p className="text-xl font-bold text-purple-900">{formatCurrency(averageOrderValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <Store className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-700">テーブル数</p>
                    <p className="text-xl font-bold text-orange-900">{storeTables.length}台</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Store className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">店舗名:</span>
                    <span className="font-medium">{store.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">営業終了:</span>
                    <span className="font-medium">{store.closing_time}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Percent className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">消費税率:</span>
                    <span className="font-medium">{(store.tax_bp / 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Percent className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">サービス料率:</span>
                    <span className="font-medium">{(store.service_charge_bp / 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
