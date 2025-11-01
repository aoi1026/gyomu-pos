'use client';

import { useRouter } from 'next/navigation';
import LoginModal from '@/components/auth/LoginModal';

export default function LoginPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <LoginModal isOpen={true} onClose={handleClose} />
    </div>
  );
}