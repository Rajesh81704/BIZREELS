import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function CreatorPricingScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reel1, setReel1] = useState('');
  const [reel3, setReel3] = useState('');
  const [reel10, setReel10] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dayRate, setDayRate] = useState('');

  const fetchPricing = async () => {
    try {
      const res = await api.get('/creator/pricing');
      const data = res.data?.data || res.data || {};
      setReel1(String(data.reel1 || ''));
      setReel3(String(data.reel3 || ''));
      setReel10(String(data.reel10 || ''));
      setHourlyRate(String(data.hourlyRate || ''));
      setDayRate(String(data.dayRate || ''));
    } catch (err) {
      console.warn('Failed to load pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      await api.patch('/creator/pricing', {
        reel1: Number(reel1) || 0,
        reel3: Number(reel3) || 0,
        reel10: Number(reel10) || 0,
        hourlyRate: Number(hourlyRate) || 0,
        dayRate: Number(dayRate) || 0,
      });
      Alert.alert('Success', 'Creator rate packages saved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update rates');
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
          <Text style={styles.headerTitle}>PRICING &amp; PACKAGES</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag" size={18} color={GOLD} />
            <Text style={styles.cardTitle}>Video Reel Shoot Packages</Text>
          </View>
          <Text style={styles.cardSub}>Set custom prices for vendors to hire you per video deliverable.</Text>

          <Text style={styles.label}>1 Video Reel Rate (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1500"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={reel1}
            onChangeText={setReel1}
          />

          <Text style={styles.label}>3 Video Reels Combo Rate (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 4000"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={reel3}
            onChangeText={setReel3}
          />

          <Text style={styles.label}>10 Video Reels Campaign Combo (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 12000"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={reel10}
            onChangeText={setReel10}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time" size={18} color={GOLD} />
            <Text style={styles.cardTitle}>On-Site Shoot Rates</Text>
          </View>
          <Text style={styles.cardSub}>Set hourly or full-day shoot rates for store visits and event coverage.</Text>

          <Text style={styles.label}>Hourly Shoot Rate (₹/hr)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 800"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={hourlyRate}
            onChangeText={setHourlyRate}
          />

          <Text style={styles.label}>Full Day Shoot Rate (₹/day)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5000"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={dayRate}
            onChangeText={setDayRate}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSavePricing} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={GOLD} /> : <Text style={styles.saveBtnText}>SAVE CREATOR RATES</Text>}
        </TouchableOpacity>
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
  card: {
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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, paddingBottom: 8 },
  cardTitle: { color: ESPRESSO, fontSize: FontSize.xs, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSub: { color: TEXT_MUTED, fontSize: FontSize.xs, marginVertical: 4 },
  label: { color: '#334155', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    color: TEXT_MAIN,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: FontSize.xs,
    fontWeight: '600',
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: ESPRESSO,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1 },
});
