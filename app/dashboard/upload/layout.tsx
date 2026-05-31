'use client';

import { useParams } from 'next/navigation';
import { UploadWorkspace } from '@/components/dashboard/UploadWorkspace';

type UploadLayoutParams = {
  summaryId?: string[];
};

type UploadLayoutProps = {
  children: React.ReactNode;
};

export default function UploadLayout({ children }: UploadLayoutProps) {
  const params = useParams<UploadLayoutParams>();
  const summaryId = params?.summaryId?.[0];

  return (
    <>
      <UploadWorkspace urlSummaryId={summaryId} />
      {children}
    </>
  );
}
