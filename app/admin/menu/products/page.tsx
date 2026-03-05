'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, ShoppingCart, Plus, Edit, Trash2, Save, X, 
  AlertCircle, CheckCircle, Package, Tag, DollarSign, Hash, Upload
} from 'lucide-react';
import { useNotificationContext } from '@/lib/notification-context';
import { compressImageFileToDataUrl } from '@/lib/image/compress';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  sale_price: number;
  amount: number;
  image?: string | null;
  other: string;
  category_id: number;
  category_name: string;
  created_at: string;
  updated_at: string;
}

interface ProductForm {
  name: string;
  sku: string;
  sale_price: number;
  amount: number;
  image?: string | null;
  other: string;
  category_id: number;
}

export default function ProductManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({
    name: '',
    sku: '',
    sale_price: 0,
    amount: 0,
    image: null,
    other: '',
    category_id: 0
  });
  const [imageFileName, setImageFileName] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  const router = useRouter();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      loadProducts();
    }
  }, [categories, selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      
        if (result.success) {
          setCategories(result.categories);
          // 初期状態では「全体」を選択
          setSelectedCategoryId(null);
        } else {
        error('エラー', 'カテゴリの読み込みに失敗しました');
      }
    } catch (err) {
      error('エラー', 'カテゴリの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const url = selectedCategoryId !== null
        ? `/api/products?category_id=${selectedCategoryId}`
        : '/api/products';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setProducts(result.products);
      } else {
        error('エラー', '商品の読み込みに失敗しました');
      }
    } catch (err) {
      error('エラー', '商品の読み込みに失敗しました');
    }
  };

  const handleAdd = () => {
    if (selectedCategoryId === null || !selectedCategoryId) {
      error('エラー', 'カテゴリを選択してください');
      return;
    }

    setEditingProduct(null);
    setForm({
      name: '',
      sku: '',
      sale_price: 0,
      amount: 0,
      image: null,
      other: '',
      category_id: selectedCategoryId
    });
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      sale_price: product.sale_price,
      amount: product.amount,
      image: product.image ?? null,
      other: product.other,
      category_id: product.category_id
    });
    setValidationErrors([]);
    setIsDialogOpen(true);
  };

  const handleDelete = (productId: number) => {
    setDeleteProductId(productId);
    setIsDeleteDialogOpen(true);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!form.name.trim()) {
      errors.push('商品名は必須です');
    }
    
    if (!form.sku.trim()) {
      errors.push('SKUは必須です');
    }
    
    if (form.sale_price < 0) {
      errors.push('販売価格は0以上である必要があります');
    }
    
    if (form.amount < 0) {
      errors.push('在庫量は0以上である必要があります');
    }
    
    if (!form.category_id) {
      errors.push('カテゴリは必須です');
    }
    
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', result.message);
        setIsDialogOpen(false);
        loadProducts();
      } else {
        error('エラー', result.error || '保存に失敗しました');
      }
    } catch (err) {
      error('エラー', '保存に失敗しました');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProductId) return;

    try {
      const response = await fetch(`/api/products/${deleteProductId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        success('成功', result.message);
        setIsDeleteDialogOpen(false);
        setDeleteProductId(null);
        loadProducts();
      } else {
        error('エラー', result.error || '削除に失敗しました');
      }
    } catch (err) {
      error('エラー', '削除に失敗しました');
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setForm({
      name: '',
      sku: '',
      sale_price: 0,
      amount: 0,
      image: null,
      other: '',
      category_id: 0
    });
    setValidationErrors([]);
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, image: null }));
      setImageFileName('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      error('エラー', '画像ファイルを選択してください');
      return;
    }
    // Allow up to 20MB originals — mobile camera photos (HEIC/JPEG) can exceed 5MB
    if (file.size > 20 * 1024 * 1024) {
      error('エラー', '画像サイズが大きすぎます（20MB以下にしてください）');
      return;
    }
    setImageFileName(file.name);

    // First attempt: standard settings
    let dataUrl = await compressImageFileToDataUrl(file, {
      maxDimension: 1280,
      preferFormat: 'image/webp',
      quality: 0.82,
    });

    // If output is still large (e.g. PNG with alpha, or WebP fallback), retry smaller
    if (dataUrl.length > 1.5 * 1024 * 1024) {
      dataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 800,
        preferFormat: 'image/jpeg',
        quality: 0.72,
      });
    }

    // Final safety check — should not be reached under normal circumstances
    if (dataUrl.length > 3 * 1024 * 1024) {
      error('エラー', '画像の圧縮に失敗しました。より小さい画像を選択してください。');
      return;
    }

    setForm((prev) => ({ ...prev, image: dataUrl }));
  };

  const getSelectedCategoryName = () => {
    if (selectedCategoryId === null) {
      return '全体';
    }
    const category = categories.find(c => c.id === selectedCategoryId);
    return category ? category.name : 'カテゴリを選択';
  };

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
                onClick={() => router.push('/admin/menu')}
                className="self-start sm:self-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">メニュー管理</span>
                <span className="sm:hidden">戻る</span>
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">商品管理</h1>
                <p className="text-xs sm:text-sm text-gray-500">商品の詳細情報を管理</p>
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!selectedCategoryId}>
              <Plus className="w-4 h-4 mr-2" />
              商品追加
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* サイドバー - カテゴリ一覧 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  カテゴリ一覧
                </CardTitle>
                <CardDescription>
                  カテゴリを選択して商品を表示
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* 全体項目 */}
                  <Button
                    variant={selectedCategoryId === null ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    全体
                  </Button>
                  
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategoryId === category.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <Tag className="w-4 h-4 mr-2" />
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* メインコンテンツ - 商品一覧 */}
          <div className="lg:col-span-3">
            {/* 説明カード */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">商品管理について</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">商品情報</h4>
                        <p>商品名、SKU、価格、在庫量、詳細情報を管理</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">カテゴリ別表示</h4>
                        <p>左側のカテゴリを選択して商品を表示・管理</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 商品一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  {getSelectedCategoryName()}の商品一覧
                </CardTitle>
                <CardDescription>
                  {selectedCategoryId === null ? '全カテゴリの商品一覧です' : 
                   selectedCategoryId ? '選択されたカテゴリの商品一覧です' : 'カテゴリを選択してください'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCategoryId === undefined ? (
                  <div className="text-center py-8">
                    <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">カテゴリを選択してください</h3>
                    <p className="text-gray-500">左側のカテゴリから選択して商品を表示します</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">商品がありません</h3>
                    <p className="text-gray-500 mb-4">このカテゴリに商品を追加してください</p>
                    <Button onClick={handleAdd}>
                      <Plus className="w-4 h-4 mr-2" />
                      商品を追加
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {selectedCategoryId === null && <TableHead>カテゴリ名</TableHead>}
                          <TableHead>画像</TableHead>
                          <TableHead>商品名</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">価格</TableHead>
                          <TableHead className="text-right">在庫</TableHead>
                          <TableHead>詳細</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            {selectedCategoryId === null && (
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Tag className="w-4 h-4 text-green-600" />
                                  <span className="font-medium">{product.category_name}</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={`${product.name}画像`}
                                  className="w-10 h-10 object-cover rounded border"
                                />
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  {/* <div className="text-sm text-gray-500">ID: {product.id}</div> */}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {product.sku}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end">
                                <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                                <span className="font-medium">¥{product.sale_price.toLocaleString()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end">
                                <Hash className="w-4 h-4 mr-1 text-blue-600" />
                                <span className="font-medium">{product.amount}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {product.other ? (
                                  <p className="text-sm text-gray-600 truncate">{product.other}</p>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(product)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  編集
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(product.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  削除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 追加・編集ダイアログ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {editingProduct ? (
                  <>
                    <Edit className="w-5 h-5 mr-2" />
                    商品編集
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    商品追加
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* バリデーションエラー */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900 mb-1">入力エラー</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* フォーム */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">商品名 *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="商品名を入力"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={form.sku}
                      onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="商品コードを入力"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>画像</Label>
                    <input
                      id="product-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
                    />
                    <label
                      htmlFor="product-image"
                      className="h-12 w-full rounded-md border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-center gap-2 text-sm text-gray-700"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">
                        {form.image ? '画像を変更（ファイル追加）' : '画像ファイルを追加'}
                      </span>
                    </label>
                    {form.image && (
                      <div className="flex items-center gap-3">
                        <img src={form.image} alt="プレビュー" className="w-16 h-16 object-cover rounded border" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-600 truncate">
                            {imageFileName ? `選択中: ${imageFileName}` : '選択済み'}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, image: null }));
                            setImageFileName('');
                          }}
                        >
                          画像を削除
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">※ 最大20MB（自動圧縮します）</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category_id">カテゴリ *</Label>
                    <Select
                      value={form.category_id.toString()}
                      onValueChange={(value) => setForm(prev => ({ ...prev, category_id: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sale_price">販売価格 *</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sale_price}
                      onChange={(e) => setForm(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">在庫量 *</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="other">詳細情報</Label>
                    <Textarea
                      id="other"
                      value={form.other}
                      onChange={(e) => setForm(prev => ({ ...prev, other: e.target.value }))}
                      placeholder="商品の詳細情報や注意事項"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                商品削除
              </AlertDialogTitle>
              <AlertDialogDescription>
                この商品を削除しますか？この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
