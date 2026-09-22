import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Withdraw Modal State
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        api.get('/wallet/creator').catch(() => api.get('/wallet?role=creator')).catch(() => ({ data: { balance: 0 } })),
        api.get('/transactions/creator').catch(() => api.get('/wallet/transactions?role=creator')).catch(() => ({ data: { items: [] } })),
      ]);

      const wData = walletRes.data?.data || walletRes.data || {};
      setBalance(wData.balance ?? wData.walletBalance ?? wData.earnings ?? 0);

      const tData = txRes.data?.data?.items || txRes.data?.data || txRes.data?.items || txRes.data?.transactions || txRes.data || [];
      setTransactions(Array.isArray(tData) ? tData : []);
    } catch (err) {
      console.warn('Failed to load creator wallet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  // Metric Computations matching web CreatorWalletPage.jsx
  const completedProjectsCount = transactions.length;
  const pendingAmount = transactions
    .filter((t) => t.status === 'pending' || t.status === 'processing')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  // Filtered transactions matching web search
  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (tx.title || tx.description || tx.project || '').toLowerCase();
    const client = (tx.vendor || tx.vendorName || tx.client || '').toLowerCase();
    return title.includes(q) || client.includes(q);
  });

  const handleWithdraw = async (overrideAmount?: number) => {
    const amt = overrideAmount || Number(withdrawAmount);
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
      await api.post('/wallet/payout', { amount: amt, role: 'creator' })
        .catch(() => api.post('/wallet/withdraw', { amount: amt, role: 'creator' }));
      Alert.alert('Withdrawal Requested 🎉', `Payout withdrawal request for ₹${amt.toLocaleString('en-IN')} submitted successfully!`);
      setWithdrawModal(false);
      setWithdrawAmount('');
      fetchWallet();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Loading Creator Wallet &amp; Payouts...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR STUDIO ✦</Text>
          <Text style={styles.headerTitle}>EARNINGS &amp; PAYOUT WALLET</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={fetchWallet}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}>
        
        {/* Top Hero Banner matching web AdminPageHeader */}
        <View style={styles.heroBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>FINANCE &amp; PAYOUTS</Text>
            <Text style={styles.heroTitle}>Creator Earnings Wallet</Text>
            <Text style={styles.heroSub}>Withdraw shoot earnings directly to your bank account or UPI ID.</Text>
          </View>
          <TouchableOpacity style={styles.heroWithdrawBtn} onPress={() => setWithdrawModal(true)} activeOpacity={0.88}>
            <Ionicons name="cash" size={16} color={GOLD} />
            <Text style={styles.heroWithdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Stat Cards Grid matching web AdminStatCard */}
        <View style={styles.statsGrid}>
          {/* Total Earnings */}
          <View style={styles.statCard}>
            <View style={styles.statIconBoxEmerald}>
              <Ionicons name="wallet-outline" size={18} color="#059669" />
            </View>
            <Text style={styles.statLabel}>Total Earnings</Text>
            <Text style={[styles.statValue, { color: '#059669' }]}>₹{balance.toLocaleString('en-IN')}</Text>
          </View>

          {/* Completed Projects */}
          <View style={styles.statCard}>
            <View style={styles.statIconBoxPurple}>
              <Ionicons name="arrow-down-circle-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.statLabel}>Completed Projects</Text>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>{completedProjectsCount}</Text>
          </View>

          {/* Pending Payouts */}
          <View style={styles.statCard}>
            <View style={styles.statIconBoxAmber}>
              <Ionicons name="time-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.statLabel}>Pending Payouts</Text>
            <Text style={[styles.statValue, { color: '#D97706' }]}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Search Bar for Transactions */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search earnings history..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Transaction History Section */}
        <Text style={styles.sectionTitle}>EARNINGS &amp; PAYOUT HISTORY</Text>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No Payout History Found</Text>
            <Text style={styles.emptySub}>Earnings for completed brand shoots and campaign payouts will appear here.</Text>
          </View>
        ) : (
          filteredTransactions.map((row, idx) => {
            const isCredit = row.type === 'credit' || row.credit_debit === 'credit' || row.status === 'completed' || row.status === 'success';
            const statusLabel = row.status ? String(row.status).toUpperCase() : 'COMPLETED';
            const displayTitle = row.project || row.title || row.description || 'Project Shoot Campaign';
            const displayClient = row.vendor || row.vendorName || row.client || 'Verified Brand Client';
            const displayDate = row.date || (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Recent');

            return (
              <View key={row._id || row.id || idx} style={styles.txCard}>
                <View style={[styles.txIconBox, isCredit ? styles.iconBoxCredit : styles.iconBoxDebit]}>
                  <Ionicons
                    name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={20}
                    color={isCredit ? '#059669' : '#DC2626'}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle} numberOfLines={1}>{displayTitle}</Text>
                  <Text style={styles.txSub} numberOfLines={1}>
                    Client: {displayClient} • {displayDate}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.txAmount, isCredit ? styles.creditText : styles.debitText]}>
                    {isCredit ? '+' : '-'}₹{(row.amount || 0).toLocaleString('en-IN')}
                  </Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{statusLabel}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Withdraw Payout Modal */}
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
              <Text style={styles.modalBalanceLabel}>Available Earnings Balance</Text>
              <Text style={styles.modalBalanceVal}>₹{balance.toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity
              style={styles.fullWithdrawChip}
              onPress={() => handleWithdraw(balance)}
              disabled={submitting || balance <= 0}>
              <Ionicons name="flash-outline" size={14} color={GOLD} />
              <Text style={styles.fullWithdrawChipText}>Withdraw Full Balance (₹{balance.toLocaleString('en-IN')})</Text>
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Or Enter Custom Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2500"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => handleWithdraw()}
              disabled={submitting}
              activeOpacity={0.88}>
              {submitting ? (
                <ActivityIndicator color={GOLD} />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Bank / UPI Payout</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },
  loadingContainer: { flex: 1, backgroundColor: BG_MATTE, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: TEXT_MUTED, fontSize: FontSize.xs, fontWeight: '700' },

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
  backBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 40 },

  heroBanner: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 16,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroEyebrow: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: FontSize.base, fontWeight: '900', marginTop: 2 },
  heroSub: { color: '#94A3B8', fontSize: 11, marginTop: 2, lineHeight: 15 },
  heroWithdrawBtn: {
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroWithdrawBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900' },

  statsGrid: { flexDirection: 'row', gap: Spacing.two },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBoxEmerald: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  statIconBoxPurple: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  statIconBoxAmber: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: TEXT_MUTED, fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  statValue: { fontSize: FontSize.sm, fontWeight: '900' },

  searchBox: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: TEXT_MAIN, fontSize: FontSize.xs },

  sectionTitle: { color: ESPRESSO, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900' },
  emptySub: { color: TEXT_MUTED, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 16 },

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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxCredit: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  iconBoxDebit: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  txTitle: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  txSub: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },
  txAmount: { fontSize: FontSize.sm, fontWeight: '900' },
  creditText: { color: '#059669' },
  debitText: { color: '#DC2626' },
  statusPill: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusPillText: { color: '#065F46', fontSize: 8.5, fontWeight: '900' },

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
  fullWithdrawChip: {
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: GOLD,
    padding: Spacing.three,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fullWithdrawChipText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900' },
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


