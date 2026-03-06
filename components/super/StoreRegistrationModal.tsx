'use client';

import { useState } from 'react';
import { X, Store, MapPin, Clock, Percent, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store as StoreModel } from '@/lib/mock-data';

interface StoreRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (store: Omit<StoreModel, 'id' | 'created_at' | 'updated_at'>) => void;
}

export default function StoreRegistrationModal({ isOpen, onClose, onSave }: StoreRegistrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    tax_bp: 1000,
    service_charge_bp: 1000,
    closing_time: '05:00'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '店舗名は必須です';
    }

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
    
    if (validateForm()) {
      onSave(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      tax_bp: 1000,
      service_charge_bp: 1000,
      closing_time: '05:00'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">新規店舗登録</h2>
              <p className="text-sm text-gray-500">新しい店舗の基本情報を入力してください</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 店舗名 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              店舗名 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 銀座エレガンス"
                className={`pl-10 ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              <Store className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            {errors.name && (
              <div className="flex items-center text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.name}
              </div>
            )}
          </div>

          {/* 税率設定 */}
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

          {/* サービス料率設定 */}
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

          {/* 営業終了時刻 */}
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

          {/* 設定例 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3">設定例</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3 border">
                <div className="font-medium text-gray-900">標準設定</div>
                <div className="text-gray-600">税率: 10%</div>
                <div className="text-gray-600">サービス料: 10%</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="font-medium text-gray-900">プレミアム</div>
                <div className="text-gray-600">税率: 10%</div>
                <div className="text-gray-600">サービス料: 20%</div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="font-medium text-gray-900">VIP</div>
                <div className="text-gray-600">税率: 10%</div>
                <div className="text-gray-600">サービス料: 15%</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              店舗を登録
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
