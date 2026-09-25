import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function CreatorAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/creator').catch(() => api.get('/creator/dashboard'));
      const data = res.data?.data || res.data || {};
      setAnalytics(data);
    } catch (err) {
      console.warn('Failed to load creator analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  const totalReelViews = analytics?.totalReelViews ?? analytics?.portfolioViews ?? analytics?.views ?? 0;
  const profileViews = analytics?.profileViews ?? analytics?.profileImpressions ?? 0;
  const totalLikes = analytics?.totalLikes ?? analytics?.likes ?? 0;
  const totalShares = analytics?.totalShares ?? analytics?.shares ?? 0;
  const totalProjects = analytics?.totalProjects ?? analytics?.completedCampaignsCount ?? 0;
  const activeClients = analytics?.activeClients ?? 0;
  const totalEarnings = analytics?.totalEarnings ?? 0;
  const monthlyEarnings = analytics?.monthlyEarnings ?? 0;
  const escrowInReview = analytics?.escrowInReview ?? 0;
  const rating = analytics?.rating ?? 5.0;
  const reviewCount = analytics?.reviewCount ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR STUDIO</Text>
          <Text style={styles.headerTitle}>CREATOR ANALYTICS & INSIGHTS</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GOLD]} tintColor={GOLD} />}>

        {/* ── Key Performance Indicators Grid ── */}
        <Text style={styles.sectionHeading}>ENGAGEMENT & REACH</Text>
        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="eye-outline" size={20} color={GOLD} />
            </View>
            <Text style={styles.val}>{totalReelViews.toLocaleString('en-IN')}</Text>
            <Text style={styles.label}>Total Reel Views</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="person-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.val}>{profileViews.toLocaleString('en-IN')}</Text>
            <Text style={styles.label}>Profile Impressions</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="heart-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.val}>{totalLikes.toLocaleString('en-IN')}</Text>
            <Text style={styles.label}>Reel & Content Likes</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="share-social-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.val}>{totalShares.toLocaleString('en-IN')}</Text>
            <Text style={styles.label}>Content Shares</Text>
          </View>
        </View>

        {/* ── Creator Projects & Brand Clients ── */}
        <Text style={styles.sectionHeading}>CLIENTS & PROJECTS</Text>
        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="briefcase-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.val}>{totalProjects}</Text>
            <Text style={styles.label}>Total Brand Projects</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="people-outline" size={20} color="#D97706" />
            </View>
            <Text style={styles.val}>{activeClients}</Text>
            <Text style={styles.label}>Active Brand Clients</Text>
          </View>
        </View>

        {/* ── Financial & Escrow Summary ── */}
        <Text style={styles.sectionHeading}>EARNINGS & ESCROW</Text>
        <View style={styles.financeCard}>
          <View style={styles.financeRow}>
            <View>
              <Text style={styles.financeSubLabel}>LIFETIME EARNINGS</Text>
              <Text style={styles.financeVal}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons name="wallet-outline" size={14} color={GOLD} />
              <Text style={styles.badgeText}>Wallet</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.financeGrid}>
            <View style={styles.financeCol}>
              <Text style={styles.financeMiniLabel}>THIS MONTH</Text>
              <Text style={styles.financeMiniVal}>₹{monthlyEarnings.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.financeCol}>
              <Text style={styles.financeMiniLabel}>ESCROW IN REVIEW</Text>
              <Text style={styles.financeMiniVal}>₹{escrowInReview.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* ── Rating & Reputation ── */}
        <View style={styles.reputationCard}>
          <Ionicons name="star" size={28} color={GOLD} />
          <View style={{ flex: 1 }}>
            <Text style={styles.repTitle}>{rating} ★ Average Rating</Text>
            <Text style={styles.repSub}>Based on {reviewCount} verified vendor client reviews</Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: { padding: Spacing.four, paddingBottom: 40, gap: Spacing.three },
  sectionHeading: { color: ESPRESSO, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.four,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  val: { color: ESPRESSO, fontSize: FontSize.xl, fontWeight: '900' },
  label: { color: TEXT_MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  financeCard: {
    backgroundColor: ESPRESSO,
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#3A2C22',
    gap: Spacing.three,
  },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financeSubLabel: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },
  financeVal: { color: '#FFFFFF', fontSize: FontSize['2xl'], fontWeight: '900', marginTop: 2 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: GOLD, fontSize: 10, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#3A2C22' },
  financeGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  financeCol: { flex: 1 },
  financeMiniLabel: { color: TEXT_MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  financeMiniVal: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '900', marginTop: 2 },

  reputationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.four,
    marginTop: 4,
  },
  repTitle: { color: ESPRESSO, fontSize: FontSize.base, fontWeight: '900' },
  repSub: { color: TEXT_MUTED, fontSize: FontSize.xs },
});
