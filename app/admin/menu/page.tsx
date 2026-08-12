'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Package, Tag, Plus, Settings, 
  ShoppingCart, List, Edit, Trash2
} from 'lucide-react';

export default function MenuManagementPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">メニュー管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">カテゴリと商品を管理します</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 説明カード */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">メニュー管理について</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">カテゴリ管理</h4>
                    <p>メニューのカテゴリ（飲み物、食べ物など）を追加・編集・削除できます</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">商品管理</h4>
                    <p>各カテゴリに属する商品の詳細情報を管理できます</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 管理機能カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* カテゴリ管理 */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="w-5 h-5 mr-2 text-green-600" />
                カテゴリ管理
              </CardTitle>
              <CardDescription>
                メニューカテゴリの追加・編集・削除を行います
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>カテゴリ名と備考の管理</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>カテゴリの追加・編集・削除</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>商品分類の整理</span>
                </div>
                
                <Button 
                  className="w-full mt-4"
                  onClick={() => router.push('/admin/menu/categories')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  カテゴリ管理を開く
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 商品管理 */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
                商品管理
              </CardTitle>
              <CardDescription>
                商品の詳細情報を管理します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>商品名、SKU、価格の管理</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>在庫量の管理</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>カテゴリ別商品表示</span>
                </div>
                
                <Button 
                  className="w-full mt-4"
                  onClick={() => router.push('/admin/menu/products')}
                >
                  <List className="w-4 h-4 mr-2" />
                  商品管理を開く
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* クイックアクション */}
        {/* <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              クイックアクション
            </CardTitle>
            <CardDescription>
              よく使用される機能へのショートカット
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/admin/menu/categories')}
              >
                <Tag className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium">カテゴリ追加</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/admin/menu/products')}
              >
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium">商品追加</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/admin/menu/categories')}
              >
                <Edit className="w-6 h-6 text-orange-600" />
                <span className="text-sm font-medium">カテゴリ編集</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/admin/menu/products')}
              >
                <Trash2 className="w-6 h-6 text-red-600" />
                <span className="text-sm font-medium">商品削除</span>
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}