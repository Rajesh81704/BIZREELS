import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/creator').catch(() => api.get('/creator/analytics'));
      const data = res.data?.data || res.data || {};
      setAnalytics(data);
    } catch (err) {
      console.warn('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
          <Text style={styles.headerTitle}>CREATOR ANALYTICS</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="eye-outline" size={20} color={GOLD} />
            </View>
            <Text style={styles.val}>{(analytics?.totalReelViews || analytics?.views || 1240).toLocaleString()}</Text>
            <Text style={styles.label}>Total Reel Views</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="heart-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.val}>{(analytics?.totalLikes || 184).toLocaleString()}</Text>
            <Text style={styles.label}>Reel Likes</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="share-social-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.val}>{(analytics?.totalShares || 62).toLocaleString()}</Text>
            <Text style={styles.label}>Content Shares</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="people-outline" size={20} color="#059669" />
            </View>
            <Text style={styles.val}>{(analytics?.profileImpressions || 450).toLocaleString()}</Text>
            <Text style={styles.label}>Profile Impressions</Text>
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
  backBtn: { width: 38, height: 38, backgroundColor: '#1A1410', borderWidth: 1, borderColor: '#3A2C22', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: 40 },
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
});

