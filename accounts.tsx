import { useFocusEffect } from 'expo-router';
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
import { Plus, Trash2, Users, Truck, Wallet } from 'lucide-react-native';
import { Card, EmptyState, SectionTitle } from '@/components/ui';
import { addCustomer, addExpense, deleteCustomer, deleteSupplier, listCustomers, listExpenses, listSuppliers, addSupplier } from '@/lib/repo';
import { formatDate, formatMoney, theme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'customers' | 'suppliers' | 'expenses';

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expNote, setExpNote] = useState('');

  const load = useCallback(async () => {
    const [c, s, e] = await Promise.all([listCustomers(), listSuppliers(), listExpenses()]);
    setCustomers(c);
    setSuppliers(s);
    setExpenses(e);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openAdd = () => {
    setName('');
    setPhone('');
    setAddress('');
    setExpAmount('');
    setExpCategory('');
    setExpNote('');
    setModal(true);
  };

  const save = async () => {
    if (tab === 'customers') {
      if (!name.trim()) return;
      await addCustomer(name.trim(), phone, address);
    } else if (tab === 'suppliers') {
      if (!name.trim()) return;
      await addSupplier(name.trim(), phone, address);
    } else {
      const amt = parseFloat(expAmount) || 0;
      if (amt <= 0) return;
      await addExpense(amt, expCategory, expNote);
    }
    setModal(false);
    setLoading(true);
    load();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>খাতা</Text>
        <Text style={styles.subtitle}>কাস্টমার, সাপ্লায়ার ও খরচ</Text>
      </View>

      <View style={styles.tabs}>
        <TabBtn active={tab === 'customers'} onPress={() => setTab('customers')} icon={<Users size={14} color={tab === 'customers' ? '#fff' : theme.textMuted} />} label="কাস্টমার" />
        <TabBtn active={tab === 'suppliers'} onPress={() => setTab('suppliers')} icon={<Truck size={14} color={tab === 'suppliers' ? '#fff' : theme.textMuted} />} label="সাপ্লায়ার" />
        <TabBtn active={tab === 'expenses'} onPress={() => setTab('expenses')} icon={<Wallet size={14} color={tab === 'expenses' ? '#fff' : theme.textMuted} />} label="খরচ" />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>যোগ করুন</Text>
        </TouchableOpacity>
      </View>

      {tab === 'expenses' ? (
        <FlatList
          data={expenses}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.primary]} />}
          ListEmptyComponent={<EmptyState message="কোনো খরচ এন্ট্রি নেই" />}
          renderItem={({ item }) => (
            <Card style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.category || 'খরচ'}</Text>
                <Text style={styles.rowSub}>
                  {formatDate(item.created_at)}
                  {item.note ? ` • ${item.note}` : ''}
                </Text>
              </View>
              <Text style={[styles.rowAmount, { color: theme.error }]}>{formatMoney(item.amount)}</Text>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={tab === 'customers' ? customers : suppliers}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.primary]} />}
          ListEmptyComponent={
            <EmptyState message={tab === 'customers' ? 'কোনো কাস্টমার নেই' : 'কোনো সাপ্লায়ার নেই'} />
          }
          renderItem={({ item }) => (
            <Card style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {item.phone ? `${item.phone} • ` : ''}
                  ব্যালেন্স: {formatMoney(item.balance)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (tab === 'customers') await deleteCustomer(item.id);
                  else await deleteSupplier(item.id);
                  load();
                }}>
                <Trash2 size={16} color={theme.error} />
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {tab === 'customers' ? 'নতুন কাস্টমার' : tab === 'suppliers' ? 'নতুন সাপ্লায়ার' : 'নতুন খরচ'}
            </Text>

            {tab === 'expenses' ? (
              <>
                <Field label="পরিমাণ (৳)" value={expAmount} onChangeText={setExpAmount} keyboardType="numeric" />
                <Field label="ক্যাটাগরি" value={expCategory} onChangeText={setExpCategory} />
                <Field label="মন্তব্য" value={expNote} onChangeText={setExpNote} />
              </>
            ) : (
              <>
                <Field label="নাম *" value={name} onChangeText={setName} />
                <Field label="ফোন" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Field label="ঠিকানা" value={address} onChangeText={setAddress} />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveText}>সেভ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TabBtn({ active, onPress, icon, label }: { active: boolean; onPress: () => void; icon: any; label: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && { backgroundColor: theme.primary }]}>
      {icon}
      <Text style={[styles.tabText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'default' | 'numeric' | 'phone-pad' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
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
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  tabText: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  actionRow: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingHorizontal: 14, height: 40, borderRadius: 10, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  rowSub: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  rowAmount: { fontSize: 16, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: theme.textMuted, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: theme.text, backgroundColor: theme.bg },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  cancelText: { color: theme.textMuted, fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
