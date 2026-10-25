import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Card, EmptyState } from '@/components/ui';
import { InvoiceBuilder } from '@/components/InvoiceBuilder';
import { createSale, listCustomers, listProducts, listSales } from '@/lib/repo';
import type { Sale } from '@/lib/types';
import { formatDateTime, formatMoney, theme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [s, p, c] = await Promise.all([listSales(), listProducts(), listCustomers()]);
    setSales(s);
    setProducts(p);
    setCustomers(c);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>বিক্রি</Text>
          <Text style={styles.subtitle}>মোট {sales.length} টি ইনভয়েস</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setBuilder(true)}>
          <Plus size={20} color="#fff" />
          <Text style={styles.addBtnText}>নতুন বিক্রি</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.primary]} />}
        ListEmptyComponent={<EmptyState message="কোনো বিক্রি নেই। 'নতুন বিক্রি' চেপে শুরু করুন।" />}
        renderItem={({ item }) => {
          const due = item.total - item.paid;
          return (
            <TouchableOpacity onPress={() => router.push(`/sale-detail?id=${item.id}`)}>
              <Card style={styles.saleCard}>
                <View style={styles.saleTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceNo}>{item.invoice_no}</Text>
                    <Text style={styles.party}>{item.customer_name || 'ওয়াকআউট'}</Text>
                  </View>
                  <Text style={styles.amount}>{formatMoney(item.total)}</Text>
                </View>
                <View style={styles.saleBottom}>
                  <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
                  <View style={[styles.badge, { backgroundColor: due > 0 ? '#FEF2F2' : '#ECFDF5' }]}>
                    <Text style={[styles.badgeText, { color: due > 0 ? theme.error : theme.success }]}>
                      {due > 0 ? `বাকি ${formatMoney(due)}` : 'পরিশোধিত'}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <InvoiceBuilder
        visible={builder}
        mode="sale"
        products={products}
        parties={customers.map((c) => ({ id: c.id, name: c.name }))}
        onClose={() => setBuilder(false)}
        onSubmit={async (data) => {
          await createSale(data.items, {
            customer_id: data.party_id,
            customer_name: data.party_name,
            paid: data.paid,
            discount: data.discount,
            note: data.note,
          });
          await load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingHorizontal: 14, height: 44, borderRadius: 12, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  saleCard: { padding: 14 },
  saleTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  invoiceNo: { fontSize: 15, fontWeight: '700', color: theme.text },
  party: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: '800', color: theme.success },
  saleBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: theme.textLight },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
