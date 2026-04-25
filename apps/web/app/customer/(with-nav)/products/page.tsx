import CustomerProducts from '../../../CustomerSide/CustomerProducts';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Loading...</div>}>
      <CustomerProducts />
    </Suspense>
  );
}
