'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { 
  Wine, AlertCircle, Calendar, User, Droplets,
  Tag, FileText, Package
} from 'lucide-react';
import { 
  Bottle, mockCustomers, mockMenuItems, formatDateTime,
  Customer, MenuItem
} from '@/lib/mock-data';

interface BottleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bottle: Omit<Bottle, 'id' | 'stored_at' | 'updated_at'>) => void;
  existingBottle?: Bottle;
  mode: 'register' | 'edit' | 'consume';
}

export function BottleModal({ 
  isOpen, 
  onClose, 
  onSave, 
  existingBottle,
  mode = 'register'
}: BottleModalProps) {
  const [formData, setFormData] = useState({
    menu_item_id: existingBottle?.menu_item_id || '',
    name: existingBottle?.name || '',
    total_ml: existingBottle?.total_ml || 750,
    remaining_ml: existingBottle?.remaining_ml || (existingBottle?.total_ml || 750),
    expires_at: existingBottle?.expires_at || '',
    status: existingBottle?.status || 'active',
    store_id: existingBottle?.store_id || 'store-1'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState(0);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (mode === 'register' || mode === 'edit') {
      if (!formData.menu_item_id) {
        newErrors.menu_item_id = 'ボトルの種類を選択してください';
      }

      if (!formData.name.trim()) {
        newErrors.name = 'ボトル名は必須です';
      }

      if (formData.total_ml <= 0) {
        newErrors.total_ml = '容量は0mlより大きい値を入力してください';
      }

      if (formData.remaining_ml < 0 || formData.remaining_ml > formData.total_ml) {
        newErrors.remaining_ml = '残量は0ml以上、容量以下の値を入力してください';
      }

      if (!formData.expires_at) {
        newErrors.expires_at = '有効期限を設定してください';
      } else if (new Date(formData.expires_at) <= new Date()) {
        newErrors.expires_at = '有効期限は現在より後の日付を設定してください';
      }
    }

    if (mode === 'consume') {
      if (consumeAmount <= 0) {
        newErrors.consumeAmount = '消費量は0mlより大きい値を入力してください';
      }

      if (consumeAmount > formData.remaining_ml) {
        newErrors.consumeAmount = '消費量は残量以下の値を入力してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      let bottleData = { 
        ...formData,
        created_at: new Date().toISOString()
      };

      if (mode === 'consume') {
        bottleData.remaining_ml = formData.remaining_ml - consumeAmount;
        bottleData.status = bottleData.remaining_ml <= 0 ? 'empty' : 'active';
      }

      onSave(bottleData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Bottle operation failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      menu_item_id: '',
      name: '',
      total_ml: 750,
      remaining_ml: 750,
      expires_at: '',
      status: 'active',
      store_id: 'store-1'
    });
    setConsumeAmount(0);
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    if (!existingBottle) {
      resetForm();
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = mockCustomers.find(c => c.id === customerId);
    return customer?.display_name || '';
  };

  const getMenuItemName = (menuItemId: string) => {
    const item = mockMenuItems.find(i => i.id === menuItemId);
    return item?.name || '';
  };

  const generateBottleName = () => {
    const menuItem = mockMenuItems.find(i => i.id === formData.menu_item_id);
    
    if (menuItem) {
      const date = new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
      setFormData(prev => ({
        ...prev,
        name: `${menuItem.name} (${date})`
      }));
    }
  };

  const setDefaultExpiry = () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6); // 6 months from now
    setFormData(prev => ({
      ...prev,
      expires_at: futureDate.toISOString().split('T')[0]
    }));
  };

    const remainingPercentage = formData.total_ml > 0
    ? (formData.remaining_ml / formData.total_ml) * 100
    : 0;

  const getModalTitle = () => {
    switch (mode) {
      case 'register':
        return 'ボトル新規登録';
      case 'edit':
        return 'ボトル情報編集';
      case 'consume':
        return 'ボトル消費記録';
      default:
        return 'ボトル管理';
    }
  };

  const getModalDescription = () => {
    switch (mode) {
      case 'register':
        return '新しいボトルを登録します';
      case 'edit':
        return 'ボトルの情報を更新します';
      case 'consume':
        return 'ボトルの消費量を記録します';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-purple-50 to-pink-50 -m-6 mb-6 p-6 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Wine className="w-5 h-5 mr-2 text-purple-600" />
            {getModalTitle()}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {getModalDescription()}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'consume' ? (
            // Consume Mode
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">{formData.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-purple-700">ボトル種類:</span>
                    <span className="ml-2 font-medium">{getMenuItemName(formData.menu_item_id)}</span>
                  </div>
                  <div>
                    <span className="text-purple-700">ボトル:</span>
                    <span className="ml-2 font-medium">{getMenuItemName(formData.menu_item_id)}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>現在の残量</span>
                    <span>{formData.remaining_ml}ml / {formData.total_ml}ml</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 bg-purple-600 rounded-full"
                      style={{ width: `${remainingPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumeAmount" className="text-sm font-medium flex items-center">
                  <Droplets className="w-4 h-4 mr-1" />
                  消費量 (ml) <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="consumeAmount"
                  type="number"
                  min="1"
                  max={formData.remaining_ml}
                  step="1"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(parseInt(e.target.value) || 0)}
                  placeholder="消費したml数を入力"
                  className={errors.consumeAmount ? 'border-red-300' : ''}
                />
                {errors.consumeAmount && (
                  <p className="text-red-500 text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.consumeAmount}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  消費後残量: {Math.max(0, formData.remaining_ml - consumeAmount)}ml
                </p>
              </div>
            </div>
          ) : (
            // Register/Edit Mode
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                ボトル情報
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="menu_item_id" className="text-sm font-medium flex items-center">
                    <Wine className="w-4 h-4 mr-1" />
                    ボトル種類 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select 
                    value={formData.menu_item_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, menu_item_id: value }))}
                  >
                    <SelectTrigger className={errors.menu_item_id ? 'border-red-300' : ''}>
                      <SelectValue placeholder="ボトルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockMenuItems.filter(item => 
                        item.category_id === 'cat-5' && // Assuming cat-5 is bottles category
                        item.is_active
                      ).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.menu_item_id && (
                    <p className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.menu_item_id}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center">
                    <Tag className="w-4 h-4 mr-1" />
                    ボトル名 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ボトル名を入力"
                    className={errors.name ? 'border-red-300' : ''}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at" className="text-sm font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    有効期限 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                      className={errors.expires_at ? 'border-red-300' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={setDefaultExpiry}
                      className="px-3 whitespace-nowrap"
                    >
                      6ヶ月後
                    </Button>
                  </div>
                  {errors.expires_at && (
                    <p className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.expires_at}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_ml" className="text-sm font-medium flex items-center">
                    <Package className="w-4 h-4 mr-1" />
                    容量 (ml)
                  </Label>
                  <Input
                    id="total_ml"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.total_ml}
                    onChange={(e) => {
                      const newCapacity = parseInt(e.target.value) || 0;
                      setFormData(prev => ({ 
                        ...prev, 
                        total_ml: newCapacity,
                        remaining_ml: mode === 'register' ? newCapacity : prev.remaining_ml
                      }));
                    }}
                    className={errors.total_ml ? 'border-red-300' : ''}
                  />
                  {errors.total_ml && (
                    <p className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.total_ml}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remaining_ml" className="text-sm font-medium flex items-center">
                    <Droplets className="w-4 h-4 mr-1" />
                    残量 (ml)
                  </Label>
                  <Input
                    id="remaining_ml"
                    type="number"
                    min="0"
                    max={formData.total_ml}
                    step="1"
                    value={formData.remaining_ml}
                    onChange={(e) => setFormData(prev => ({ ...prev, remaining_ml: parseInt(e.target.value) || 0 }))}
                    className={errors.remaining_ml ? 'border-red-300' : ''}
                  />
                  {errors.remaining_ml && (
                    <p className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.remaining_ml}
                    </p>
                  )}
                </div>
              </div>

              {formData.total_ml > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">残量表示</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span>残量</span>
                      <span>{formData.remaining_ml}ml / {formData.total_ml}ml ({remainingPercentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 bg-purple-600 rounded-full"
                        style={{ width: `${remainingPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isSubmitting ? '処理中...' : 
                mode === 'register' ? '登録' : 
                mode === 'edit' ? '更新' : 
                '記録'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
