import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

interface PortfolioReel {
  id: string;
  title: string;
  url: string;
  views: string;
}

interface PortfolioImage {
  id: string;
  title: string;
  url: string;
}

export default function CreatorPortfolioScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reels' | 'images'>('reels');
  const [reels, setReels] = useState<PortfolioReel[]>([]);
  const [images, setImages] = useState<PortfolioImage[]>([]);

  // Add Item Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/creator/portfolio');
      const data = res.data?.data || res.data || {};
      setReels(data.reels || []);
      setImages(data.images || []);
    } catch (err) {
      console.warn('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleAddItem = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      Alert.alert('Required', 'Please fill in both title and media URL');
      return;
    }
    setSubmitting(true);
    try {
      if (activeTab === 'reels') {
        await api.post('/creator/portfolio/reels', { title: newTitle.trim(), videoUrl: newUrl.trim() });
      } else {
        await api.post('/creator/portfolio/images', { title: newTitle.trim(), url: newUrl.trim() });
      }
      Alert.alert('Success', 'Portfolio item added successfully!');
      setModalVisible(false);
      setNewTitle('');
      setNewUrl('');
      fetchPortfolio();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add portfolio item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to remove this item from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/creator/portfolio/${activeTab}/${id}`);
            Alert.alert('Deleted', 'Portfolio item removed');
            fetchPortfolio();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
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
          <Text style={styles.headerTitle}>CREATOR PORTFOLIO</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color={ESPRESSO} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabHeaderRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'reels' && styles.tabBtnActive]}
          onPress={() => setActiveTab('reels')}>
          <Text style={[styles.tabBtnText, activeTab === 'reels' && styles.tabBtnTextActive]}>
            Video Reels ({reels.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'images' && styles.tabBtnActive]}
          onPress={() => setActiveTab('images')}>
          <Text style={[styles.tabBtnText, activeTab === 'images' && styles.tabBtnTextActive]}>
            Photos Gallery ({images.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {(activeTab === 'reels' ? reels : images).length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="film-outline" size={36} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>No Portfolio Items Added</Text>
            <Text style={styles.emptySub}>Add sample video reels or photos to showcase your work to brands.</Text>
          </View>
        ) : (
          (activeTab === 'reels' ? reels : images).map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemIconBox}>
                <Ionicons name={activeTab === 'reels' ? "videocam" : "image"} size={20} color={ESPRESSO} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemUrl} numberOfLines={1}>
                  {(item as any).url}
                </Text>
                {(item as any).views ? <Text style={styles.itemViews}>{(item as any).views} views</Text> : null}
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {activeTab === 'reels' ? 'Sample Video Reel' : 'Photo Gallery Item'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={TEXT_MAIN} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Title / Caption *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Brand Promo Shoot"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.modalLabel}>
              {activeTab === 'reels' ? 'Video Reel MP4 / Drive Link *' : 'Image URL Link *'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://..."
              placeholderTextColor="#94A3B8"
              value={newUrl}
              onChangeText={setNewUrl}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddItem} disabled={submitting}>
              {submitting ? <ActivityIndicator color={GOLD} /> : <Text style={styles.modalSubmitText}>Save to Portfolio</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addBtn: { width: 38, height: 38, backgroundColor: GOLD, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  tabHeaderRow: { flexDirection: 'row', backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: GOLD },
  tabBtnText: { color: TEXT_MUTED, fontSize: FontSize.xs, fontWeight: '700' },
  tabBtnTextActive: { color: ESPRESSO, fontWeight: '900' },

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

  itemCard: {
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
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  itemUrl: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },
  itemViews: { color: GOLD, fontSize: 10, fontWeight: '800', marginTop: 2 },
  deleteBtn: { padding: 8 },

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

