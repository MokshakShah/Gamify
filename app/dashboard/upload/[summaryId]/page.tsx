'use client';

import { UploadWorkspace } from '@/components/dashboard/UploadWorkspace';

type PageProps = {
  params: { summaryId: string };
};

/** View a saved summary — /dashboard/upload/[summaryId] */
export default function UploadSummaryPage({ params }: PageProps) {
  return <UploadWorkspace urlSummaryId={params.summaryId} />;
}
