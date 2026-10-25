export const theme = {
  primary: '#0F766E',
  primaryDark: '#0B5953',
  primaryLight: '#14B8A6',
  accent: '#F59E0B',
  success: '#16A34A',
  warning: '#EAB308',
  error: '#DC2626',
  info: '#2563EB',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  shadow: '#0F172A',
};

export const formatMoney = (n: number): string => {
  const v = Number.isFinite(n) ? n : 0;
  return '৳' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};
