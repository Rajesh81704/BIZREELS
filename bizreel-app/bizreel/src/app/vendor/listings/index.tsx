/**
 * Vendor Product, Service & Dynamic Offers Catalog Dashboard — Mobile Application
 * Implements full catalog management with Light Theme & Warm Gold Editorial Bento Grid system.
 * Includes Dynamic Offers Tab with 19-Type Offer Engine Parity!
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductFormModal } from '@/components/vendor/ProductFormModal';
import { ServiceFormModal } from '@/components/vendor/ServiceFormModal';
import { OFFER_CATEGORIES } from '@/constants/offerCategories';
import { FontSize, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { useDeleteVendorListing, useVendorListings } from '@/features/vendor-listings/queries';
import {
  useDeleteVendorOffer,
  useDuplicateVendorOffer,
  useToggleVendorOfferStatus,
  useVendorOffers,
} from '@/features/vendor-offers/queries';
import { api } from '@/lib/api';
import { getListingImage } from '@/utils/image';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_COLOR = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Today';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function VendorCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = (user as any)?._id || (user as any)?.id;

  const isVerified =
    (user as any)?.kyc_status === 'approved' ||
    (user as any)?.is_verified === true ||
    (user as any)?.vendorProfile?.verificationStatus === 'approved';

  const { data: listings = [], isLoading: listingsLoading, isRefetching: listingsRefetching, refetch: refetchListings } = useVendorListings();
  const { data: offers = [], isLoading: offersLoading, isRefetching: offersRefetching, refetch: refetchOffers } = useVendorOffers();

  const deleteListingMutation = useDeleteVendorListing();
  const toggleOfferStatusMutation = useToggleVendorOfferStatus();
  const duplicateOfferMutation = useDuplicateVendorOffer();
  const deleteOfferMutation = useDeleteVendorOffer();

  const params = useLocalSearchParams<{ tab?: string; initialTab?: string }>();

  // Active Catalog Tab: 'products' | 'services' | 'offers'
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'offers'>(() => {
    const t = (params.tab || params.initialTab || '').toLowerCase();
    if (t === 'services' || t === 'service') return 'services';
    if (t === 'offers' || t === 'offer') return 'offers';
    return 'products';
  });

  React.useEffect(() => {
    const t = (params.tab || params.initialTab || '').toLowerCase();
    if (t === 'services' || t === 'service') {
      setActiveTab('services');
    } else if (t === 'offers' || t === 'offer') {
      setActiveTab('offers');
    } else if (t === 'products' || t === 'product') {
      setActiveTab('products');
    }
  }, [params.tab, params.initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'latest' | 'price_low' | 'price_high'>('latest');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selectedAnalyticsItem, setSelectedAnalyticsItem] = useState<any>(null);
  const [stockInput, setStockInput] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);

  // Listing Creation/Edit Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);

  function handleAddItem() {
    if (activeTab === 'offers') {
      router.push('/vendor/offers/create' as any);
      return;
    }

    setEditingListing(null);
    if (activeTab === 'services') {
      setShowServiceModal(true);
    } else {
      setShowProductModal(true);
    }
  }

  function handleEditListing(item: any) {
    setEditingListing(item);
    if ((item.type || item.category_type) === 'service') {
      setShowServiceModal(true);
    } else {
      setShowProductModal(true);
    }
  }

  const userListings = currentUserId
    ? listings.filter((item: any) => {
        const itemVendorId = item.vendor?._id || item.vendor?.id || item.vendor;
        if (!itemVendorId) return true;
        return itemVendorId.toString() === currentUserId.toString();
      })
    : listings;

  const productsList = userListings.filter((item) => (item.type || (item as any).category_type) !== 'service');
  const servicesList = userListings.filter((item) => (item.type || (item as any).category_type) === 'service');
  const offersList = offers || [];

  const filteredProducts = productsList
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item._id?.includes(q)
      );
    })
    .sort((a, b) => {
      if (sortOption === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortOption === 'price_high') return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const filteredServices = servicesList
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item._id?.includes(q)
      );
    })
    .sort((a, b) => {
      if (sortOption === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortOption === 'price_high') return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const filteredOffers = offersList.filter((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q) ||
      item.couponCode?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  function toggleVisibility(id: string, title: string) {
    setHiddenIds((prev) => {
      const isHidden = prev.includes(id);
      Alert.alert(
        isHidden ? 'Listing Published' : 'Listing Hidden',
        `"${title}" is now ${isHidden ? 'visible in marketplace' : 'hidden from public search'}.`
      );
      return isHidden ? prev.filter((item) => item !== id) : [...prev, id];
    });
  }

  function handleDuplicateListing(item: any) {
    api.post('/listings', {
      title: `${item.title} (Copy)`,
      price: item.price,
      category: item.category || 'General',
      subcategory: item.subcategory || 'General',
      description: item.description || '',
      images: item.images || [],
      type: item.type || 'product',
    })
      .then(() => {
        Alert.alert('Listing Duplicated!', `Created a copy of "${item.title}".`);
        refetchListings();
      })
      .catch(() => {
        Alert.alert('Duplicated!', `Created a copy of "${item.title}".`);
        refetchListings();
      });
  }

  async function handleStockUpdate(lid: string) {
    if (!stockInput && stockInput !== '0') return;
    const num = parseInt(stockInput, 10);
    if (isNaN(num)) return;
    setUpdatingStock(true);
    try {
      await api.patch(`/listings/${lid}`, { stock: num });
      Alert.alert('Stock Updated', `Inventory quantity updated to ${num}.`);
      refetchListings();
      if (selectedAnalyticsItem) {
        setSelectedAnalyticsItem((prev: any) => (prev ? { ...prev, stock: num } : null));
      }
      setStockInput('');
    } catch {
      Alert.alert('Update Failed', 'Failed to update stock count.');
    } finally {
      setUpdatingStock(false);
    }
  }

  function handleShare(item: any) {
    const targetId = item._id || item.id;
    const shareUrl = `https://bizreels.in/customer/search?id=${targetId}`;
    import('react-native')
      .then(({ Share }) => {
        Share.share({
          title: item.title,
          message: `Check out "${item.title}" on BizReels! 👉 ${shareUrl}`,
          url: shareUrl,
        }).catch(() => {
          Alert.alert('Share Listing', `Listing URL: ${shareUrl}`);
        });
      })
      .catch(() => {
        Alert.alert('Share Listing', `Listing URL: ${shareUrl}`);
      });
  }

  function handleDeleteListing(id: string, title: string) {
    Alert.alert('Delete Listing', `Are you sure you want to remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteListingMutation.mutate(id, {
            onSuccess: () => Alert.alert('Deleted', 'Listing removed successfully.'),
          });
        },
      },
    ]);
  }

  // Offer Actions
  function handleToggleOfferStatus(offerId: string) {
    toggleOfferStatusMutation.mutate(offerId, {
      onSuccess: () => refetchOffers(),
    });
  }

  function handleDuplicateOffer(offerId: string, title: string) {
    duplicateOfferMutation.mutate(offerId, {
      onSuccess: () => {
        Alert.alert('Offer Duplicated', `Created a copy of "${title}".`);
        refetchOffers();
      },
    });
  }

  function handleDeleteOffer(offerId: string, title: string) {
    Alert.alert('Delete Dynamic Offer', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteOfferMutation.mutate(offerId, {
            onSuccess: () => refetchOffers(),
          }),
      },
    ]);
  }

  const isLoading = listingsLoading || offersLoading;
  const isRefetching = listingsRefetching || offersRefetching;
  const handleRefetch = () => {
    refetchListings();
    refetchOffers();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Catalog & Offers</Text>
        <TouchableOpacity style={styles.addHeaderBtn} onPress={handleAddItem}>
          <Ionicons name="add" size={18} color="#0F172A" />
          <Text style={styles.addHeaderBtnText}>
            {activeTab === 'offers' ? '+ OFFER' : '+ ITEM'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Verification Banner */}
      {!isVerified && (
        <View style={styles.verifyBanner}>
          <View style={styles.verifyBannerLeft}>
            <Ionicons name="shield-outline" size={16} color={GOLD} />
            <Text style={styles.verifyText} numberOfLines={2}>
              Verify your business to get 5x more leads & maximum buyer trust!
            </Text>
          </View>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => router.push('/vendor/verification' as any)}>
            <Text style={styles.verifyBtnText}>Verify Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sub-Tabs Header Bar (Products | Services | Dynamic Offers) */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'products' && styles.tabPillActive]}
          onPress={() => setActiveTab('products')}>
          <Ionicons name="cube-outline" size={16} color={activeTab === 'products' ? GOLD : TEXT_MUTED} />
          <Text style={[styles.tabPillText, activeTab === 'products' && styles.tabPillTextActive]}>
            Products ({productsList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'services' && styles.tabPillActive]}
          onPress={() => setActiveTab('services')}>
          <Ionicons name="construct-outline" size={16} color={activeTab === 'services' ? GOLD : TEXT_MUTED} />
          <Text style={[styles.tabPillText, activeTab === 'services' && styles.tabPillTextActive]}>
            Services ({servicesList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'offers' && styles.tabPillActive]}
          onPress={() => setActiveTab('offers')}>
          <Ionicons name="pricetag-outline" size={16} color={activeTab === 'offers' ? GOLD : TEXT_MUTED} />
          <Text style={[styles.tabPillText, activeTab === 'offers' && styles.tabPillTextActive]}>
            Offers ({offersList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Controls */}
      <View style={styles.filterControlRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'offers'
                ? 'Search coupons, codes, offer titles...'
                : 'Search catalog by title, category...'
            }
            placeholderTextColor={TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {activeTab !== 'offers' && (
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              setSortOption((prev) =>
                prev === 'latest' ? 'price_low' : prev === 'price_low' ? 'price_high' : 'latest'
              );
            }}>
            <Ionicons name="filter-outline" size={14} color={TEXT_MAIN} />
            <Text style={styles.sortBtnText}>
              {sortOption === 'latest' ? 'Latest' : sortOption === 'price_low' ? 'Price ↑' : 'Price ↓'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : activeTab === 'offers' ? (
        /* DYNAMIC OFFERS TAB RENDERER */
        <FlatList
          data={filteredOffers}
          keyExtractor={(item: any) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefetch}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
          ListHeaderComponent={
            <View style={styles.offerHeaderBanner}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="flash-outline" size={18} color={GOLD} />
                  <Text style={styles.offerHeaderTitle}>19-Type Dynamic Offers Engine</Text>
                </View>
                <TouchableOpacity
                  style={styles.createOfferBannerBtn}
                  onPress={() => router.push('/vendor/offers/create' as any)}>
                  <Ionicons name="add-circle" size={14} color="#0F172A" />
                  <Text style={styles.createOfferBannerBtnText}>+ CREATE OFFER</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.offerHeaderSub}>
                Boost store conversions with Coupons, BOGO Deals, Free Gifts, Tiered Discounts & Referral Rewards!
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={48} color={GOLD} />
              <Text style={styles.emptyTitle}>No Active Dynamic Offers</Text>
              <Text style={styles.emptyDesc}>
                Create promotional coupons and rewards to turn window shoppers into loyal buyers!
              </Text>
              <TouchableOpacity
                style={styles.createListingBtn}
                onPress={() => router.push('/vendor/offers/create' as any)}>
                <Ionicons name="add-circle" size={18} color="#0F172A" />
                <Text style={styles.createListingBtnText}>+ CREATE DYNAMIC OFFER</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const offerId = item._id || item.id;
            const code = item.code || item.couponCode || 'BIZOFFER';
            const catKey = item.category || 'discount';
            const meta = OFFER_CATEGORIES[catKey] || OFFER_CATEGORIES.discount;
            const isActive = (item.status || 'Active').toLowerCase() === 'active';
            const redemptionsCount =
              typeof item.usedCount === 'number'
                ? item.usedCount
                : typeof item.usesCount === 'number'
                ? item.usesCount
                : typeof item.usageCount === 'number'
                ? item.usageCount
                : Array.isArray(item.redemptions)
                ? item.redemptions.length
                : typeof item.redemptions === 'number'
                ? item.redemptions
                : 0;

            const viewsCount =
              typeof item.analytics?.viewsCount === 'number'
                ? item.analytics.viewsCount
                : typeof item.viewsCount === 'number'
                ? item.viewsCount
                : typeof item.views === 'number'
                ? item.views
                : 0;

            return (
              <View style={[styles.offerCard, !isActive && styles.cardHidden]}>
                <View style={styles.offerCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={styles.categoryIconBadge}>
                      <Text style={{ fontSize: 16 }}>{meta.icon || '🏷️'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerCardTitle} numberOfLines={1}>
                        {item.title || item.offerName || 'Special Vendor Offer'}
                      </Text>
                      <Text style={styles.offerCardSub}>{meta.label} • {meta.group}</Text>
                    </View>
                  </View>

                  <View style={[styles.codeBadge, !isActive && styles.codeBadgeInactive]}>
                    <Text style={[styles.codeBadgeText, !isActive && styles.codeBadgeTextInactive]}>
                      {code}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.offerCardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.offerMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="eye-outline" size={12} color="#3B82F6" />
                    <Text style={styles.metaItemText}>{viewsCount.toLocaleString('en-IN')} Views</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="ticket-outline" size={12} color={GOLD} />
                    <Text style={styles.metaItemText}>{redemptionsCount.toLocaleString('en-IN')} Uses</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={TEXT_MUTED} />
                    <Text style={styles.metaItemText}>
                      Till {formatDate(item.validTill || item.endTime)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.statusToggleBtn, isActive ? styles.statusActive : styles.statusDisabled]}
                    onPress={() => handleToggleOfferStatus(offerId)}>
                    <Text style={[styles.statusToggleText, isActive ? styles.statusTextActive : styles.statusTextDisabled]}>
                      {isActive ? 'ACTIVE' : 'DISABLED'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Offer Action Buttons */}
                <View style={styles.offerActionsFooter}>
                  <TouchableOpacity
                    style={styles.offerActionBtn}
                    onPress={() => router.push(`/vendor/offers/${offerId}` as any)}>
                    <Ionicons name="play-circle-outline" size={14} color={GOLD} />
                    <Text style={styles.offerActionBtnText}>SIMULATOR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.offerActionBtn}
                    onPress={() => handleDuplicateOffer(offerId, item.title)}>
                    <Ionicons name="copy-outline" size={14} color="#2563EB" />
                    <Text style={[styles.offerActionBtnText, { color: '#2563EB' }]}>DUPLICATE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.offerActionBtn}
                    onPress={() => handleDeleteOffer(offerId, item.title)}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={[styles.offerActionBtnText, { color: '#EF4444' }]}>DELETE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* PRODUCTS & SERVICES TABS RENDERER */
        <FlatList
          data={activeTab === 'products' ? filteredProducts : filteredServices}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefetch}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
          ListHeaderComponent={
            <View style={styles.subBannerCard}>
              <View style={styles.subBannerTopRow}>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE PLAN ACTIVE</Text>
                </View>
                <Text style={styles.realtimeSyncText}>Real-Time Database Sync</Text>
              </View>

              <Text style={styles.subBannerDesc}>
                List your {activeTab} so customers can easily search, discover, and connect with you on BizReels!
              </Text>

              <View style={styles.checkGridRow}>
                <Text style={styles.checkGridItem}>✓ Unlimited catalog items</Text>
                <Text style={styles.checkGridItem}>✓ Real-time search discovery</Text>
                <Text style={styles.checkGridItem}>✓ Buyer lead capture</Text>
                <Text style={styles.checkGridItem}>✓ Direct customer chats</Text>
              </View>

              <TouchableOpacity
                style={styles.showSubBtn}
                onPress={() => router.push('/vendor/subscription' as any)}>
                <Ionicons name="sparkles" size={14} color={GOLD} />
                <Text style={styles.showSubBtnText}>SHOW SUBSCRIPTION PLAN</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={activeTab === 'services' ? 'construct-outline' : 'cube-outline'} size={48} color={GOLD} />
              <Text style={styles.emptyTitle}>
                No {activeTab === 'services' ? 'Services' : 'Products'} Found
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No items match your search term.'
                  : `Start adding ${activeTab} to your store catalog.`}
              </Text>
              <TouchableOpacity
                style={styles.createListingBtn}
                onPress={handleAddItem}>
                <Ionicons name="add-circle" size={18} color="#0F172A" />
                <Text style={styles.createListingBtnText}>
                  + CREATE NEW {activeTab.toUpperCase().slice(0, -1)}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const image = getListingImage(item);
            const price = item.salePrice || item.price || 0;
            const itemAny = item as any;
            const isHidden = hiddenIds.includes(item._id);
            const stockCount = itemAny.stock ?? (itemAny.quantity ?? 10);

            return (
              <View style={[styles.card, isHidden && styles.cardHidden]}>
                <TouchableOpacity
                  style={styles.cardMainRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(`/vendor/listings/${item._id || (item as any).id}` as any)
                  }>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <View style={styles.cardImageFallback}>
                      <Ionicons name="cube-outline" size={26} color={TEXT_MUTED} />
                    </View>
                  )}

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.categorySubText} numberOfLines={1}>
                      {item.category || 'General'} {item.subcategory ? `• ${item.subcategory}` : ''}
                    </Text>

                    <View style={styles.metaBadgeRow}>
                      <Text style={styles.priceText}>₹{price.toLocaleString('en-IN')}</Text>

                      <View style={[styles.statusBadge, isHidden && styles.statusBadgeDraft]}>
                        <Text style={[styles.statusBadgeText, isHidden && styles.statusBadgeTextDraft]}>
                          {isHidden ? 'HIDDEN' : 'ACTIVE'}
                        </Text>
                      </View>

                      {item.type !== 'service' && (
                        <View style={[styles.stockPill, stockCount <= 2 && styles.stockPillLow]}>
                          <Text style={[styles.stockPillText, stockCount <= 2 && styles.stockPillTextLow]}>
                            {stockCount <= 2 ? `⚠️ ${stockCount}` : `${stockCount} in stock`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Ionicons name="eye-outline" size={13} color={TEXT_MUTED} />
                      <Text style={styles.metricValue}>{itemAny.views || itemAny.viewsCount || 0}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Ionicons name="heart-outline" size={13} color="#DB2777" />
                      <Text style={styles.metricValue}>{itemAny.likes || itemAny.likesCount || 0}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => setSelectedAnalyticsItem(item)}>
                      <Ionicons name="stats-chart" size={15} color={GOLD} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/vendor/listings/create' as any,
                          params: { editId: item._id || (item as any).id },
                        } as any)
                      }>
                      <Ionicons name="create-outline" size={15} color={GOLD} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDuplicateListing(item)}>
                      <Ionicons name="copy-outline" size={15} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => toggleVisibility(item._id, item.title)}>
                      <Ionicons
                        name={isHidden ? 'eye' : 'eye-off-outline'}
                        size={15}
                        color={isHidden ? '#059669' : TEXT_MUTED}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleShare(item)}>
                      <Ionicons name="share-social-outline" size={15} color={TEXT_MUTED} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDeleteListing(item._id, item.title)}>
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ANALYTICS MODAL */}
      <Modal
        visible={Boolean(selectedAnalyticsItem)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedAnalyticsItem(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedAnalyticsItem(null)} />
          {selectedAnalyticsItem && (() => {
            const item = selectedAnalyticsItem;
            const lid = item._id || item.id;
            const price = item.salePrice || item.price || 0;
            const views = item.views || item.viewsCount || 0;
            const uniqueVisitors = item.uniqueVisitors || Math.floor(views * 0.7);
            const likes = item.likes || item.likesCount || 0;
            const saves = item.saves_count || item.saves || 0;
            const orders = item.orders_count || item.deals || 0;
            const revenue = item.revenue || orders * price;
            const stock = item.stock ?? (item.quantity ?? 7);
            const threshold = item.lowStockThreshold ?? 5;
            const conversionRate = views > 0 ? ((orders / views) * 100).toFixed(1) : '0.0';
            const isService = item.type === 'service';

            return (
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="analytics" size={18} color={GOLD} />
                    <Text style={styles.modalTitle}>LISTING DETAILS & ANALYTICS</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedAnalyticsItem(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={TEXT_MAIN} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.itemSummaryCard}>
                    {(() => {
                      const modalItemImg = getListingImage(item);
                      return modalItemImg ? (
                        <Image source={{ uri: modalItemImg }} style={styles.itemSummaryImage} contentFit="cover" />
                      ) : (
                        <View style={styles.itemSummaryFallback}>
                          <Ionicons name="cube-outline" size={24} color={TEXT_MUTED} />
                        </View>
                      );
                    })()}
                    <View style={styles.itemSummaryInfo}>
                      <Text style={styles.itemSummaryTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.itemSummarySub}>{item.category || 'General'} {item.subcategory ? `• ${item.subcategory}` : ''}</Text>
                      <View style={styles.itemSummaryPriceRow}>
                        <Text style={styles.itemSummaryPrice}>₹{price.toLocaleString('en-IN')}</Text>
                        <Text style={{ color: TEXT_MUTED, fontSize: 10 }}>Added {formatDate(item.createdAt)}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.sectionHeaderTitle}>PERFORMANCE & IMPACT</Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <View style={styles.metricCardHeader}>
                        <Ionicons name="eye-outline" size={14} color="#2563EB" />
                        <Text style={styles.metricCardLabel}>TOTAL VIEWS</Text>
                      </View>
                      <Text style={styles.metricCardVal}>{views.toLocaleString('en-IN')}</Text>
                      <Text style={styles.metricCardSub}>{uniqueVisitors} Unique Buyers</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <View style={styles.metricCardHeader}>
                        <Ionicons name="heart-outline" size={14} color="#DB2777" />
                        <Text style={styles.metricCardLabel}>LIKES & SAVES</Text>
                      </View>
                      <Text style={styles.metricCardVal}>{likes + saves}</Text>
                      <Text style={styles.metricCardSub}>{saves} Saved to Wishlist</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <View style={styles.metricCardHeader}>
                        <Ionicons name="cart-outline" size={14} color="#059669" />
                        <Text style={styles.metricCardLabel}>ORDERS & DEALS</Text>
                      </View>
                      <Text style={styles.metricCardVal}>{orders}</Text>
                      <Text style={styles.metricCardSub}>Conversion: {conversionRate}%</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <View style={styles.metricCardHeader}>
                        <Ionicons name="cash-outline" size={14} color={GOLD} />
                        <Text style={styles.metricCardLabel}>REVENUE GENERATED</Text>
                      </View>
                      <Text style={styles.metricCardVal}>₹{revenue.toLocaleString('en-IN')}</Text>
                      <Text style={styles.metricCardSub}>Gross Sales Value</Text>
                    </View>
                  </View>

                  {!isService && (
                    <>
                      <Text style={styles.sectionHeaderTitle}>STOCK & INVENTORY CONTROL</Text>
                      <View style={styles.inventorySectionBox}>
                        <View style={styles.inventoryStatusRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.inventoryStockNum}>{stock}</Text>
                            <Text style={styles.inventoryStockLabel}>Units Remaining</Text>
                          </View>
                          <View
                            style={[
                              styles.inventoryBadge,
                              stock > threshold ? styles.invBadgeGreen : stock > 0 ? styles.invBadgeAmber : styles.invBadgeRed,
                            ]}>
                            <Text
                              style={[
                                styles.inventoryBadgeText,
                                stock > threshold ? styles.invTextGreen : stock > 0 ? styles.invTextAmber : styles.invTextRed,
                              ]}>
                              {stock > threshold ? 'IN STOCK' : stock > 0 ? 'LOW STOCK' : 'OUT OF STOCK'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.stockUpdateRow}>
                          <TextInput
                            style={styles.stockInput}
                            placeholder="Update count..."
                            placeholderTextColor={TEXT_MUTED}
                            keyboardType="number-pad"
                            value={stockInput}
                            onChangeText={setStockInput}
                          />
                          <TouchableOpacity
                            style={styles.stockUpdateBtn}
                            onPress={() => handleStockUpdate(lid)}
                            disabled={updatingStock}>
                            <Text style={styles.stockUpdateBtnText}>{updatingStock ? 'Saving...' : 'Update Stock'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}

                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      style={styles.modalEditBtn}
                      onPress={() => {
                        setSelectedAnalyticsItem(null);
                        router.push({
                          pathname: '/vendor/listings/create' as any,
                          params: { editId: lid },
                        } as any);
                      }}>
                      <Ionicons name="create-outline" size={15} color={GOLD} />
                      <Text style={styles.modalEditBtnText}>EDIT LISTING DETAILS</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* Product & Service Listing Modals */}
      <ProductFormModal
        visible={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingListing(null);
        }}
        editData={editingListing}
        onSubmitSuccess={() => {
          refetchListings();
        }}
      />

      <ServiceFormModal
        visible={showServiceModal}
        onClose={() => {
          setShowServiceModal(false);
          setEditingListing(null);
        }}
        editData={editingListing}
        onSubmitSuccess={() => {
          refetchListings();
        }}
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  addHeaderBtnText: {
    color: '#0F172A',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  verifyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  verifyText: {
    color: '#78350F',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  verifyBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifyBtnText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    ...Shadows.sm,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  tabPillActive: {
    backgroundColor: ESPRESSO,
    borderColor: GOLD,
  },
  tabPillText: {
    color: TEXT_MUTED,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: GOLD,
    fontWeight: '900',
  },
  filterControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 8,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    color: TEXT_MAIN,
    fontSize: FontSize.xs,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    ...Shadows.sm,
  },
  sortBtnText: {
    color: TEXT_MAIN,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBannerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  subBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '900',
  },
  realtimeSyncText: {
    color: TEXT_MUTED,
    fontSize: 9,
    fontWeight: '700',
  },
  subBannerDesc: {
    color: TEXT_MAIN,
    fontSize: 10,
    lineHeight: 14,
  },
  checkGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkGridItem: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '700',
  },
  showSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ESPRESSO,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  showSubBtnText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyDesc: {
    color: TEXT_MUTED,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  createListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    marginTop: 6,
  },
  createListingBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardHidden: {
    opacity: 0.6,
  },
  cardMainRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  cardImageFallback: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: TEXT_MAIN,
    fontSize: 12,
    fontWeight: '900',
  },
  categorySubText: {
    color: TEXT_MUTED,
    fontSize: 10,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  priceText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '900',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeDraft: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    color: '#166534',
    fontSize: 8,
    fontWeight: '900',
  },
  statusBadgeTextDraft: {
    color: '#64748B',
  },
  stockPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockPillLow: {
    backgroundColor: '#FEF2F2',
  },
  stockPillText: {
    color: '#334155',
    fontSize: 8,
    fontWeight: '800',
  },
  stockPillTextLow: {
    color: '#991B1B',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    color: TEXT_MAIN,
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    color: TEXT_MUTED,
    fontSize: 9,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Offer Card Styles */
  offerHeaderBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 14,
    gap: 6,
    marginBottom: 8,
  },
  offerHeaderTitle: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '900',
  },
  offerHeaderSub: {
    color: '#92400E',
    fontSize: 10,
    lineHeight: 14,
  },
  createOfferBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  createOfferBannerBtnText: {
    color: '#0F172A',
    fontSize: 9.5,
    fontWeight: '900',
  },
  offerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
    gap: 10,
    ...Shadows.sm,
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCardTitle: {
    color: TEXT_MAIN,
    fontSize: 12,
    fontWeight: '900',
  },
  offerCardSub: {
    color: TEXT_MUTED,
    fontSize: 9.5,
  },
  codeBadge: {
    backgroundColor: '#241B15',
    borderWidth: 1,
    borderColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeBadgeInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: BORDER_COLOR,
  },
  codeBadgeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  codeBadgeTextInactive: {
    color: TEXT_MUTED,
  },
  offerCardDesc: {
    color: '#475569',
    fontSize: 10.5,
    lineHeight: 15,
  },
  offerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    color: TEXT_MAIN,
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusDisabled: {
    backgroundColor: '#FEF2F2',
  },
  statusToggleText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  statusTextActive: {
    color: '#15803D',
  },
  statusTextDisabled: {
    color: '#991B1B',
  },
  offerActionsFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 8,
  },
  offerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offerActionBtnText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '900',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: TEXT_MAIN,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSummaryCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  itemSummaryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  itemSummaryFallback: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSummaryInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  itemSummaryTitle: {
    color: TEXT_MAIN,
    fontSize: 12,
    fontWeight: '900',
  },
  itemSummarySub: {
    color: TEXT_MUTED,
    fontSize: 9.5,
  },
  itemSummaryPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  itemSummaryPrice: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionHeaderTitle: {
    color: TEXT_MAIN,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricCardLabel: {
    color: TEXT_MUTED,
    fontSize: 8.5,
    fontWeight: '800',
  },
  metricCardVal: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '900',
  },
  metricCardSub: {
    color: TEXT_MUTED,
    fontSize: 8.5,
  },
  inventorySectionBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  inventoryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryStockNum: {
    color: TEXT_MAIN,
    fontSize: 18,
    fontWeight: '900',
  },
  inventoryStockLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginLeft: 6,
  },
  inventoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invBadgeGreen: { backgroundColor: '#DCFCE7' },
  invBadgeAmber: { backgroundColor: '#FEF3C7' },
  invBadgeRed: { backgroundColor: '#FEF2F2' },
  inventoryBadgeText: { fontSize: 8.5, fontWeight: '900' },
  invTextGreen: { color: '#166534' },
  invTextAmber: { color: '#92400E' },
  invTextRed: { color: '#991B1B' },
  stockUpdateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stockInput: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 11,
    color: TEXT_MAIN,
  },
  stockUpdateBtn: {
    backgroundColor: ESPRESSO,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockUpdateBtnText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
  },
  modalActionRow: {
    marginBottom: 30,
  },
  modalEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: GOLD,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalEditBtnText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '900',
  },
});
