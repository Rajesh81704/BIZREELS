/**
 * Vendor Dedicated Service Catalog Dashboard — Mobile Application
 * Complete Service Listings Management with Light Theme & Warm Gold Editorial Bento Grid.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, FontWeight, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import {
  useDeleteVendorListing,
  useDuplicateListing,
  useUpdateVendorListing,
  useVendorListings,
} from '@/features/vendor-listings/queries';
import { getListingImage } from '@/utils/image';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_COLOR = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function VendorServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = (user as any)?._id || (user as any)?.id;

  const { data: listings = [], isLoading, isRefetching, refetch } = useVendorListings();
  const updateServiceMutation = useUpdateVendorListing();
  const duplicateMutation = useDuplicateListing();
  const deleteMutation = useDeleteVendorListing();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<'ALL' | 'home' | 'store' | 'remote'>('ALL');

  // Filter only service listings for current vendor
  const serviceListings = listings.filter((item: any) => {
    if (item.type !== 'service') return false;
    if (!currentUserId) return true;
    const itemVendorId = item.vendor?._id || item.vendor?.id || item.vendor;
    if (!itemVendorId) return true;
    return itemVendorId.toString() === currentUserId.toString();
  });

  // Apply search & mode filter
  const filteredServices = serviceListings.filter((service: any) => {
    // Mode filter
    const mode = (service.serviceMode || service.serviceType || '').toLowerCase();
    if (selectedModeFilter === 'home' && !mode.includes('home') && !mode.includes('doorstep')) return false;
    if (selectedModeFilter === 'store' && !mode.includes('store') && !mode.includes('location')) return false;
    if (selectedModeFilter === 'remote' && !mode.includes('online') && !mode.includes('remote') && !mode.includes('virtual')) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (service.title || '').toLowerCase().includes(q);
      const catMatch = (service.category || '').toLowerCase().includes(q);
      if (!titleMatch && !catMatch) return false;
    }

    return true;
  });

  // Calculate stats
  const totalBookings = serviceListings.reduce((sum, item: any) => sum + (item.orders_count || item.bookings || 0), 0);
  const totalRevenue = serviceListings.reduce((sum, item: any) => sum + (item.revenue || 0), 0);
  const activeCount = serviceListings.filter((item: any) => item.status === 'published' || item.isActive !== false).length;

  const handleToggleStatus = async (item: any) => {
    const currentStatus = item.status || 'published';
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await updateServiceMutation.mutateAsync({
        id: item._id || item.id,
        status: nextStatus,
        isActive: nextStatus === 'published',
      });
      Alert.alert('Status Updated', `Service set to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDuplicate = (item: any) => {
    Alert.alert('Duplicate Service', `Create a copy of "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            await duplicateMutation.mutateAsync(item._id || item.id);
            Alert.alert('Success ✨', 'Service duplicated as draft.');
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to duplicate service');
          }
        },
      },
    ]);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Service ⚠️', `Permanently remove service "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id);
            Alert.alert('Deleted', 'Service removed successfully.');
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to delete service.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dedicated Service Catalog</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            router.push({
              pathname: '/vendor/listings/create' as any,
              params: { type: 'service' },
            } as any)
          }>
          <Ionicons name="add" size={20} color={ESPRESSO} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={(item: any) => item._id || item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={GOLD} />}
        ListHeaderComponent={
          <View style={styles.headerComponentContainer}>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiVal}>{serviceListings.length}</Text>
                <Text style={styles.kpiLbl}>Total Services</Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiVal}>{activeCount}</Text>
                <Text style={styles.kpiLbl}>Active</Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiVal}>{totalBookings}</Text>
                <Text style={styles.kpiLbl}>Bookings</Text>
              </View>
              <View style={styles.kpiTileFull}>
                <Text style={styles.kpiFullLbl}>Revenue Earned</Text>
                <Text style={styles.kpiFullVal}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={TEXT_MUTED} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search services, categories..."
                placeholderTextColor={TEXT_MUTED}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Service Mode Filter Horizontal Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {[
                { key: 'ALL', label: 'All Services' },
                { key: 'home', label: '🏠 At Home' },
                { key: 'store', label: '🏬 At Store' },
                { key: 'remote', label: '💻 Remote / Virtual' },
              ].map((filter) => {
                const isSel = selectedModeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterChip, isSel && styles.filterChipActive]}
                    onPress={() => setSelectedModeFilter(filter.key as any)}>
                    <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }: { item: any }) => {
          const image = getListingImage(item);
          const price = item.sellingPrice || item.price || 0;
          const duration = item.duration || '60 Mins';
          const radius = item.serviceRadius || '15 km';
          const mode = item.serviceMode || item.serviceType || 'At Store / On Location';
          const isEmergency = item.isEmergency === true;
          const isPublished = item.status === 'published' || item.isActive !== false;

          return (
            <TouchableOpacity
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/vendor/services/${item._id || item.id}` as any)}>
              {/* Media Preview & Mode Tag */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardImageContainer}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <View style={styles.cardImageFallback}>
                      <Ionicons name="construct-outline" size={24} color={TEXT_MUTED} />
                    </View>
                  )}
                </View>

                <View style={styles.cardHeaderMeta}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.categoryBadge}>
                      {(item.category || 'SERVICES').toUpperCase()}{' '}
                      {item.subcategory ? `• ${item.subcategory.toUpperCase()}` : ''}
                    </Text>

                    <TouchableOpacity onPress={() => handleToggleStatus(item)} style={styles.statusPill}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isPublished ? '#22C55E' : '#F59E0B' },
                        ]}
                      />
                      <Text style={styles.statusPillText}>
                        {isPublished ? 'ACTIVE' : 'DRAFT'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.serviceTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>₹{price.toLocaleString('en-IN')}</Text>
                    <View style={styles.pricingPill}>
                      <Text style={styles.pricingPillText}>
                        {item.pricingType || item.pricingModel || 'Fixed Rate'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Specs Grid */}
              <View style={styles.specsRow}>
                <View style={styles.specChip}>
                  <Ionicons name="location-outline" size={13} color={GOLD} />
                  <Text style={styles.specChipText} numberOfLines={1}>
                    {mode}
                  </Text>
                </View>

                <View style={styles.specChip}>
                  <Ionicons name="time-outline" size={13} color="#3B82F6" />
                  <Text style={styles.specChipText}>{duration}</Text>
                </View>

                <View style={styles.specChip}>
                  <Ionicons name="map-outline" size={13} color="#10B981" />
                  <Text style={styles.specChipText}>{radius}</Text>
                </View>

                {isEmergency && (
                  <View style={[styles.specChip, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle" size={13} color="#EF4444" />
                    <Text style={[styles.specChipText, { color: '#B91C1C', fontWeight: 'bold' }]}>
                      24x7
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.rowAlign}>
                  <Ionicons name="calendar-outline" size={14} color={TEXT_MUTED} />
                  <Text style={styles.bookingCountText}>
                    {item.orders_count || item.bookings || 0} Bookings
                  </Text>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/vendor/listings/create' as any,
                        params: { editId: item._id || item.id },
                      } as any)
                    }>
                    <Ionicons name="create-outline" size={16} color={GOLD} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDuplicate(item)}>
                    <Ionicons name="copy-outline" size={16} color="#60A5FA" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDelete(item._id || item.id, item.title)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={54} color={TEXT_MUTED} />
              <Text style={styles.emptyTitle}>No Services Added Yet</Text>
              <Text style={styles.emptySub}>
                Add your professional service offerings to start taking direct appointments!
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() =>
                  router.push({
                    pathname: '/vendor/listings/create' as any,
                    params: { type: 'service' },
                  } as any)
                }>
                <Text style={styles.emptyCreateBtnText}>+ CREATE SERVICE</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ESPRESSO,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: GOLD,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  headerComponentContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiTile: {
    flex: 1,
    minWidth: 80,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  kpiVal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  kpiLbl: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  kpiTileFull: {
    width: '100%',
    backgroundColor: ESPRESSO,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiFullLbl: {
    color: '#94A3B8',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  kpiFullVal: {
    color: GOLD,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.xs,
    color: TEXT_MAIN,
  },
  filterScroll: {
    gap: Spacing.xs,
  },
  filterChip: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  filterChipActive: {
    backgroundColor: ESPRESSO,
    borderColor: ESPRESSO,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: TEXT_MUTED,
  },
  filterChipTextActive: {
    color: GOLD,
    fontWeight: FontWeight.bold,
  },
  serviceCard: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cardImageContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: GOLD,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  serviceTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priceText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.black,
    color: '#059669',
  },
  pricingPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  pricingPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#047857',
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    backgroundColor: '#F8FAFC',
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  specChipText: {
    fontSize: 10,
    color: TEXT_MAIN,
    fontWeight: FontWeight.medium,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  bookingCountText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: FontWeight.medium,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyCreateBtn: {
    marginTop: Spacing.sm,
    backgroundColor: ESPRESSO,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  emptyCreateBtnText: {
    color: GOLD,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
