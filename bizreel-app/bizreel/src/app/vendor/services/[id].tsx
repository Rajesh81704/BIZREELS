/**
 * Dedicated Service Listing Detail View Screen — Mobile Application
 * Specialized for Service Providers (Salons, Repairs, Home Services, Healthcare, Consultants, B2B).
 * Supports complete Service Mode, Slots, Radius, Pricing Model, Terms & Analytics.
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

export default function SingleServiceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const serviceId = Array.isArray(id) ? id[0] : id;

  const {
    data: serviceData,
    isLoading: loadingDetails,
    refetch: refetchDetails,
  } = useListingDetails(serviceId);

  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
    refetch: refetchAnalytics,
  } = useListingAnalytics(serviceId);

  const updateServiceMutation = useUpdateVendorListing();
  const duplicateMutation = useDuplicateListing();
  const deleteMutation = useDeleteVendorListing();

  const [refreshing, setRefreshing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const service: any = serviceData || {};
  const liveStats = analyticsData || {};

  const images: string[] =
    Array.isArray(service.images) && service.images.length > 0
      ? service.images
      : service.image
      ? [service.image]
      : [];

  const price = service.price || 0;
  const pricingType = service.pricingType || service.pricingModel || 'Fixed Price';
  const serviceMode = service.serviceMode || service.serviceType || 'At Store / On Location';
  const duration = service.duration || '60 Mins';
  const radius = service.serviceRadius || '15 km';
  const isEmergency = service.isEmergency === true;

  const views = liveStats.views ?? service.views ?? 0;
  const bookings = liveStats.orders ?? service.orders_count ?? 0;
  const revenue = liveStats.revenue ?? service.revenue ?? 0;
  const rating = liveStats.rating ?? service.rating ?? 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDetails(), refetchAnalytics()]);
    setRefreshing(false);
  };

  const handleToggleStatus = async () => {
    const currentStatus = service.status || 'published';
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await updateServiceMutation.mutateAsync({
        id: serviceId!,
        status: nextStatus,
        isActive: nextStatus === 'published',
      });
      Alert.alert('Status Updated', `Service is now ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update service status');
    }
  };

  const handleDuplicate = () => {
    Alert.alert('Duplicate Service', `Create a duplicate of "${service.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            await duplicateMutation.mutateAsync(serviceId!);
            Alert.alert('Success ✨', 'Service duplicated as draft.');
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to duplicate service');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Service Listing ⚠️',
      `Permanently delete service "${service.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(serviceId!);
              Alert.alert('Deleted', 'Service listing removed.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete service.');
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
        <Text style={styles.loadingText}>Loading Dedicated Service Page...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {service.title || 'Service Listing'}
        </Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleDuplicate}>
          <Ionicons name="copy-outline" size={20} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} />
        }>
        {/* Gallery / Image Header */}
        <View style={styles.galleryCard}>
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
                <View key={idx} style={{ width: SCREEN_WIDTH - Spacing.lg * 2, height: 240 }}>
                  <Image
                    source={{ uri: getListingImage(imgUri) || '' }}
                    style={styles.galleryImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="construct-outline" size={54} color="#94A3B8" />
              <Text style={styles.placeholderText}>Service Visual / Work Samples</Text>
            </View>
          )}

          <View style={styles.modeBadge}>
            <Ionicons name="calendar-outline" size={12} color={GOLD} />
            <Text style={styles.modeBadgeText}>PROFESSIONAL SERVICE</Text>
          </View>
        </View>

        {/* Primary Service Summary */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.categoryBadge}>
              {(service.category || 'SERVICES').toUpperCase()}{' '}
              {service.subcategory ? `• ${service.subcategory.toUpperCase()}` : ''}
            </Text>
            <TouchableOpacity onPress={handleToggleStatus} style={styles.statusChip}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      service.status === 'published' || service.isActive !== false
                        ? '#22C55E'
                        : '#F59E0B',
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {service.status?.toUpperCase() || (service.isActive !== false ? 'PUBLISHED' : 'DRAFT')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.serviceTitle}>{service.title}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>₹{price.toLocaleString('en-IN')}</Text>
            <View style={styles.pricingPill}>
              <Text style={styles.pricingPillText}>{pricingType}</Text>
            </View>
          </View>

          {service.description ? (
            <Text style={styles.descriptionText}>{service.description}</Text>
          ) : null}
        </View>

        {/* Dedicated Service Architecture & Coverage Box */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service Delivery Architecture</Text>
          <View style={styles.divider} />

          <View style={styles.specGrid}>
            <View style={styles.specBox}>
              <Ionicons name="location-outline" size={20} color={GOLD} />
              <Text style={styles.specBoxVal}>{serviceMode}</Text>
              <Text style={styles.specBoxLbl}>Service Mode</Text>
            </View>

            <View style={styles.specBox}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
              <Text style={styles.specBoxVal}>{duration}</Text>
              <Text style={styles.specBoxLbl}>Avg Duration</Text>
            </View>

            <View style={styles.specBox}>
              <Ionicons name="map-outline" size={20} color="#10B981" />
              <Text style={styles.specBoxVal}>{radius}</Text>
              <Text style={styles.specBoxLbl}>Service Area</Text>
            </View>

            <View style={styles.specBox}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={isEmergency ? '#EF4444' : '#64748B'}
              />
              <Text style={[styles.specBoxVal, isEmergency && { color: '#EF4444' }]}>
                {isEmergency ? '24x7 Active' : 'Standard'}
              </Text>
              <Text style={styles.specBoxLbl}>Emergency Service</Text>
            </View>
          </View>
        </View>

        {/* Operating Hours & Cancellation Rules */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Availability & Booking Policy</Text>
          <View style={styles.divider} />

          <View style={styles.policyList}>
            <View style={styles.policyRow}>
              <Text style={styles.policyKey}>Operating Schedule:</Text>
              <Text style={styles.policyVal}>
                {service.operatingHours || 'Mon - Sat (9:00 AM - 8:00 PM)'}
              </Text>
            </View>

            <View style={styles.policyRow}>
              <Text style={styles.policyKey}>Advance Slot Booking:</Text>
              <Text style={styles.policyVal}>
                {service.advanceBookingDays ? `Up to ${service.advanceBookingDays} Days ahead` : 'Required'}
              </Text>
            </View>

            {service.cancellationPolicy || service.terms ? (
              <View style={styles.policyRowCol}>
                <Text style={styles.policyKey}>Cancellation & Refund Rules:</Text>
                <Text style={styles.policyDesc}>
                  {service.cancellationPolicy || service.terms}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Booking Performance & Reviews */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Booking & Performance</Text>
            {loadingAnalytics && <ActivityIndicator size="small" color={GOLD} />}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricVal}>{bookings}</Text>
              <Text style={styles.metricLbl}>Total Bookings</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricVal}>₹{revenue.toLocaleString('en-IN')}</Text>
              <Text style={styles.metricLbl}>Revenue Earned</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricVal}>{rating > 0 ? `${rating.toFixed(1)} ⭐` : 'N/A'}</Text>
              <Text style={styles.metricLbl}>Client Rating</Text>
            </View>
          </View>
        </View>

        {/* Control Footer */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.reelBtn}
            onPress={() =>
              router.push({
                pathname: '/reel/create' as any,
                params: { listingId: serviceId },
              } as any)
            }>
            <Ionicons name="videocam" size={18} color="#FFFFFF" />
            <Text style={styles.reelBtnText}>Create Reel for Service</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                router.push({
                  pathname: '/vendor/listings/create' as any,
                  params: { editId: serviceId },
                } as any)
              }>
              <Ionicons name="create-outline" size={18} color={GOLD} />
              <Text style={styles.editBtnText}>Edit Service</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_COLOR,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
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
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  galleryCard: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    height: 180,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  modeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: ESPRESSO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
  },
  modeBadgeText: {
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
  categoryBadge: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: GOLD,
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
  serviceTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  priceValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: '#059669',
  },
  pricingPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  pricingPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#047857',
  },
  descriptionText: {
    fontSize: FontSize.sm,
    color: '#334155',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specBox: {
    width: (SCREEN_WIDTH - Spacing.lg * 4 - Spacing.sm) / 2,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  specBoxVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
    textAlign: 'center',
  },
  specBoxLbl: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  policyList: {
    gap: Spacing.sm,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  policyRowCol: {
    gap: 4,
  },
  policyKey: {
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
  },
  policyVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  policyDesc: {
    fontSize: FontSize.xs,
    color: TEXT_MAIN,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  metricLbl: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  footerContainer: {
    gap: Spacing.md,
  },
  reelBtn: {
    backgroundColor: ESPRESSO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadows.md,
  },
  reelBtnText: {
    color: GOLD,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  footerRow: {
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
