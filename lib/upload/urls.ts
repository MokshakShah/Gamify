export function uploadDashboardPath(summaryId: string): string {
  return `/dashboard/upload/${encodeURIComponent(summaryId)}`;
}

export function uploadShareUrl(summaryId: string): string {
  const path = uploadDashboardPath(summaryId);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
