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

interface Review {
  _id: string;
  rating: number;
  comment: string;
  user?: { name?: string };
  createdAt?: string;
}

export default function CreatorReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/me');
      const data = res.data?.data || res.data || {};
      const list = data.reviews || (Array.isArray(data) ? data : []);
      setReviews(list);
    } catch (err) {
      console.warn('Failed to load creator reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
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
          <Text style={styles.headerTitle}>CLIENT REVIEWS</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="star-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySub}>Feedback and star ratings from brand clients will appear here.</Text>
          </View>
        ) : (
          reviews.map((rev) => (
            <View key={rev._id} style={styles.reviewCard}>
              <View style={styles.revHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.revUser}>
                    {(rev as any).author?.name || (rev as any).user?.name || (rev as any).userName || (rev as any).user_name || (rev as any).customer || (rev as any).name || 'Client Vendor'}
                  </Text>
                  <Text style={styles.revDate}>
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Recent Client'}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>★ {rev.rating}.0</Text>
                </View>
              </View>
              <Text style={styles.revComment}>{rev.comment}</Text>
            </View>
          ))
        )}
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
  scrollContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },

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

  reviewCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  revHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revUser: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  revDate: { color: TEXT_MUTED, fontSize: 10, marginTop: 1 },
  ratingBadge: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: GOLD, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ratingBadgeText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900' },
  revComment: { color: TEXT_MAIN, fontSize: FontSize.xs, lineHeight: 18, marginTop: 2 },
});

