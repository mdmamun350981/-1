import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, SectionTitle } from '@/components/ui';
import { deleteSale, getSaleItems, listSales } from '@/lib/repo';
import type { Sale, SaleItem } from '@/lib/types';
import { formatDateTime, formatMoney, theme } from '@/lib/theme';
import { Trash2, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const all = await listSales();
        const found = all.find((s) => String(s.id) === String(id));
        setSale(found ?? null);
        if (found) {
          const it = await getSaleItems(found.id);
          setItems(it);
        }
      })();
    }, [id]),
  );

  if (!sale) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.empty}>ইনভয়েস পাওয়া যায়নি</Text>
      </View>
    );
  }

  const due = sale.total - sale.paid;

  const remove = () => {
    Alert.alert('মুছে ফেলুন?', 'এই বিক্রি মুছলে স্টক ফিরে আসবে।', [
      { text: 'না' },
      {
        text: 'হ্যাঁ, মুছুন',
        style: 'destructive',
        onPress: async () => {
          await deleteSale(sale.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={remove} style={styles.delBtn}>
          <Trash2 size={16} color={theme.error} />
          <Text style={styles.delText}>মুছুন</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.invoiceCard}>
        <Text style={styles.invoiceNo}>{sale.invoice_no}</Text>
        <Text style={styles.party}>{sale.customer_name || 'ওয়াকআউট'}</Text>
        <Text style={styles.date}>{formatDateTime(sale.created_at)}</Text>
        {sale.note ? <Text style={styles.note}>মন্তব্য: {sale.note}</Text> : null}
      </Card>

      <SectionTitle>আইটেম</SectionTitle>
      <Card style={{ padding: 0 }}>
        {items.map((it, i) => (
          <View key={it.id} style={[styles.itemRow, i !== items.length - 1 && styles.itemBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.product_name}</Text>
              <Text style={styles.itemMeta}>
                {it.qty} × {formatMoney(it.price)}
              </Text>
            </View>
            <Text style={styles.itemSub}>{formatMoney(it.subtotal)}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.summaryCard}>
        <Row label="উপমোট" value={formatMoney(items.reduce((s, i) => s + i.subtotal, 0))} />
        <Row label="ছাড়" value={`− ${formatMoney(sale.discount)}`} />
        <View style={styles.divider} />
        <Row label="মোট" value={formatMoney(sale.total)} bold />
        <Row label="জমা" value={formatMoney(sale.paid)} color={theme.success} />
        <Row label="বাকি" value={formatMoney(due)} color={due > 0 ? theme.error : theme.success} bold />
      </Card>
    </ScrollView>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '800', color: theme.text }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontSize: 17, fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { padding: 6 },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 8, backgroundColor: '#FEF2F2' },
  delText: { color: theme.error, fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 40 },
  invoiceCard: { alignItems: 'center', paddingVertical: 20 },
  invoiceNo: { fontSize: 18, fontWeight: '800', color: theme.primary },
  party: { fontSize: 16, fontWeight: '600', color: theme.text, marginTop: 4 },
  date: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
  note: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.text },
  itemMeta: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  itemSub: { fontSize: 14, fontWeight: '700', color: theme.text },
  summaryCard: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 14, color: theme.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: theme.text },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 6 },
});
