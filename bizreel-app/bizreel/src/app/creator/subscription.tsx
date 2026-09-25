import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Spacing } from '@/constants/theme';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function CreatorSubscriptionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR PORTAL</Text>
          <Text style={styles.headerTitle}>MEMBERSHIP & SUBSCRIPTION</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle-outline" size={48} color={GOLD} />
          </View>
          <Text style={styles.title}>No Subscription Required</Text>
          <Text style={styles.description}>
            Creator accounts on BizReels enjoy full free access to all creator tools, campaign invitations, portfolio showcases, and instant payout withdrawals.
          </Text>
          <Text style={styles.subtext}>You earn directly on completed orders without any monthly plan fees.</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/creator/dashboard' as any)}
            activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Go to Creator Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
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

  content: {
    flex: 1,
    padding: Spacing.five,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3E8D2',
    marginBottom: Spacing.two,
  },
  title: {
    color: ESPRESSO,
    fontSize: FontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: TEXT_MAIN,
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  subtext: {
    color: TEXT_MUTED,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: -4,
  },
  primaryBtn: {
    backgroundColor: ESPRESSO,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: Spacing.three,
  },
  primaryBtnText: {
    color: GOLD,
    fontSize: FontSize.sm,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
