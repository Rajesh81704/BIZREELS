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

const AVAILABILITY_OPTIONS = [
  { status: 'Available', label: '🟢 Available for Shoot', sub: 'Ready to accept brand shoot requests' },
  { status: 'Busy', label: '🟡 Busy with Campaigns', sub: 'Currently working on active brand shoots' },
  { status: 'Unavailable', label: '🔴 Fully Booked / Vacation', sub: 'Not accepting new requests right now' },
];

export default function CreatorAvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Available');

  const fetchAvailability = async () => {
    try {
      const res = await api.get('/creator/availability');
      const data = res.data?.data || res.data || {};
      setSelectedStatus(data.status || 'Available');
    } catch (err) {
      console.warn('Failed to load availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const handleSaveStatus = async (status: string) => {
    setSelectedStatus(status);
    setSaving(true);
    try {
      await api.patch('/creator/availability', { status });
      Alert.alert('Status Updated', `Availability set to "${status}"`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update availability');
    } finally {
      setSaving(false);
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
          <Text style={styles.headerTitle}>AVAILABILITY &amp; SCHEDULE</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>SELECT YOUR CURRENT BOOKING STATUS</Text>

        {AVAILABILITY_OPTIONS.map((opt) => {
          const active = selectedStatus === opt.status;
          return (
            <TouchableOpacity
              key={opt.status}
              style={[styles.statusCard, active && styles.statusCardActive]}
              onPress={() => handleSaveStatus(opt.status)}
              disabled={saving}
              activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>{opt.label}</Text>
                <Text style={styles.statusSub}>{opt.sub}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={GOLD} />}
            </TouchableOpacity>
          );
        })}
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
  sectionTitle: { color: ESPRESSO, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  statusCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusCardActive: { borderColor: GOLD, borderWidth: 2, backgroundColor: '#FFFDF9' },
  statusLabel: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900' },
  statusLabelActive: { color: ESPRESSO },
  statusSub: { color: TEXT_MUTED, fontSize: FontSize.xs, marginTop: 2 },
});

