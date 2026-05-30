export function chatDashboardPath(chatId: string): string {
  return `/dashboard/chat/${encodeURIComponent(chatId)}`;
}

export function chatShareUrl(chatId: string): string {
  const path = chatDashboardPath(chatId);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}
