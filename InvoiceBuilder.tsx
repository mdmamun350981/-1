import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, X, Search, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { theme, formatMoney } from '@/lib/theme';

export type CartItem = {
  product_id: number;
  product_name: string;
  qty: number;
  price: number;
  stock?: number;
};

export type PartyLite = { id: number; name: string };

type Props = {
  visible: boolean;
  mode: 'sale' | 'purchase';
  products: { id: number; name: string; sell_price: number; purchase_price: number; stock: number; unit: string }[];
  parties: PartyLite[];
  onClose: () => void;
  onSubmit: (data: {
    items: CartItem[];
    party_id?: number;
    party_name?: string;
    paid?: number;
    discount?: number;
    note?: string;
  }) => Promise<void>;
};

export function InvoiceBuilder({ visible, mode, products, parties, onClose, onSubmit }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyName, setPartyName] = useState('');
  const [paid, setPaid] = useState('');
  const [discount, setDiscount] = useState('0');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');

  useEffect(() => {
    if (visible) {
      setCart([]);
      setSearch('');
      setPartyId(null);
      setPartyName('');
      setPaid('');
      setDiscount('0');
      setNote('');
    }
  }, [visible]);

  const unitPrice = (p: (typeof products)[number]) => (mode === 'sale' ? p.sell_price : p.purchase_price);

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (p: (typeof products)[number]) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) {
        return prev.map((i) => (i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product_id: p.id, product_name: p.name, qty: 1, price: unitPrice(p), stock: p.stock }];
    });
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== id));
      return;
    }
    setCart((prev) => prev.map((i) => (i.product_id === id ? { ...i, qty } : i)));
  };

  const updatePrice = (id: number, price: number) => {
    setCart((prev) => prev.map((i) => (i.product_id === id ? { ...i, price } : i)));
  };

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const disc = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - disc);
  const paidNum = paid === '' ? total : parseFloat(paid) || 0;

  const submit = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      await onSubmit({
        items: cart,
        party_id: partyId ?? undefined,
        party_name: partyName || undefined,
        paid: paidNum,
        discount: disc,
        note: note || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{mode === 'sale' ? 'নতুন বিক্রি (Invoice)' : 'নতুন ক্রয়'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Party */}
          <TouchableOpacity style={styles.partyBtn} onPress={() => setShowPartyModal(true)}>
            <Text style={styles.partyLabel}>{mode === 'sale' ? 'কাস্টমার' : 'সাপ্লায়ার'}: </Text>
            <Text style={styles.partyValue}>{partyName || 'ওয়াকআউট (নির্বাচন করুন)'}</Text>
          </TouchableOpacity>

          {/* Product search */}
          <View style={styles.searchBox}>
            <Search size={16} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="পণ্য খুঁজুন"
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={theme.textLight}
            />
          </View>

          <View style={styles.body}>
            {/* Product list */}
            <View style={styles.productCol}>
              <Text style={styles.colTitle}>পণ্য</Text>
              <FlatList
                data={filteredProducts}
                keyExtractor={(i) => String(i.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.productRow} onPress={() => addToCart(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName}>{item.name}</Text>
                      <Text style={styles.pMeta}>
                        স্টক: {item.stock} {item.unit} • {formatMoney(unitPrice(item))}
                      </Text>
                    </View>
                    <Plus size={16} color={theme.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyHint}>পণ্য পাওয়া যায়নি</Text>}
              />
            </View>

            {/* Cart */}
            <View style={styles.cartCol}>
              <Text style={styles.colTitle}>কার্ট ({cart.length})</Text>
              <FlatList
                data={cart}
                keyExtractor={(i) => String(i.product_id)}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <Text style={styles.cartName} numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <View style={styles.cartControls}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product_id, item.qty - 1)}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        value={String(item.qty)}
                        keyboardType="numeric"
                        onChangeText={(v) => updateQty(item.product_id, parseFloat(v) || 0)}
                      />
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product_id, item.qty + 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.priceInput}
                      value={String(item.price)}
                      keyboardType="numeric"
                      onChangeText={(v) => updatePrice(item.product_id, parseFloat(v) || 0)}
                    />
                    <TouchableOpacity onPress={() => updateQty(item.product_id, 0)}>
                      <Trash2 size={16} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyHint}>কার্ট খালি</Text>}
              />
            </View>
          </View>

          {/* Totals */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>উপমোট</Text>
              <Text style={styles.summaryValue}>{formatMoney(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ছাড়</Text>
              <TextInput
                style={styles.discInput}
                value={discount}
                keyboardType="numeric"
                onChangeText={setDiscount}
              />
            </View>
            <View style={[styles.summaryRow, { marginTop: 4 }]}>
              <Text style={styles.totalLabel}>মোট</Text>
              <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>জমা (পরিশোধ)</Text>
              <TextInput
                style={styles.discInput}
                value={paid}
                placeholder={String(total)}
                keyboardType="numeric"
                onChangeText={setPaid}
                placeholderTextColor={theme.textLight}
              />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>বাকি</Text>
              <Text style={[styles.summaryValue, { color: total - paidNum > 0 ? theme.error : theme.success }]}>
                {formatMoney(total - paidNum)}
              </Text>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder="মন্তব্য (ঐচ্ছিক)"
              value={note}
              onChangeText={setNote}
              placeholderTextColor={theme.textLight}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving || cart.length === 0}>
              <Text style={styles.submitText}>
                {saving ? 'সেভ হচ্ছে...' : mode === 'sale' ? 'বিক্রি সেভ করুন' : 'ক্রয় সেভ করুন'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Party picker modal */}
        <Modal visible={showPartyModal} animationType="fade" transparent onRequestClose={() => setShowPartyModal(false)}>
          <View style={styles.partyModalBg}>
            <Card style={styles.partyModalCard}>
              <Text style={styles.partyModalTitle}>
                {mode === 'sale' ? 'কাস্টমার নির্বাচন' : 'সাপ্লায়ার নির্বাচন'}
              </Text>
              <TouchableOpacity
                style={styles.partyOption}
                onPress={() => {
                  setPartyId(null);
                  setPartyName('');
                  setShowPartyModal(false);
                }}>
                <Text style={styles.partyOptionText}>ওয়াকআউট (কাস্টমার ছাড়া)</Text>
              </TouchableOpacity>
              {parties.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.partyOption}
                  onPress={() => {
                    setPartyId(p.id);
                    setPartyName(p.name);
                    setShowPartyModal(false);
                  }}>
                  <Text style={styles.partyOptionText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.newPartyRow}>
                <TextInput
                  style={styles.newPartyInput}
                  placeholder="নতুন নাম যোগ করুন"
                  value={newPartyName}
                  onChangeText={setNewPartyName}
                  placeholderTextColor={theme.textLight}
                />
                <TouchableOpacity
                  disabled={!newPartyName.trim()}
                  onPress={() => {
                    setPartyId(null);
                    setPartyName(newPartyName.trim());
                    setNewPartyName('');
                    setShowPartyModal(false);
                  }}>
                  <Text style={[styles.newPartyAdd, !newPartyName.trim() && { opacity: 0.4 }]}>যোগ</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    padding: 16,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: theme.text },
  closeBtn: { padding: 6 },
  partyBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  partyLabel: { fontSize: 13, color: theme.textMuted },
  partyValue: { fontSize: 14, fontWeight: '600', color: theme.text, flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.text },
  body: { flexDirection: 'row', flex: 1, gap: 10 },
  productCol: { flex: 1.1 },
  cartCol: { flex: 1.4 },
  colTitle: { fontSize: 12, fontWeight: '700', color: theme.textMuted, marginBottom: 6 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pName: { fontSize: 14, fontWeight: '600', color: theme.text },
  pMeta: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  emptyHint: { fontSize: 12, color: theme.textLight, paddingVertical: 12, textAlign: 'center' },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 6,
  },
  cartName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.text },
  cartControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: theme.primary },
  qtyInput: { width: 36, textAlign: 'center', fontSize: 13, fontWeight: '600', color: theme.text },
  priceInput: { width: 64, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 6, fontSize: 12, color: theme.text },
  summary: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  summaryLabel: { fontSize: 13, color: theme.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '600', color: theme.text },
  discInput: { width: 110, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 8, fontSize: 13, color: theme.text, textAlign: 'right' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: theme.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: theme.primary },
  noteInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: theme.text, marginTop: 8 },
  submitBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  partyModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  partyModalCard: { maxHeight: '80%' },
  partyModalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 12 },
  partyOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  partyOptionText: { fontSize: 14, color: theme.text },
  newPartyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  newPartyInput: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: theme.text },
  newPartyAdd: { color: theme.primary, fontWeight: '700', fontSize: 14, paddingHorizontal: 8 },
});
