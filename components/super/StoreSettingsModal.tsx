'use client';

import { useState, useEffect } from 'react';
import { X, Store, Percent, Clock, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store as StoreModel } from '@/lib/mock-data';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreModel | null;
  onSave: (storeId: string, settings: Partial<StoreModel>) => void;
}

export default function StoreSettingsModal({ isOpen, onClose, store, onSave }: StoreSettingsModalProps) {
  const [formData, setFormData] = useState({
    tax_bp: 1000,
    service_charge_bp: 1000,
    closing_time: '05:00'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when store changes
  useEffect(() => {
    if (store) {
      setFormData({
        tax_bp: store.tax_bp,
        service_charge_bp: store.service_charge_bp,
        closing_time: store.closing_time
      });
    }
  }, [store]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.tax_bp < 0 || formData.tax_bp > 2000) {
      newErrors.tax_bp = '税率は0%〜20%の範囲で設定してください';
    }

    if (formData.service_charge_bp < 0 || formData.service_charge_bp > 5000) {
      newErrors.service_charge_bp = 'サービス料率は0%〜50%の範囲で設定してください';
    }

    if (!formData.closing_time) {
      newErrors.closing_time = '営業終了時刻は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm() && store) {
      onSave(store.id, formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{store.name} - 設定編集</h2>
              <p className="text-sm text-gray-500">店舗設定を変更できます</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tax_bp" className="text-sm font-medium text-gray-700">
              消費税率 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="tax_bp"
                type="number"
                min="0"
                max="2000"
                step="10"
                value={formData.tax_bp}
                onChange={(e) => setFormData({ ...formData, tax_bp: parseInt(e.target.value) || 0 })}
                className={`pl-10 ${errors.tax_bp ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            <div className="text-sm text-gray-500">
              現在の設定: {(formData.tax_bp / 100).toFixed(1)}% (1000 = 10%)
            </div>
            {errors.tax_bp && (
              <div className="flex items-center text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.tax_bp}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_charge_bp" className="text-sm font-medium text-gray-700">
              サービス料率 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="service_charge_bp"
                type="number"
                min="0"
                max="5000"
                step="10"
                value={formData.service_charge_bp}
                onChange={(e) => setFormData({ ...formData, service_charge_bp: parseInt(e.target.value) || 0 })}
                className={`pl-10 ${errors.service_charge_bp ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            <div className="text-sm text-gray-500">
              現在の設定: {(formData.service_charge_bp / 100).toFixed(1)}% (1000 = 10%)
            </div>
            {errors.service_charge_bp && (
              <div className="flex items-center text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.service_charge_bp}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="closing_time" className="text-sm font-medium text-gray-700">
              営業終了時刻 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="closing_time"
                type="time"
                value={formData.closing_time}
                onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                className={`pl-10 ${errors.closing_time ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            {errors.closing_time && (
              <div className="flex items-center text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.closing_time}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={handleClose} className="px-6">
              キャンセル
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6">
              <Save className="w-4 h-4 mr-2" />
              設定を保存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
