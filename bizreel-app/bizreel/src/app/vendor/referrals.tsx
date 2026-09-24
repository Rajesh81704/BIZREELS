import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { api } from '@/lib/api';

// Theme Design System Tokens matching Web & App
const GOLD = '#D99A3D';
const GOLD_DARK = '#9E6715';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#1A1A1A';
const TEXT_MUTED = '#64748B';
const EMERALD = '#059669';
const EMERALD_BG = '#ECFDF5';
const AMBER = '#D97706';
const AMBER_BG = '#FEF3C7';
const BLUE = '#2563EB';
const BLUE_BG = '#EFF6FF';
const WHATSAPP_GREEN = '#25D366';

// Multi-color avatar palette for referral history
const AVATAR_COLORS = [
  { bg: '#FEF3C7', text: '#9E6715', border: '#FDE68A' },
  { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
];

export default function VendorReferralsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralData, setReferralData] = useState<any>({
    referral_code: (user as any)?.referralCode || 'BIZ-VENDOR-882',
    referral_link: `https://bizreels.in/register?ref=${(user as any)?.referralCode || 'BIZ-VENDOR-882'}`,
    items: [],
    summary: {
      total: 0,
      successful: 0,
      credited: 0,
      pending: 0,
      credits_earned: 0,
      reward_per_referral: 200,
      bonus_per_referred: 100,
    },
  });

  const fetchReferralStats = async () => {
    try {
      const res = await api.get('/v1/users/me/referrals').catch(() => null);
      if (res?.data?.success || res?.data?.data) {
        const payload = res.data?.data || res.data || {};
        const codeVal = payload.referral_code || (user as any)?.referralCode || 'BIZ-VENDOR-882';
        setReferralData({
          referral_code: codeVal,
          referral_link: payload.referral_link || `https://bizreels.in/register?ref=${codeVal}`,
          items: Array.isArray(payload.items) ? payload.items : [],
          summary: {
            total: Number(payload.summary?.total ?? 0),
            successful: Number(payload.summary?.successful ?? 0),
            credited: Number(payload.summary?.credited ?? 0),
            pending: Number(payload.summary?.pending ?? 0),
            credits_earned: Number(payload.summary?.credits_earned ?? 0),
            reward_per_referral: Number(payload.summary?.reward_per_referral ?? 200),
            bonus_per_referred: Number(payload.summary?.bonus_per_referred ?? 100),
          },
        });
      }
    } catch {
      // Fallback state loaded
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReferralStats();
  };

  const handleCopyCode = () => {
    const codeToCopy = referralData.referral_code || 'BIZ-VENDOR-882';
    Clipboard.setString(codeToCopy);
    Alert.alert('🎉 Code Copied!', `Referral code "${codeToCopy}" copied to your clipboard.`);
  };

  const handleCopyLink = () => {
    const linkToCopy = referralData.referral_link;
    Clipboard.setString(linkToCopy);
    Alert.alert('🎉 Link Copied!', 'Referral link copied to clipboard. Share it with fellow business owners!');
  };

  const handleWhatsAppShare = () => {
    const codeVal = referralData.referral_code || 'BIZ-VENDOR-882';
    const linkVal = referralData.referral_link;
    const shareMessage = encodeURIComponent(
      `Hi! Join BizReels to list products & boost video reels! Use my referral code ${codeVal} to get ${referralData.summary.bonus_per_referred} bonus credits:\n${linkVal}`
    );
    const { Linking } = require('react-native');
    Linking.openURL(`https://wa.me/?text=${shareMessage}`).catch(() => {
      handleCopyLink();
    });
  };

  const handleNativeShare = async () => {
    const codeVal = referralData.referral_code || 'BIZ-VENDOR-882';
    const linkVal = referralData.referral_link;
    const shareMessage = `Grow your business on BizReels! Register your shop/store using my referral code ${codeVal} to claim ${referralData.summary.bonus_per_referred} free promotion credits.\n\nSign Up Now: ${linkVal}`;

    try {
      await Share.share({
        title: 'Join BizReels Vendor Portal',
        message: shareMessage,
        url: linkVal,
      });
    } catch {
      handleCopyLink();
    }
  };

  const summary = referralData.summary || {};
  const code = referralData.referral_code || 'BIZ-VENDOR-882';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Espresso Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>GROWTH &amp; REWARDS ✦</Text>
          <Text style={styles.headerTitle}>REFER &amp; EARN CREDITS</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={handleRefresh}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} colors={[GOLD]} />
        }>
        {/* Intro Program Banner with Accent Highlight */}
        <View style={styles.introCard}>
          <View style={styles.introHeaderRow}>
            <View style={styles.giftIconBox}>
              <Ionicons name="gift-outline" size={24} color={GOLD_DARK} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.introTitleRow}>
                <Text style={styles.introTitle}>INVITE BUSINESS PARTNERS</Text>
                <View style={styles.rewardBadge}>
                  <Ionicons name="flash" size={10} color={EMERALD} />
                  <Text style={styles.rewardBadgeText}>+{summary.reward_per_referral} Credits / Sign-up</Text>
                </View>
              </View>
              <Text style={styles.introSub}>
                Share your code with shop owners &amp; merchants. Earn {summary.reward_per_referral} free promotion credits when they list their first products or video reels!
              </Text>
            </View>
          </View>
        </View>

        {/* Main Code Container Box with Vibrant Contrast Accent */}
        <View style={styles.codeCard}>
          <Text style={styles.codeCardLabel}>YOUR EXCLUSIVE VENDOR INVITE CODE</Text>
          
          <View style={styles.codeDisplayBox}>
            <Text style={styles.codeText}>{code}</Text>
            <TouchableOpacity style={styles.copyPillBtn} onPress={handleCopyCode} activeOpacity={0.88}>
              <Ionicons name="copy-outline" size={14} color="#FFFFFF" />
              <Text style={styles.copyPillBtnText}>Copy Code</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons Row with WhatsApp Green, Copy Link, and Direct Share */}
          <View style={styles.shareActionsRow}>
            <TouchableOpacity style={styles.whatsAppShareBtn} onPress={handleWhatsAppShare} activeOpacity={0.88}>
              <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
              <Text style={styles.whatsAppShareText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOutlineBtn} onPress={handleCopyLink} activeOpacity={0.88}>
              <Ionicons name="link-outline" size={15} color={GOLD_DARK} />
              <Text style={styles.shareOutlineBtnText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareGoldBtn} onPress={handleNativeShare} activeOpacity={0.88}>
              <Ionicons name="share-social-outline" size={15} color={GOLD} />
              <Text style={styles.shareGoldBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Bento Metrics Cards Grid with Vibrant Color Accent Icons */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="stats-chart-outline" size={16} color={GOLD_DARK} />
          <Text style={styles.sectionTitleText}>PROGRAM PERFORMANCE METRICS</Text>
        </View>

        <View style={styles.metricsGrid}>
          {/* Card 1: Total Referrals (Blue Accent) */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxBlue}>
              <Ionicons name="people-outline" size={16} color={BLUE} />
            </View>
            <Text style={styles.metricLabel}>Total Referrals</Text>
            <Text style={[styles.metricValue, { color: BLUE }]}>{summary.total}</Text>
          </View>

          {/* Card 2: Listings Active (Emerald Accent) */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxEmerald}>
              <Ionicons name="checkmark-circle-outline" size={16} color={EMERALD} />
            </View>
            <Text style={styles.metricLabel}>Listings Active</Text>
            <Text style={[styles.metricValue, { color: EMERALD }]}>{summary.successful}</Text>
          </View>

          {/* Card 3: Pending Activation (Amber Accent) */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxAmber}>
              <Ionicons name="time-outline" size={16} color={AMBER} />
            </View>
            <Text style={styles.metricLabel}>Pending Signup</Text>
            <Text style={[styles.metricValue, { color: AMBER }]}>{summary.pending}</Text>
          </View>

          {/* Card 4: Total Credits Earned (Gold Accent) */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxGold}>
              <Ionicons name="flash" size={16} color={GOLD_DARK} />
            </View>
            <Text style={styles.metricLabel}>Credits Earned</Text>
            <Text style={[styles.metricValue, { color: GOLD_DARK }]}>₹{summary.credits_earned}</Text>
          </View>
        </View>

        {/* Referrals Signup History Ledger */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="receipt-outline" size={16} color={GOLD_DARK} />
          <Text style={styles.sectionTitleText}>REFERRAL SIGNUP HISTORY</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={GOLD} />
            <Text style={styles.loadingText}>Loading referral history...</Text>
          </View>
        ) : referralData.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="gift-outline" size={32} color={GOLD} />
            </View>
            <Text style={styles.emptyTitle}>No Referred Signups Yet</Text>
            <Text style={styles.emptySub}>
              Share your invite code "{code}" with shop owners &amp; business partners. You will earn {summary.reward_per_referral} credits automatically for every verified registration!
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {referralData.items.map((item: any, idx: number) => {
              const name = item.referred_name || 'Business Partner';
              const phone = item.referred_phone_masked || 'xxxxxx';
              const dateStr = item.created_at
                ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Recent';
              const isCredited = item.status === 'credited';
              const themeColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

              return (
                <View key={item.id || idx} style={styles.historyItemCard}>
                  <View style={styles.historyHeaderRow}>
                    <View style={[styles.historyAvatar, { backgroundColor: themeColor.bg, borderColor: themeColor.border }]}>
                      <Text style={[styles.historyAvatarText, { color: themeColor.text }]}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyNameText} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.historySubText}>Joined: {dateStr} • {phone}</Text>
                    </View>

                    <View style={[styles.statusPill, isCredited ? styles.statusPillCredited : styles.statusPillPending]}>
                      <Ionicons
                        name={isCredited ? 'checkmark-circle' : 'time'}
                        size={10}
                        color={isCredited ? EMERALD : AMBER}
                      />
                      <Text style={[styles.statusPillText, { color: isCredited ? EMERALD : AMBER }]}>
                        {isCredited ? 'Credited (+200)' : 'Pending Listing'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    gap: Spacing.two,
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
  headerBadge: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.3 },

  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 60 },

  introCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.four,
  },
  introHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  giftIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  introTitle: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900' },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: EMERALD_BG,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rewardBadgeText: { color: EMERALD, fontSize: 8.5, fontWeight: '900' },
  introSub: { color: TEXT_MUTED, fontSize: 11, marginTop: 4, lineHeight: 16 },

  codeCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.four,
    gap: 12,
  },
  codeCardLabel: { color: GOLD_DARK, fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
  codeDisplayBox: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: { color: GOLD_DARK, fontSize: 18, fontWeight: '900', letterSpacing: 1.5, fontFamily: 'monospace' },
  copyPillBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  copyPillBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  shareActionsRow: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  whatsAppShareBtn: {
    flex: 1,
    backgroundColor: WHATSAPP_GREEN,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  whatsAppShareText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  shareOutlineBtn: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  shareOutlineBtnText: { color: TEXT_MAIN, fontSize: 11, fontWeight: '900' },

  shareGoldBtn: {
    flex: 1,
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  shareGoldBtnText: { color: GOLD, fontSize: 11, fontWeight: '900' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sectionTitleText: { color: GOLD_DARK, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metricCard: {
    width: '48%',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 4,
  },
  metricIconBoxBlue: { width: 28, height: 28, borderRadius: 8, backgroundColor: BLUE_BG, alignItems: 'center', justifyContent: 'center' },
  metricIconBoxEmerald: { width: 28, height: 28, borderRadius: 8, backgroundColor: EMERALD_BG, alignItems: 'center', justifyContent: 'center' },
  metricIconBoxAmber: { width: 28, height: 28, borderRadius: 8, backgroundColor: AMBER_BG, alignItems: 'center', justifyContent: 'center' },
  metricIconBoxGold: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },

  metricLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: '700' },
  metricValue: { fontSize: 18, fontWeight: '900', color: TEXT_MAIN },

  historyList: { gap: 10 },
  historyItemCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: Spacing.three,
  },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyAvatarText: { fontSize: 13, fontWeight: '900' },
  historyNameText: { color: TEXT_MAIN, fontSize: 12, fontWeight: '900' },
  historySubText: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusPillCredited: { backgroundColor: EMERALD_BG, borderColor: '#A7F3D0' },
  statusPillPending: { backgroundColor: AMBER_BG, borderColor: '#FDE68A' },
  statusPillText: { fontSize: 9.5, fontWeight: '900' },

  loadingBox: { paddingVertical: 30, alignItems: 'center', gap: 8 },
  loadingText: { color: TEXT_MUTED, fontSize: 11, fontWeight: '700' },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5EFE4', borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  emptySub: { color: TEXT_MUTED, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
