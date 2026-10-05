"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerChangePassword({ user }: { user?: any }) {
  const router = useRouter();

  useEffect(() => {
    router.replace('/customer/profile');
  }, [router]);

  return null;
}
