'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CastBackRatesPage() {
  const router = useRouter();

  // admin/salary-settings へ統合済み
  useEffect(() => {
    router.replace('/admin/salary-settings?tab=nomination-back-rates');
  }, [router]);

  return null;
}
