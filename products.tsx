import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react-native';
import { Card, EmptyState } from '@/components/ui';
import { addProduct, deleteProduct, listProducts, updateProduct } from '@/lib/repo';
import type { Product } from '@/lib/types';
import { formatMoney, theme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Draft = {
  id?: number;
  name: string;
  sku: string;
  category: string;
  purchase_price: string;
  sell_price: string;
  stock: string;
  unit: string;
};

const emptyDraft: Draft = {
  name: '',
  sku: '',
  category: '',
  purchase_price: '0',
  sell_price: '0',
  stock: '0',
  unit: 'pc',
};

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const list = await listProducts();
    setProducts(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const openAdd = () => {
    setDraft(emptyDraft);
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setDraft({
      id: p.id,
      name: p.name,
      sku: p.sku ?? '',
      category: p.category ?? '',
      purchase_price: String(p.purchase_price),
      sell_price: String(p.sell_price),
      stock: String(p.stock),
      unit: p.unit,
    });
    setModal(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      sku: draft.sku.trim() || null,
      category: draft.category.trim() || null,
      purchase_price: parseFloat(draft.purchase_price) || 0,
      sell_price: parseFloat(draft.sell_price) || 0,
      stock: parseFloat(draft.stock) || 0,
      unit: draft.unit.trim() || 'pc',
    };
    if (draft.id) {
      await updateProduct(draft.id, payload);
    } else {
      await addProduct(payload);
    }
    setSaving(false);
    setModal(false);
    load();
  };

  const remove = async (id: number) => {
    await deleteProduct(id);
    load();
  };

  const renderItem = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <View style={styles.productTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productMeta}>
            {item.category ? `${item.category} • ` : ''}
            {item.sku ? `SKU: ${item.sku} • ` : ''}স্টক: {item.stock} {item.unit}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
            <Pencil size={16} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(item.id)} style={styles.iconBtn}>
            <Trash2 size={16} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.priceRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>ক্রয় মূল্য</Text>
          <Text style={styles.priceValue}>{formatMoney(item.purchase_price)}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>বিক্রি মূল্য</Text>
          <Text style={[styles.priceValue, { color: theme.success }]}>{formatMoney(item.sell_price)}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>স্টক মূল্য</Text>
          <Text style={[styles.priceValue, { color: theme.info }]}>{formatMoney(item.stock * item.purchase_price)}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>পণ্য তালিকা</Text>
        <Text style={styles.subtitle}>{products.length} টি পণ্য</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="নাম, ক্যাটাগরি বা SKU দিয়ে খুঁজুন"
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={theme.textLight}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={20} color="#fff" />
          <Text style={styles.addBtnText}>নতুন</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.primary]} />}
        ListEmptyComponent={
          <View style={{ paddingTop: 60 }}>
            <EmptyState message="কোনো পণ্য নেই। 'নতুন' চেপে পণ্য যোগ করুন।" />
          </View>
        }
      />

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{draft.id ? 'পণ্য এডিট করুন' : 'নতুন পণ্য যোগ করুন'}</Text>

            <LabeledInput label="পণ্যের নাম *" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} />
            <LabeledInput label="ক্যাটাগরি" value={draft.category} onChangeText={(v) => setDraft({ ...draft, category: v })} />
            <LabeledInput label="SKU / কোড" value={draft.sku} onChangeText={(v) => setDraft({ ...draft, sku: v })} />

            <View style={styles.row}>
              <LabeledInput
                label="ক্রয় মূল্য"
                value={draft.purchase_price}
                onChangeText={(v) => setDraft({ ...draft, purchase_price: v })}
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 6 }}
              />
              <LabeledInput
                label="বিক্রি মূল্য"
                value={draft.sell_price}
                onChangeText={(v) => setDraft({ ...draft, sell_price: v })}
                keyboardType="numeric"
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            <View style={styles.row}>
              <LabeledInput
                label="স্টক"
                value={draft.stock}
                onChangeText={(v) => setDraft({ ...draft, stock: v })}
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 6 }}
              />
              <LabeledInput
                label="একক (pc/kg)"
                value={draft.unit}
                onChangeText={(v) => setDraft({ ...draft, unit: v })}
                style={{ flex: 1, marginLeft: 6 }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
  style?: any;
}) {
  return (
    <View style={[styles.inputWrap, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={theme.textLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.text },
  addBtn: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  productCard: { padding: 14 },
  productTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productName: { fontSize: 16, fontWeight: '700', color: theme.text },
  productMeta: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: theme.bg },
  priceRow: { flexDirection: 'row', gap: 6 },
  priceBox: { flex: 1, backgroundColor: theme.bg, borderRadius: 10, padding: 10 },
  priceLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 4 },
  priceValue: { fontSize: 15, fontWeight: '700', color: theme.text },
  row: { flexDirection: 'row' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 },
  inputWrap: { marginBottom: 12 },
  inputLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelText: { color: theme.textMuted, fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
