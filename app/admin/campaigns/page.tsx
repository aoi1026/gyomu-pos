'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGate from '@/components/auth/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, Percent, Calendar, Target, TrendingUp,
  Plus, Edit, Eye, Trash2, Gift, Star
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/mock-data';

interface Campaign {
  id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  start_date: string;
  end_date: string;
  target_category?: string;
  min_order_amount?: number;
  max_discount_amount?: number;
  is_active: boolean;
  usage_count: number;
  total_discount_given: number;
}

export default function CampaignManagementPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    // モックキャンペーンデータ
    const mockCampaigns: Campaign[] = [
      {
        id: 'campaign-1',
        name: '新年特別割引',
        description: 'ボトル注文で10%割引',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        target_category: 'cat-1',
        min_order_amount: 50000,
        max_discount_amount: 20000,
        is_active: true,
        usage_count: 45,
        total_discount_given: 450000
      },
      {
        id: 'campaign-2',
        name: 'ハッピーアワー',
        description: '20時まで全ドリンク500円引き',
        discount_type: 'fixed_amount',
        discount_value: 500,
        start_date: '2025-01-15',
        end_date: '2025-02-15',
        target_category: 'cat-2',
        is_active: true,
        usage_count: 128,
        total_discount_given: 64000
      },
      {
        id: 'campaign-3',
        name: 'VIP限定キャンペーン',
        description: 'VIP顧客限定15%割引',
        discount_type: 'percentage',
        discount_value: 15,
        start_date: '2025-01-10',
        end_date: '2025-03-31',
        min_order_amount: 100000,
        max_discount_amount: 50000,
        is_active: false,
        usage_count: 12,
        total_discount_given: 180000
      }
    ];
    
    setCampaigns(mockCampaigns);
    setIsLoading(false);
  }, []);

  const startEdit = (campaign: Campaign) => {
    setEditingCampaign({ ...campaign });
    setIsCreating(false);
  };

  const startCreate = () => {
    setEditingCampaign({
      id: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
      usage_count: 0,
      total_discount_given: 0
    });
    setIsCreating(true);
  };

  const saveCampaign = () => {
    if (!editingCampaign) return;
    
    if (isCreating) {
      const newCampaign = {
        ...editingCampaign,
        id: `campaign-${Date.now()}`
      };
      setCampaigns([...campaigns, newCampaign]);
    } else {
      setCampaigns(campaigns.map(c => 
        c.id === editingCampaign.id ? editingCampaign : c
      ));
    }
    
    setEditingCampaign(null);
    setIsCreating(false);
    
    console.log('キャンペーン保存:', editingCampaign);
  };

  const toggleCampaignStatus = (campaignId: string) => {
    setCampaigns(campaigns.map(c => 
      c.id === campaignId 
        ? { ...c, is_active: !c.is_active }
        : c
    ));
  };

  const deleteCampaign = (campaignId: string) => {
    if (!confirm('このキャンペーンを削除しますか？')) return;
    
    setCampaigns(campaigns.filter(c => c.id !== campaignId));
    console.log('キャンペーン削除:', campaignId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['admin', 'superadmin']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">ダッシュボード</span>
                  <span className="sm:hidden">戻る</span>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">キャンペーン管理</h1>
                  <p className="text-xs sm:text-sm text-gray-500">割引・特典・プロモーション設定</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={startCreate}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新規キャンペーン
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 編集フォーム */}
          {editingCampaign && (
            <Card className="mb-8 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle>
                  {isCreating ? '新規キャンペーン作成' : 'キャンペーン編集'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">キャンペーン名</Label>
                    <Input
                      id="name"
                      value={editingCampaign.name}
                      onChange={(e) => setEditingCampaign({...editingCampaign, name: e.target.value})}
                      placeholder="例: 新年特別割引"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={editingCampaign.is_active}
                      onCheckedChange={(checked) => setEditingCampaign({...editingCampaign, is_active: checked})}
                    />
                    <Label htmlFor="is-active">有効</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={editingCampaign.description}
                    onChange={(e) => setEditingCampaign({...editingCampaign, description: e.target.value})}
                    placeholder="キャンペーンの詳細説明..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discount-type">割引タイプ</Label>
                    <select
                      id="discount-type"
                      value={editingCampaign.discount_type}
                      onChange={(e) => setEditingCampaign({
                        ...editingCampaign, 
                        discount_type: e.target.value as 'percentage' | 'fixed_amount'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="percentage">パーセント割引</option>
                      <option value="fixed_amount">固定額割引</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="discount-value">
                      割引{editingCampaign.discount_type === 'percentage' ? '率(%)' : '額(円)'}
                    </Label>
                    <Input
                      id="discount-value"
                      type="number"
                      min="0"
                      value={editingCampaign.discount_value}
                      onChange={(e) => setEditingCampaign({...editingCampaign, discount_value: Number(e.target.value)})}
                    />
                  </div>
                  {editingCampaign.discount_type === 'percentage' && (
                    <div>
                      <Label htmlFor="max-discount">上限額(円)</Label>
                      <Input
                        id="max-discount"
                        type="number"
                        min="0"
                        value={editingCampaign.max_discount_amount || ''}
                        onChange={(e) => setEditingCampaign({
                          ...editingCampaign, 
                          max_discount_amount: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="上限なしの場合は空白"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">開始日</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={editingCampaign.start_date}
                      onChange={(e) => setEditingCampaign({...editingCampaign, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">終了日</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={editingCampaign.end_date}
                      onChange={(e) => setEditingCampaign({...editingCampaign, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="min-order">最低注文金額(円)</Label>
                  <Input
                    id="min-order"
                    type="number"
                    min="0"
                    value={editingCampaign.min_order_amount || ''}
                    onChange={(e) => setEditingCampaign({
                      ...editingCampaign, 
                      min_order_amount: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="制限なしの場合は空白"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button onClick={saveCampaign}>
                    保存
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setEditingCampaign(null);
                    setIsCreating(false);
                  }}>
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* キャンペーン一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className={`hover:shadow-lg transition-shadow duration-300 ${!campaign.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{campaign.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                      </div>
                      <Badge className={campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {campaign.is_active ? '有効' : '無効'}
                      </Badge>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {campaign.discount_type === 'percentage' 
                              ? `${campaign.discount_value}%` 
                              : formatCurrency(campaign.discount_value)}
                          </div>
                          <div className="text-sm text-purple-700">
                            {campaign.discount_type === 'percentage' ? '割引率' : '割引額'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">期間</span>
                        <span className="font-medium">
                          {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">利用回数</span>
                        <span className="font-medium">{campaign.usage_count}回</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">割引総額</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(campaign.total_discount_given)}
                        </span>
                      </div>
                      {campaign.min_order_amount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">最低注文額</span>
                          <span className="font-medium">
                            {formatCurrency(campaign.min_order_amount)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEdit(campaign)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toggleCampaignStatus(campaign.id)}
                      >
                        {campaign.is_active ? (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            無効化
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 mr-1" />
                            有効化
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {campaigns.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">キャンペーンがありません</h3>
              <p className="text-gray-500 mb-6">新しいキャンペーンを作成してください</p>
              <Button onClick={startCreate}>
                <Plus className="w-4 h-4 mr-2" />
                新規キャンペーン作成
              </Button>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}