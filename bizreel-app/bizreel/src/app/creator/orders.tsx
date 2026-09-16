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

interface CreatorOrder {
  _id: string;
  id: string;
  title: string;
  vendor_name: string;
  amount: number;
  status: string;
  type: string;
  created_at: string;
}

export default function CreatorOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<CreatorOrder[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/creator/orders');
      const list = res.data?.data || res.data || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load creator orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/creator/orders/${id}/status`, { status: newStatus });
      Alert.alert('Updated', `Order status set to "${newStatus}"`);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order status');
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
          <Text style={styles.headerTitle}>ORDERS &amp; PROJECTS</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySub}>Direct campaign requests &amp; orders from local vendors will appear here.</Text>
          </View>
        ) : (
          orders.map((item) => (
            <View key={item._id || item.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderVendor}>Brand Client: {item.vendor_name || 'Local Vendor'}</Text>
                  <Text style={styles.orderTitle}>{item.title || 'Reel Shoot Campaign'}</Text>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>₹{(item.amount || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              <View style={styles.orderBadgeRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{(item.type || 'Shoot').toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === 'completed' && styles.statusCompleted]}>
                  <Text style={[styles.statusText, item.status === 'completed' && styles.statusCompletedText]}>
                    {(item.status || 'Active').toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.status !== 'completed' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleUpdateStatus(item._id || item.id, 'completed')}>
                    <Ionicons name="checkmark-circle" size={16} color="#0F172A" />
                    <Text style={styles.completeBtnText}>Mark Completed</Text>
                  </TouchableOpacity>
                </View>
              )}
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

  orderCard: {
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
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderVendor: { color: GOLD, fontSize: 10, fontWeight: '900' },
  orderTitle: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900', marginTop: 2 },
  priceTag: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#059669', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  priceTagText: { color: '#059669', fontSize: FontSize.xs, fontWeight: '900' },

  orderBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBadge: { backgroundColor: BG_MATTE, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: BORDER_COLOR },
  typeText: { color: TEXT_MUTED, fontSize: 9.5, fontWeight: '800' },
  statusBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: GOLD },
  statusCompleted: { backgroundColor: '#ECFDF5', borderColor: '#059669' },
  statusText: { color: GOLD, fontSize: 9.5, fontWeight: '900' },
  statusCompletedText: { color: '#059669' },

  actionRow: { marginTop: 6 },
  completeBtn: {
    flexDirection: 'row',
    height: 42,
    backgroundColor: GOLD,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: { color: '#0F172A', fontSize: FontSize.xs, fontWeight: '900' },
});
