import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, EmptyState, SectionTitle, StatCard } from '@/components/ui';
import { dashboardStats } from '@/lib/repo';
import { formatDate, formatMoney, theme } from '@/lib/theme';
import { Package, ShoppingCart, TrendingUp, Wallet, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Stats = Awaited<ReturnType<typeof dashboardStats>>;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await dashboardStats();
    setStats(s);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.primary]} />}>
      <View style={styles.header}>
        <Text style={styles.title}>দোকান হিসাব</Text>
        <Text style={styles.subtitle}>আজকের সারসংক্ষেপ</Text>
      </View>

      {stats && (
        <>
          <View style={styles.row}>
            <StatCard
              label="আজকের বিক্রি"
              value={formatMoney(stats.todaySales)}
              color={theme.success}
              icon={<ShoppingCart size={16} color={theme.success} />}
            />
            <StatCard
              label="এ মাসের বিক্রি"
              value={formatMoney(stats.monthSales)}
              color={theme.primary}
              icon={<TrendingUp size={16} color={theme.primary} />}
            />
          </View>

          <View style={styles.row}>
            <StatCard
              label="মোট বিক্রি"
              value={formatMoney(stats.totalSales)}
              color={theme.primary}
              icon={<ArrowUpRight size={16} color={theme.primary} />}
            />
            <StatCard
              label="মোট ক্রয়"
              value={formatMoney(stats.totalPurchases)}
              color={theme.error}
              icon={<ArrowDownRight size={16} color={theme.error} />}
            />
          </View>

          <View style={styles.row}>
            <StatCard
              label="মোট খরচ"
              value={formatMoney(stats.totalExpenses)}
              color={theme.warning}
              icon={<Wallet size={16} color={theme.warning} />}
            />
            <StatCard
              label="স্টক মূল্য"
              value={formatMoney(stats.stockValue)}
              color={theme.info}
              icon={<Package size={16} color={theme.info} />}
            />
          </View>

          <Card style={styles.profitCard}>
            <Text style={styles.profitLabel}>আনুমানিক লাভ / ক্ষতি</Text>
            <Text style={[styles.profitValue, { color: stats.profit >= 0 ? theme.success : theme.error }]}>
              {formatMoney(stats.profit)}
            </Text>
            <Text style={styles.profitHint}>বিক্রি − ক্রয় − খরচ</Text>
          </Card>

          <View style={styles.row}>
            <StatCard label="পাওনা (কাস্টমার)" value={formatMoney(stats.receivable)} color={theme.success} />
            <StatCard label="দেনা (সাপ্লায়ার)" value={formatMoney(stats.payable)} color={theme.error} />
          </View>

          <SectionTitle>সাম্প্রতিক বিক্রি</SectionTitle>
          <Card style={{ padding: 0 }}>
            {stats.recentSales.length === 0 ? (
              <EmptyState message="এখনো কোনো বিক্রি নেই" />
            ) : (
              stats.recentSales.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.listRow, i !== stats.recentSales.length - 1 && styles.listBorder]}
                  onPress={() => router.push(`/sale-detail?id=${s.id}`)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{s.invoice_no}</Text>
                    <Text style={styles.listSub}>
                      {s.customer_name || 'ওয়াকআউট'} • {formatDate(s.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.listAmount, { color: theme.success }]}>{formatMoney(s.total)}</Text>
                </TouchableOpacity>
              ))
            )}
          </Card>

          <SectionTitle>কম স্টকের পণ্য</SectionTitle>
          <Card style={{ padding: 0 }}>
            {stats.lowStock.length === 0 ? (
              <EmptyState message="সব পণ্যের স্টক যথেষ্ট আছে" />
            ) : (
              stats.lowStock.map((p, i) => (
                <View key={p.id} style={[styles.listRow, i !== stats.lowStock.length - 1 && styles.listBorder]}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <AlertTriangle size={16} color={theme.warning} />
                    <Text style={[styles.listTitle, { marginLeft: 8 }]}>{p.name}</Text>
                  </View>
                  <Text style={[styles.listAmount, { color: theme.error }]}>
                    {p.stock} {p.unit}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', marginHorizontal: -4 },
  profitCard: {
    backgroundColor: theme.card,
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  profitLabel: { fontSize: 13, color: theme.textMuted, marginBottom: 6 },
  profitValue: { fontSize: 30, fontWeight: '800' },
  profitHint: { fontSize: 11, color: theme.textLight, marginTop: 4 },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  listTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  listSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  listAmount: { fontSize: 15, fontWeight: '700' },
});
