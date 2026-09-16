import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const INPUT_BG = '#F8FAFC';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function CreatorWalletScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Withdraw Modal
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        api.get('/wallet?role=creator').catch(() => ({ data: { balance: 0 } })),
        api.get('/transactions?role=creator').catch(() => ({ data: { items: [] } })),
      ]);

      const wData = walletRes.data?.data || walletRes.data || {};
      setBalance(wData.balance || 0);

      const tData = txRes.data?.data?.items || txRes.data?.items || txRes.data || [];
      setTransactions(Array.isArray(tData) ? tData : []);
    } catch (err) {
      console.warn('Failed to load creator wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Required', 'Please enter a valid amount to withdraw');
      return;
    }
    if (amt > balance) {
      Alert.alert('Insufficient Balance', 'Requested withdrawal amount exceeds your available balance.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/wallet/withdraw', { amount: amt, role: 'creator' });
      Alert.alert('Withdrawal Requested', `₹${amt} payout request submitted successfully!`);
      setWithdrawModal(false);
      setWithdrawAmount('');
      fetchWallet();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to process payout request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR STUDIO</Text>
          <Text style={styles.headerTitle}>WALLET &amp; EARNINGS</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>AVAILABLE EARNINGS BALANCE</Text>
          <Text style={styles.balanceVal}>₹{balance.toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={styles.withdrawBtn} onPress={() => setWithdrawModal(true)} activeOpacity={0.85}>
            <Ionicons name="cash-outline" size={18} color={GOLD} />
            <Text style={styles.withdrawBtnText}>Withdraw Earnings to Bank</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>TRANSACTION HISTORY</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySub}>Payouts for completed shoot campaigns will appear here.</Text>
          </View>
        ) : (
          transactions.map((tx, idx) => (
            <View key={tx._id || idx} style={styles.txCard}>
              <View style={styles.txIconBox}>
                <Ionicons
                  name={tx.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={20}
                  color={tx.type === 'credit' ? '#059669' : '#DC2626'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{tx.description || tx.type?.toUpperCase()}</Text>
                <Text style={styles.txDate}>{new Date(tx.created_at || Date.now()).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, tx.type === 'credit' ? styles.credit : styles.debit]}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={withdrawModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout Withdrawal</Text>
              <TouchableOpacity onPress={() => setWithdrawModal(false)}>
                <Ionicons name="close" size={22} color={TEXT_MAIN} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBalanceBox}>
              <Text style={styles.modalBalanceLabel}>Available Balance</Text>
              <Text style={styles.modalBalanceVal}>₹{balance.toLocaleString('en-IN')}</Text>
            </View>

            <Text style={styles.modalLabel}>Enter Amount to Withdraw (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2500"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleWithdraw} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color={GOLD} /> : <Text style={styles.modalSubmitText}>Submit Bank Payout</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },
  loadingContainer: { flex: 1, backgroundColor: BG_MATTE, alignItems: 'center', justifyContent: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    gap: Spacing.three,
  },
  backBtn: { width: 38, height: 38, backgroundColor: '#1A1410', borderWidth: 1, borderColor: '#3A2C22', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 16,
    padding: Spacing.five,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceTitle: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  balanceVal: { color: '#FFFFFF', fontSize: FontSize['3xl'], fontWeight: '900' },
  withdrawBtn: {
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  withdrawBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 0.5 },

  sectionTitle: { color: ESPRESSO, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900' },
  emptySub: { color: TEXT_MUTED, fontSize: FontSize.xs, textAlign: 'center' },

  txCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  txDate: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },
  txAmount: { fontSize: FontSize.sm, fontWeight: '900' },
  credit: { color: '#059669' },
  debit: { color: '#DC2626' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.four },
  modalContent: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.five,
    gap: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: ESPRESSO, fontSize: FontSize.base, fontWeight: '900' },
  modalBalanceBox: { backgroundColor: BG_MATTE, borderWidth: 1, borderColor: BORDER_COLOR, padding: Spacing.three, borderRadius: 10 },
  modalBalanceLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: '700' },
  modalBalanceVal: { color: ESPRESSO, fontSize: FontSize.lg, fontWeight: '900', marginTop: 2 },
  modalLabel: { color: '#334155', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    color: TEXT_MAIN,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: FontSize.xs,
    borderRadius: 8,
  },
  modalSubmitBtn: { backgroundColor: ESPRESSO, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  modalSubmitText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1 },
});

