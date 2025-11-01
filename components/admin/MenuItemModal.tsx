'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Utensils, Wine, Package, AlertCircle, DollarSign,
  Tag, FileText, ToggleLeft, Camera, Clock
} from 'lucide-react';
import { MenuItem, MenuCategory, mockCategories } from '@/lib/mock-data';

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => void;
  existingItem?: MenuItem;
}

export function MenuItemModal({ 
  isOpen, 
  onClose, 
  onSave, 
  existingItem 
}: MenuItemModalProps) {
  const [formData, setFormData] = useState({
    category_id: existingItem?.category_id || '',
    name: existingItem?.name || '',
    sku: existingItem?.sku || '',
    current_price_yen: existingItem?.current_price_yen || 0,
    is_bottle: existingItem?.is_bottle ?? false,
    is_active: existingItem?.is_active ?? true,
    tax_category: existingItem?.tax_category || 'standard'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '商品名は必須です';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'カテゴリーを選択してください';
    }

    if (formData.current_price_yen <= 0) {
      newErrors.current_price_yen = '販売価格は0円より大きい値を入力してください';
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

      const itemData = {
        ...formData,
        store_id: 'store-1', // This would come from the current user's store
      };

      onSave(itemData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Menu item save failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      name: '',
      sku: '',
      current_price_yen: 0,
      is_bottle: false,
      is_active: true,
      tax_category: 'standard'
    });
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    if (!existingItem) {
      resetForm();
    }
  };



  const generateSKU = () => {
    const category = mockCategories.find(c => c.id === formData.category_id);
    const categoryCode = category?.name.substring(0, 2).toUpperCase() || 'XX';
    const timestamp = Date.now().toString().slice(-4);
    const sku = `${categoryCode}${timestamp}`;
    setFormData(prev => ({ ...prev, sku }));
  };

  

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-orange-50 to-red-50 -m-6 mb-6 p-6 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Utensils className="w-5 h-5 mr-2 text-orange-600" />
            {existingItem ? 'メニュー編集' : '新規メニュー追加'}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {existingItem ? 'メニューの情報を更新します' : '新しいメニューを追加します'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              基本情報
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-sm font-medium flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  カテゴリー <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger className={errors.category_id ? 'border-red-300' : ''}>
                    <SelectValue placeholder="カテゴリーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-red-500 text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.category_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-medium flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  SKU
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="商品コード"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateSKU}
                    className="px-3"
                  >
                    自動生成
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium flex items-center">
                  <Utensils className="w-4 h-4 mr-1" />
                  商品名 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="商品名を入力"
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              価格設定
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_price_yen" className="text-sm font-medium flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  販売価格 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="current_price_yen"
                  type="number"
                  min="0"
                  step="10"
                  value={formData.current_price_yen}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_price_yen: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className={errors.current_price_yen ? 'border-red-300' : ''}
                />
                {errors.current_price_yen && (
                  <p className="text-red-500 text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.current_price_yen}
                  </p>
                )}
              </div>


            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              商品詳細
            </h3>
            



          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              設定
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ToggleLeft className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">販売中</span>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>


            </div>
          </div>

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
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              {isSubmitting ? '保存中...' : existingItem ? '更新' : '追加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
