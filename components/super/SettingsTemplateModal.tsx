'use client';

import { useState } from 'react';
import { X, Settings, Store, CheckSquare, Square, AlertTriangle, Percent, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { mockStores } from '@/lib/mock-data';

interface SettingsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDistribute: (storeIds: string[], settings: any) => void;
}

export default function SettingsTemplateModal({ isOpen, onClose, onDistribute }: SettingsTemplateModalProps) {
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    tax_bp: 1000,
    service_charge_bp: 1000,
    closing_time: '05:00'
  });

  const handleStoreToggle = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStores(mockStores.map(store => store.id));
  };

  const handleDeselectAll = () => {
    setSelectedStores([]);
  };

  const handleSubmit = () => {
    if (selectedStores.length === 0) return;
    onDistribute(selectedStores, settings);
    handleClose();
  };

  const handleClose = () => {
    setSelectedStores([]);
    setSettings({
      tax_bp: 1000,
      service_charge_bp: 1000,
      closing_time: '05:00'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">設定テンプレート配布</h2>
              <p className="text-sm text-gray-500">複数店舗に設定を一括配布できます</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">設定値</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">消費税率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="2000"
                    step="10"
                    value={settings.tax_bp}
                    onChange={(e) => setSettings({ ...settings, tax_bp: parseInt(e.target.value) || 0 })}
                    className="pl-10"
                  />
                  <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
                <div className="text-sm text-gray-500">{(settings.tax_bp / 100).toFixed(1)}%</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">サービス料率</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="5000"
                    step="10"
                    value={settings.service_charge_bp}
                    onChange={(e) => setSettings({ ...settings, service_charge_bp: parseInt(e.target.value) || 0 })}
                    className="pl-10"
                  />
                  <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
                <div className="text-sm text-gray-500">{(settings.service_charge_bp / 100).toFixed(1)}%</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">営業終了時刻</Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={settings.closing_time}
                    onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                    className="pl-10"
                  />
                  <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">対象店舗</h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  全選択
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  全解除
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mockStores.map((store) => (
                <Card 
                  key={store.id}
                  className={`cursor-pointer transition-all ${
                    selectedStores.includes(store.id) 
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleStoreToggle(store.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {selectedStores.includes(store.id) ? (
                          <CheckSquare className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="flex items-center space-x-2">
                          <Store className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{store.name}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>税率: {(store.tax_bp / 100).toFixed(1)}%</div>
                        <div>サービス料: {(store.service_charge_bp / 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedStores.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-yellow-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span className="font-medium">注意</span>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                選択された {selectedStores.length} 店舗の設定が更新されます。この操作は取り消すことができません。
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose} className="px-6">
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedStores.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6"
          >
            <Settings className="w-4 h-4 mr-2" />
            {selectedStores.length}店舗に配布
          </Button>
        </div>
      </div>
    </div>
  );
}
