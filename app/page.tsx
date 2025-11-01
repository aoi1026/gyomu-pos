'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wine, Users, BarChart3, Settings, Clock, CreditCard, UserCheck, Shield, QrCode, Tablet } from 'lucide-react';
import LoginModal from '@/components/auth/LoginModal';

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  const features = [
    {
      icon: <Wine className="w-8 h-8 text-purple-600" />,
      title: "テーブル・注文管理",
      description: "テーブルログイン、キャストによる注文作成、指名管理、サービス注文"
    },
    {
      icon: <CreditCard className="w-8 h-8 text-green-600" />,
      title: "会計・決済",
      description: "レジ締め、売上分析、日次・月次レポート、支払い管理"
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-600" />,
      title: "勤怠・給与管理",
      description: "出退勤管理、バック率設定、指名料計算、給与明細生成"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-orange-600" />,
      title: "売上・分析",
      description: "リアルタイム売上監視、キャスト別実績、ボトル在庫管理"
    },
    {
      icon: <Users className="w-8 h-8 text-pink-600" />,
      title: "顧客・指名管理",
      description: "顧客登録、本指名・場内指名管理、指名履歴、昇格管理"
    },
    {
      icon: <Settings className="w-8 h-8 text-gray-600" />,
      title: "店舗・システム管理",
      description: "メニュー管理、ボトル在庫、スタッフ呼び出し、注文監視"
    }
  ];

  const roles = [
    {
      id: 'table',
      title: 'テーブルログイン',
      description: 'テーブルでの注文・指名管理・サービス注文',
      icon: <Tablet className="w-6 h-6" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      id: 'cast',
      title: 'キャスト',
      description: '勤怠管理・給与確認・指名管理・バック率確認',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      id: 'admin',
      title: '店舗管理者',
      description: '売上管理・顧客管理・スタッフ管理・指名管理・システム設定',
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    // {
    //   id: 'superadmin',
    //   title: 'システム管理者',
    //   description: '監査ログ・店舗管理・複数店舗統括',
    //   icon: <Shield className="w-6 h-6" />,
    //   color: 'bg-orange-50 border-orange-200 text-orange-800'
    // }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Wine className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">NightWork POS</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">ナイトワーク特化POSシステム</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs sm:text-sm">
                MVP v1.0
              </Badge> */}
              <Button 
                onClick={() => setShowLogin(true)}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm sm:text-base"
              >
                ログイン
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-blue-50/80"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="text-left">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                キャバクラ業界に特化した
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  統合POSシステム
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                テーブルログイン、指名管理、バック率計算まで、キャバクラ店舗の運営に必要な全ての機能を統合。
                キャストがテーブルで注文を管理し、指名・サービス注文まで一つのシステムで完結します。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => setShowLogin(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  ログイン・テーブルログイン
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">99.9%</div>
                  <div className="text-sm text-gray-600">稼働率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">24/7</div>
                  <div className="text-sm text-gray-600">サポート</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">300ms</div>
                  <div className="text-sm text-gray-600">応答時間</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              {/* Main Hero Image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-purple-100 to-pink-100">
                <img 
                  src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                  alt="プロフェッショナルな日本人女性がタブレットでPOSシステムを操作"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent"></div>
                
                {/* Floating UI Elements */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">システム稼働中</span>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                  <div className="text-sm text-gray-600 mb-1">月別、日別</div>
                  <div className="text-2xl font-bold text-gray-900">売上統計</div>
                </div>
              </div>
              
              {/* Floating Cards */}
              <div className="absolute -top-6 -left-6 bg-white rounded-xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">注文処理</div>
                    <div className="font-semibold text-gray-900">リアルタイム</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">セキュリティ</div>
                    <div className="font-semibold text-gray-900">最高レベル</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Preview Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">キャスト主導の注文管理</h3>
            <p className="text-lg text-gray-600">テーブルログインでキャストが注文を管理、指名・サービス注文まで完結</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative group">
              <div className="aspect-video rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <img 
                  src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="テーブルログインシステム"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h4 className="font-semibold mb-1">テーブルログイン</h4>
                  <p className="text-sm opacity-90">キャストがテーブルで注文を管理</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="aspect-video rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <img 
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="指名管理・バック率管理画面"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h4 className="font-semibold mb-1">指名管理</h4>
                  <p className="text-sm opacity-90">本指名・場内指名・バック率自動計算</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="aspect-video rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <img 
                  src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="勤怠・給与管理システム"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h4 className="font-semibold mb-1">勤怠・給与管理</h4>
                  <p className="text-sm opacity-90">バック率・指名料・給与自動計算</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Role Selection Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">役割別アクセス</h3>
            <p className="text-lg text-gray-600">テーブルログイン、キャスト、管理者がそれぞれの役割に最適化された機能</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} className={`${role.color} border-2 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1`}>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-3 p-3 bg-white/80 rounded-full w-fit">
                    {role.icon}
                  </div>
                  <CardTitle className="text-lg">{role.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm font-medium">
                    {role.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">主要機能</h3>
            <p className="text-lg text-gray-600">キャバクラ店舗の運営に必要な全ての機能を網羅</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
                <CardHeader>
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <img 
              src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
              alt="満足した店舗管理者"
              className="w-24 h-24 rounded-full mx-auto mb-6 object-cover shadow-lg"
            />
            <blockquote className="text-2xl font-medium text-gray-900 mb-6">
              「テーブルログインでキャストが注文を管理するシステムで、指名管理とバック率計算が簡単になりました。
              キャストの業務効率が大幅に向上し、お客様の満足度も上がっています。」
            </blockquote>
            <div className="text-gray-600">
              <div className="font-semibold">田中 美咲様</div>
              <div className="text-sm">銀座エリア店舗 管理者</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-12">システム仕様</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">50-100</div>
              <div className="text-white/90">同時接続端末数</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">300ms</div>
              <div className="text-white/90">応答時間（P95）</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-white/90">システム稼働</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Wine className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">NightWork POS</span>
              </div>
              <p className="text-gray-400 mb-4">
                キャバクラ業界に特化したPOSシステム。
                テーブルログインでキャストが注文を管理し、指名・バック率計算まで効率的な店舗運営をサポートします。
              </p>
              <p className="text-sm text-gray-500">
                © 2025 NightWork POS. All rights reserved.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">機能</h4>
              <ul className="space-y-2 text-gray-400">
                <li>テーブルログインシステム</li>
                <li>キャスト主導の注文管理</li>
                <li>指名管理・バック率</li>
                <li>勤怠・給与管理</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">サポート</h4>
              <ul className="space-y-2 text-gray-400">
                <li>システム要件</li>
                <li>セキュリティ</li>
                <li>監査ログ</li>
                <li>バックアップ</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)} 
      />
    </div>
  );
}