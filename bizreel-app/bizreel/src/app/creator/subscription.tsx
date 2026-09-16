import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

interface Plan {
  id: string;
  name: string;
  price: number;
  boostCredits: number;
  features: string[];
}

export default function CreatorSubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [subscribing, setSubscribing] = useState(false);

  const fetchSubscription = async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        api.get('/subscription/my-subscription').catch(() => ({ data: null })),
        api.get('/subscription/plans?role=creator').catch(() => ({ data: null })),
      ]);

      const subData = subRes.data?.data || subRes.data || {};
      setCurrentPlan(subData.plan || 'free');

      const planItems = plansRes.data?.data?.items || plansRes.data?.items || plansRes.data?.data || [];
      if (Array.isArray(planItems)) {
        setDbPlans(
          planItems.filter((p: any) => {
            if (!p.is_active || p.is_archived) return false;
            const pRole = (p.user_type || p.target_role || '').toLowerCase();
            return pRole === 'creator' || pRole === 'all';
          })
        );
      }
    } catch (err) {
      console.warn('Failed to load creator subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleUpgrade = async (planId: string) => {
    setSubscribing(true);
    try {
      await api.post('/subscription/upgrade', { planId, role: 'creator' });
      Alert.alert('Subscribed!', 'Successfully upgraded your subscription plan.');
      fetchSubscription();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upgrade plan');
    } finally {
      setSubscribing(false);
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
          <Text style={styles.headerTitle}>CREATOR SUBSCRIPTION</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.activePlanCard}>
          <Text style={styles.activePlanTitle}>ACTIVE MEMBERSHIP PLAN</Text>
          <Text style={styles.activePlanVal}>{currentPlan.toUpperCase()}</Text>
        </View>

        <Text style={styles.sectionTitle}>UPGRADE CREATOR PLAN</Text>

        {dbPlans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Standard Creator Membership</Text>
            <Text style={styles.emptySub}>No paid creator subscription plans are currently active.</Text>
          </View>
        ) : (
          dbPlans.map((plan) => {
            const planId = plan._id || plan.id;
            const planTitle = plan.title || plan.name || 'CREATOR PLAN';
            const isCurrent = currentPlan.toLowerCase() === planTitle.toLowerCase() || currentPlan === planId;
            const priceVal = plan.price_inr || plan.price || 0;
            const rawFeatures = Array.isArray(plan.features_list) && plan.features_list.length > 0
              ? plan.features_list
              : (typeof plan.features === 'string' ? plan.features.split(',').map((f: string) => f.trim()) : []);

            return (
              <View key={planId} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{planTitle}</Text>
                  <Text style={styles.planPrice}>₹{priceVal.toLocaleString('en-IN')}/mo</Text>
                </View>

                <View style={styles.featuresList}>
                  {rawFeatures.map((feat: string, idx: number) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={GOLD} />
                      <Text style={styles.featureText}>{feat}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.upgradeBtn, isCurrent && styles.upgradeBtnActive]}
                  onPress={() => handleUpgrade(planId)}
                  disabled={isCurrent || subscribing}
                  activeOpacity={0.85}>
                  <Text style={[styles.upgradeBtnText, isCurrent && styles.upgradeBtnTextActive]}>
                    {isCurrent ? 'Current Active Plan' : `Upgrade to ${planTitle}`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
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
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 40 },

  activePlanCard: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 14,
    padding: Spacing.four,
    gap: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  activePlanTitle: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },
  activePlanVal: { color: '#FFFFFF', fontSize: FontSize.xl, fontWeight: '900' },

  sectionTitle: { color: ESPRESSO, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  planCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: ESPRESSO, fontSize: FontSize.base, fontWeight: '900' },
  planPrice: { color: GOLD, fontSize: FontSize.base, fontWeight: '900' },
  featuresList: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '600' },
  upgradeBtn: { backgroundColor: ESPRESSO, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  upgradeBtnActive: { backgroundColor: BG_MATTE, borderWidth: 1, borderColor: BORDER_COLOR },
  upgradeBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 0.5 },
  upgradeBtnTextActive: { color: TEXT_MUTED },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900' },
  emptySub: { color: TEXT_MUTED, fontSize: FontSize.xs, textAlign: 'center' },
});

