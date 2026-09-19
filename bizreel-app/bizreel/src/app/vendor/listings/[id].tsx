/**
 * Dedicated Single Listing View Screen — Mobile Application
 * Premium Warm Gold & Dark Espresso Editorial Design System.
 * Supports complete details, variants, service coverage, stock manager, real-time analytics & quick actions.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import {
  useDeleteVendorListing,
  useDuplicateListing,
  useListingAnalytics,
  useListingDetails,
  useUpdateListingStock,
  useUpdateVendorListing,
} from '@/features/vendor-listings/queries';
import { getListingImage } from '@/utils/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_COLOR = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function SingleListingDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const listingId = Array.isArray(id) ? id[0] : id;

  const {
    data: listingData,
    isLoading: loadingDetails,
    refetch: refetchDetails,
  } = useListingDetails(listingId);

  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
    refetch: refetchAnalytics,
  } = useListingAnalytics(listingId);

  const updateStockMutation = useUpdateListingStock();
  const duplicateMutation = useDuplicateListing();
  const updateListingMutation = useUpdateVendorListing();
  const deleteMutation = useDeleteVendorListing();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [stockInput, setStockInput] = useState('');
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const listing: any = listingData || {};
  const isService = listing.type === 'service';

  const images: string[] =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : listing.image
      ? [listing.image]
      : [];

  const price = listing.price || 0;
  const sellingPrice = listing.sellingPrice || price;
  const mrp = listing.mrp || price;
  const discountPct =
    mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
  const stock = listing.stock ?? 0;
  const lowStockThreshold = listing.lowStockThreshold ?? 5;
  const isLowStock = !isService && stock <= lowStockThreshold && stock > 0;
  const isOutOfStock = !isService && stock <= 0;

  // Analytics fallback
  const liveStats = analyticsData || {};
  const views = liveStats.views ?? listing.views ?? 0;
  const uniqueVisitors =
    liveStats.uniqueVisitors ?? listing.uniqueVisitors ?? Math.floor(views * 0.75);
  const likes = liveStats.likes ?? listing.likes_count ?? listing.likes ?? 0;
  const saves = liveStats.saves ?? listing.saves_count ?? listing.saves ?? 0;
  const shares = liveStats.shares ?? listing.shares ?? 0;
  const orders = liveStats.orders ?? listing.orders_count ?? 0;
  const revenue = liveStats.revenue ?? listing.revenue ?? 0;
  const rating = liveStats.rating ?? listing.rating ?? 0;
  const conversionRate =
    liveStats.conversionRate ?? (views > 0 ? ((orders / views) * 100).toFixed(1) : '0.0');
  const ctr = liveStats.ctr ?? (views > 0 ? ((likes / views) * 100).toFixed(1) : '0.0');

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDetails(), refetchAnalytics()]);
    setRefreshing(false);
  };

  const handleStockUpdateSubmit = async (newStockVal?: number) => {
    const val = newStockVal !== undefined ? newStockVal : Number(stockInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid stock count');
      return;
    }
    try {
      await updateStockMutation.mutateAsync({ id: listingId!, stock: val });
      Alert.alert('Success ✨', `Stock level updated to ${val} units.`);
      setIsEditingStock(false);
      setStockInput('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update stock.');
    }
  };

  const handleDuplicate = () => {
    Alert.alert('Duplicate Listing', `Create a duplicate copy of "${listing.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            await duplicateMutation.mutateAsync(listingId!);
            Alert.alert('Success ✨', 'Listing duplicated as draft.');
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to duplicate listing');
          }
        },
      },
    ]);
  };

  const handleToggleStatus = async () => {
    const currentStatus = listing.status || 'published';
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await updateListingMutation.mutateAsync({
        id: listingId!,
        status: nextStatus,
        isActive: nextStatus === 'published',
      });
      Alert.alert('Success', `Listing set to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update listing status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing ⚠️',
      `Are you sure you want to permanently delete "${listing.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(listingId!);
              Alert.alert('Deleted', 'Listing has been removed.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete listing.');
            }
          },
        },
      ]
    );
  };

  if (loadingDetails && !refreshing) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Fetching Listing Details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {listing.title || 'Listing Details'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() =>
              router.push({
                pathname: '/vendor/listings/create' as any,
                params: { editId: listingId },
              } as any)
            }>
            <Ionicons name="create-outline" size={20} color={GOLD} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleDuplicate}>
            <Ionicons name="copy-outline" size={20} color="#60A5FA" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} />
        }>
        {/* Media Gallery / Banner */}
        <View style={styles.galleryContainer}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / SCREEN_WIDTH);
                setActiveImageIndex(index);
              }}
              scrollEventThrottle={16}>
              {images.map((imgUri, idx) => (
                <View key={idx} style={{ width: SCREEN_WIDTH - Spacing.lg * 2, height: 260 }}>
                  <Image
                    source={{ uri: getListingImage(imgUri) || '' }}
                    style={styles.galleryImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.placeholderGallery}>
              <Ionicons name="cube-outline" size={54} color="#94A3B8" />
              <Text style={styles.placeholderText}>No Media Uploaded</Text>
            </View>
          )}

          {/* Dots Indicator */}
          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === activeImageIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}

          {/* Type Badge */}
          <View style={styles.typeBadgeContainer}>
            <Text style={styles.typeBadgeText}>
              {isService ? '🛠 SERVICE LISTING' : '📦 PHYSICAL PRODUCT'}
            </Text>
          </View>
        </View>

        {/* Primary Meta Section */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.categoryBadge}>
              {(listing.category || 'GENERAL').toUpperCase()}{' '}
              {listing.subcategory ? `• ${listing.subcategory.toUpperCase()}` : ''}
            </Text>
            <TouchableOpacity onPress={handleToggleStatus} style={styles.statusChip}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      listing.status === 'published' || listing.isActive !== false
                        ? '#22C55E'
                        : '#F59E0B',
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {listing.status?.toUpperCase() || (listing.isActive !== false ? 'PUBLISHED' : 'DRAFT')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.listingTitle}>{listing.title}</Text>
          {listing.brand ? <Text style={styles.brandText}>Brand: {listing.brand}</Text> : null}

          {/* Price & Discounts */}
          <View style={styles.priceContainer}>
            <Text style={styles.sellingPriceText}>₹{sellingPrice.toLocaleString('en-IN')}</Text>
            {mrp > sellingPrice ? (
              <Text style={styles.mrpText}>₹{mrp.toLocaleString('en-IN')}</Text>
            ) : null}
            {discountPct > 0 ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPct}% OFF</Text>
              </View>
            ) : null}
          </View>

          {listing.description ? (
            <Text style={styles.descriptionText}>{listing.description}</Text>
          ) : null}
        </View>

        {/* Quick Stock Manager (Products Only) */}
        {!isService && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowAlign}>
                <Ionicons name="layers-outline" size={20} color={GOLD} />
                <Text style={styles.sectionHeaderTitle}>Inventory & Stock Level</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditingStock(!isEditingStock)}>
                <Text style={styles.editStockLink}>
                  {isEditingStock ? 'Cancel' : 'Quick Adjust'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stockSummaryRow}>
              <View style={styles.stockCountBox}>
                <Text
                  style={[
                    styles.stockCountVal,
                    isOutOfStock && { color: '#EF4444' },
                    isLowStock && { color: '#F59E0B' },
                  ]}>
                  {stock}
                </Text>
                <Text style={styles.stockCountSub}>Available Units</Text>
              </View>
              <View style={styles.stockStatusBox}>
                {isOutOfStock ? (
                  <View style={[styles.stockAlertBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={[styles.stockAlertText, { color: '#B91C1C' }]}>OUT OF STOCK</Text>
                  </View>
                ) : isLowStock ? (
                  <View style={[styles.stockAlertBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning" size={14} color="#D97706" />
                    <Text style={[styles.stockAlertText, { color: '#B45309' }]}>LOW STOCK ALERT</Text>
                  </View>
                ) : (
                  <View style={[styles.stockAlertBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                    <Text style={[styles.stockAlertText, { color: '#15803D' }]}>IN STOCK</Text>
                  </View>
                )}
                <Text style={styles.stockThresholdText}>
                  Low Stock Threshold: {lowStockThreshold} units
                </Text>
              </View>
            </View>

            {isEditingStock && (
              <View style={styles.stockEditorBox}>
                <Text style={styles.inputLabel}>Set Exact Stock Quantity:</Text>
                <View style={styles.stockInputRow}>
                  <TextInput
                    style={styles.stockInput}
                    keyboardType="number-pad"
                    value={stockInput}
                    onChangeText={setStockInput}
                    placeholder={`Current: ${stock}`}
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity
                    style={styles.saveStockBtn}
                    onPress={() => handleStockUpdateSubmit()}
                    disabled={updateStockMutation.isPending}>
                    {updateStockMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveStockBtnText}>Update</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Or Quick Add / Deduct:</Text>
                <View style={styles.quickButtonsRow}>
                  {[-5, -1, 1, 5, 10].map((delta) => (
                    <TouchableOpacity
                      key={delta}
                      style={styles.quickAdjustBtn}
                      onPress={() => handleStockUpdateSubmit(Math.max(0, stock + delta))}>
                      <Text style={styles.quickAdjustBtnText}>
                        {delta > 0 ? `+${delta}` : delta}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Real-time Performance & Analytics */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowAlign}>
              <Ionicons name="stats-chart-outline" size={20} color={GOLD} />
              <Text style={styles.sectionHeaderTitle}>Performance & Analytics</Text>
            </View>
            {loadingAnalytics && <ActivityIndicator size="small" color={GOLD} />}
          </View>

          <View style={styles.analyticsGrid}>
            <View style={styles.statTile}>
              <Ionicons name="eye-outline" size={18} color="#3B82F6" />
              <Text style={styles.statVal}>{views}</Text>
              <Text style={styles.statLbl}>Total Views</Text>
            </View>

            <View style={styles.statTile}>
              <Ionicons name="people-outline" size={18} color="#06B6D4" />
              <Text style={styles.statVal}>{uniqueVisitors}</Text>
              <Text style={styles.statLbl}>Unique Visitors</Text>
            </View>

            <View style={styles.statTile}>
              <Ionicons name="heart-outline" size={18} color="#EC4899" />
              <Text style={styles.statVal}>{likes}</Text>
              <Text style={styles.statLbl}>Likes</Text>
            </View>

            <View style={styles.statTile}>
              <Ionicons name="bookmark-outline" size={18} color="#F59E0B" />
              <Text style={styles.statVal}>{saves}</Text>
              <Text style={styles.statLbl}>Saves</Text>
            </View>

            <View style={styles.statTile}>
              <Ionicons name="share-social-outline" size={18} color="#10B981" />
              <Text style={styles.statVal}>{shares}</Text>
              <Text style={styles.statLbl}>Shares</Text>
            </View>

            <View style={styles.statTile}>
              <Ionicons
                name={isService ? 'calendar-outline' : 'cart-outline'}
                size={18}
                color="#8B5CF6"
              />
              <Text style={styles.statVal}>{orders}</Text>
              <Text style={styles.statLbl}>{isService ? 'Bookings' : 'Orders'}</Text>
            </View>

            <View style={styles.statTileFull}>
              <View style={styles.rowBetween}>
                <Text style={styles.fullStatLbl}>Total Generated Revenue</Text>
                <Text style={styles.fullStatVal}>₹{revenue.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.statTileHalf}>
              <Text style={styles.statVal}>{conversionRate}%</Text>
              <Text style={styles.statLbl}>Conversion Rate</Text>
            </View>

            <View style={styles.statTileHalf}>
              <Text style={styles.statVal}>{ctr}%</Text>
              <Text style={styles.statLbl}>Click-Through Rate (CTR)</Text>
            </View>
          </View>
        </View>

        {/* Detailed Technical Specifications (Products vs Services) */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>Specifications & Parameters</Text>
          <View style={styles.divider} />

          {isService ? (
            <View style={styles.specsList}>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Service Mode:</Text>
                <Text style={styles.specVal}>
                  {listing.serviceMode || listing.serviceType || 'At Store / On Location'}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Duration:</Text>
                <Text style={styles.specVal}>{listing.duration || '60 Mins'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Service Area Radius:</Text>
                <Text style={styles.specVal}>{listing.serviceRadius || '15 km'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Emergency 24x7 Support:</Text>
                <Text style={styles.specVal}>{listing.isEmergency ? 'Yes' : 'No'}</Text>
              </View>
              {listing.terms ? (
                <View style={styles.specRowColumn}>
                  <Text style={styles.specKey}>Terms & Cancellation Policy:</Text>
                  <Text style={styles.specValDesc}>{listing.terms}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.specsList}>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>SKU Code:</Text>
                <Text style={styles.specVal}>{listing.sku || 'N/A'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Dimensions (L x W x H):</Text>
                <Text style={styles.specVal}>
                  {listing.dimensions
                    ? `${listing.dimensions.length || 0} x ${
                        listing.dimensions.width || 0
                      } x ${listing.dimensions.height || 0} cm`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Weight:</Text>
                <Text style={styles.specVal}>
                  {listing.weight ? `${listing.weight} kg` : 'N/A'}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Est. Delivery Time:</Text>
                <Text style={styles.specVal}>
                  {listing.estimatedDeliveryDays
                    ? `${listing.estimatedDeliveryDays} Days`
                    : '3-5 Business Days'}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Delivery Type:</Text>
                <Text style={styles.specVal}>
                  {listing.deliveryType || 'Standard Shipping'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Variants (If Any) */}
        {Array.isArray(listing.variants) && listing.variants.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionHeaderTitle}>Item Variants ({listing.variants.length})</Text>
            <View style={styles.divider} />

            {listing.variants.map((varItem: any, idx: number) => (
              <View key={idx} style={styles.variantRow}>
                <View>
                  <Text style={styles.variantTitle}>{varItem.title || `Variant #${idx + 1}`}</Text>
                  <Text style={styles.variantSub}>
                    SKU: {varItem.sku || 'N/A'} • Stock: {varItem.stock ?? 0}
                  </Text>
                </View>
                <Text style={styles.variantPrice}>₹{varItem.price || sellingPrice}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Action Footer Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.reelCreateBtn}
            onPress={() =>
              router.push({
                pathname: '/reel/create' as any,
                params: { listingId: listingId },
              } as any)
            }>
            <Ionicons name="videocam" size={18} color="#FFFFFF" />
            <Text style={styles.reelCreateBtnText}>Create Reel for Item</Text>
          </TouchableOpacity>

          <View style={styles.rowBetweenGap}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                router.push({
                  pathname: '/vendor/listings/create' as any,
                  params: { editId: listingId },
                } as any)
              }>
              <Ionicons name="create-outline" size={18} color={GOLD} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: TEXT_MUTED,
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
    flex: 1,
    textAlign: 'center',
    color: GOLD,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginHorizontal: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.lg,
  },
  galleryContainer: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.lg,
  },
  placeholderGallery: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
    fontWeight: FontWeight.medium,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    bottom: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 18,
    backgroundColor: GOLD,
  },
  typeBadgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: ESPRESSO,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
  },
  typeBadgeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: GOLD,
    letterSpacing: 0.5,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  listingTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  brandText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: TEXT_MUTED,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  sellingPriceText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: '#059669',
  },
  mrpText: {
    fontSize: FontSize.sm,
    color: TEXT_MUTED,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  discountText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#15803D',
  },
  descriptionText: {
    fontSize: FontSize.sm,
    color: '#334155',
    lineHeight: 20,
  },
  sectionHeaderTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  editStockLink: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: GOLD,
  },
  stockSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  stockCountBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 90,
  },
  stockCountVal: {
    fontSize: 24,
    fontWeight: FontWeight.black,
    color: TEXT_MAIN,
  },
  stockCountSub: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: FontWeight.medium,
  },
  stockStatusBox: {
    flex: 1,
    gap: 6,
  },
  stockAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  stockAlertText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  stockThresholdText: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  stockEditorBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: TEXT_MAIN,
  },
  stockInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stockInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  saveStockBtn: {
    backgroundColor: ESPRESSO,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveStockBtnText: {
    color: GOLD,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickAdjustBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  quickAdjustBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statTile: {
    width: (SCREEN_WIDTH - Spacing.lg * 4 - Spacing.sm * 2) / 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  statLbl: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  statTileFull: {
    width: '100%',
    backgroundColor: ESPRESSO,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  fullStatLbl: {
    color: '#94A3B8',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  fullStatVal: {
    color: GOLD,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  statTileHalf: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
  },
  specsList: {
    gap: Spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specRowColumn: {
    gap: 4,
  },
  specKey: {
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
    fontWeight: FontWeight.medium,
  },
  specVal: {
    fontSize: FontSize.xs,
    color: TEXT_MAIN,
    fontWeight: FontWeight.bold,
  },
  specValDesc: {
    fontSize: FontSize.xs,
    color: TEXT_MAIN,
    lineHeight: 18,
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  variantTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  variantSub: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  variantPrice: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#059669',
  },
  actionButtonsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  reelCreateBtn: {
    backgroundColor: ESPRESSO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadows.md,
  },
  reelCreateBtnText: {
    color: GOLD,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  rowBetweenGap: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  editBtnText: {
    color: GOLD,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FEE2E2',
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  deleteBtnText: {
    color: '#B91C1C',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
});
