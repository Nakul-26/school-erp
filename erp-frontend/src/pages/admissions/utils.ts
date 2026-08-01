export function getBadgeStyle(status: string): { bg: string; color: string } {
  const s = status.toLowerCase();
  if (s === 'new' || s === 'submitted') return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
  if (s === 'contacted' || s === 'under review') return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' };
  if (s === 'admitted' || s === 'approved') return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
  if (s === 'rejected') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
  return { bg: '#f3f4f6', color: '#374151' };
}
