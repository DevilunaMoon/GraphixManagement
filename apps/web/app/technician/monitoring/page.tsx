import { Suspense } from 'react';
import TechnicianMonitoring from '../../TechnicianSide/TechnicianMonitoring';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading Gadget Repair Workbench...</div>}>
      <TechnicianMonitoring />
    </Suspense>
  );
}
