'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Calendar, Star, AlertCircle } from 'lucide-react';
import { Customer } from '@/lib/mock-data';

interface CustomerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => void;
  existingCustomer?: Customer;
}

export function CustomerRegistrationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  existingCustomer 
}: CustomerRegistrationModalProps) {
  const [formData, setFormData] = useState({
    display_name: existingCustomer?.display_name || '',
    email: existingCustomer?.email || '',
    note: existingCustomer?.note || '',
    blacklist: existingCustomer?.blacklist ?? false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'お名前は必須です';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
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

      const customerData = {
        ...formData,
        store_id: 'store-1', // This would come from the current user's store
        nomination_history: []
      };

      onSave(customerData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Customer registration failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      display_name: '',
      email: '',
      note: '',
      blacklist: false
    });
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    if (!existingCustomer) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-purple-50 to-pink-50 -m-6 mb-6 p-6 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2 text-purple-600" />
            {existingCustomer ? '顧客情報編集' : '新規顧客登録'}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {existingCustomer ? '顧客の情報を更新します' : '新しい顧客を登録します'}
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
                <Label htmlFor="display_name" className="text-sm font-medium flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  お名前 <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="田中 花子"
                  className={errors.display_name ? 'border-red-300' : ''}
                />
                {errors.display_name && (
                  <p className="text-red-500 text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.display_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@email.com"
                  className={errors.email ? 'border-red-300' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>


            </div>


          </div>

          {/* Settings & Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              設定・備考
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">ブラックリスト</span>
                  </div>
                  <Switch
                    checked={formData.blacklist}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, blacklist: checked }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm font-medium">
                  備考・特記事項
                </Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="アレルギー情報、好み、その他特記事項など..."
                  rows={4}
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
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isSubmitting ? '保存中...' : existingCustomer ? '更新' : '登録'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
