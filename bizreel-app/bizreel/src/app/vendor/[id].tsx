import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { useAddToCart } from '@/features/cart/queries';
import { useFollowUser, useUnfollowUser } from '@/features/reels/queries';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/utils/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - Spacing.four * 3) / 2;

// Theme Design System Tokens matching Web & App
const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

interface VendorDetails {
  id: string;
  name: string;
  business_name?: string;
  profile_pic?: string;
  cover_banner?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  city?: string;
  state?: string;
  address?: string;
  whatsapp?: string;
  phone?: string;
  verified_badge?: boolean;
  rating_avg?: number;
  rating_count?: number;
  viewer_following?: boolean;
  stats?: {
    posts?: number;
    followers?: number;
    following?: number;
    likes?: number;
    views?: number;
    reviews?: number;
    products?: number;
    services?: number;
  };
}

interface ProductItem {
  _id: string;
  id?: string;
  title: string;
  price: number;
  salePrice?: number;
  actualPrice?: number;
  images?: string[];
  thumbnailUrl?: string;
  type?: 'product' | 'service';
  category_type?: 'product' | 'service';
  vendor?: any;
}

interface ReelItemData {
  _id: string;
  id?: string;
  caption?: string;
  thumbnailUrl?: string;
  mediaUrls?: string[];
  videoUrl?: string;
  views_count?: number;
  likes_count?: number;
}

export default function PublicVendorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; vendorId?: string; tab?: string; initialTab?: string }>();
  const vendorId = params.id || params.vendorId;

  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [reels, setReels] = useState<ReelItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'reels' | 'about'>(() => {
    const t = (params.tab || params.initialTab || '').toLowerCase();
    if (t === 'services' || t === 'service') return 'services';
    if (t === 'reels' || t === 'reel') return 'reels';
    if (t === 'about') return 'about';
    return 'products';
  });
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const t = (params.tab || params.initialTab || '').toLowerCase();
    if (t === 'services' || t === 'service') {
      setActiveTab('services');
    } else if (t === 'reels' || t === 'reel') {
      setActiveTab('reels');
    } else if (t === 'products' || t === 'product') {
      setActiveTab('products');
    }
  }, [params.tab, params.initialTab]);

  const addToCartMutation = useAddToCart();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const fetchVendorData = useCallback(async () => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    try {
      const [vendorRes, listingsRes, reelsRes] = await Promise.all([
        // 1. Fetch Vendor Profile Details
        api.get(`/vendors/${vendorId}/profile`).catch(() =>
          api.get(`/vendors/${vendorId}`).catch(() =>
            api.get(`/users/${vendorId}`).catch(() => ({ data: {} }))
          )
        ),
        // 2. Fetch Vendor Products/Services Listings
        api.get(`/vendors/${vendorId}/listings`).catch(() =>
          api.get(`/listings`, { params: { vendor: vendorId } }).catch(() =>
            api.get(`/listings`, { params: { vendor_id: vendorId } }).catch(() => ({ data: { items: [] } }))
          )
        ),
        // 3. Fetch Vendor Reels
        api.get(`/reels`, { params: { creatorId: vendorId } }).catch(() =>
          api.get(`/reels`, { params: { creator_id: vendorId } }).catch(() =>
            api.get(`/reels`, { params: { vendor_id: vendorId } }).catch(() => ({ data: { items: [] } }))
          )
        ),
      ]);

      const vData = vendorRes.data?.data || vendorRes.data?.vendor || vendorRes.data || {};
      setVendor(vData);
      setIsFollowing(Boolean(vData.viewer_following));

      // Extract listings/products array
      const pRaw =
        listingsRes.data?.items ||
        listingsRes.data?.data?.items ||
        listingsRes.data?.data ||
        listingsRes.data ||
        [];
      const pItems = Array.isArray(pRaw) ? pRaw : [];
      setProducts(pItems);

      // Extract reels array
      const rRaw =
        reelsRes.data?.data?.reels ||
        reelsRes.data?.reels ||
        reelsRes.data?.data?.items ||
        reelsRes.data?.items ||
        reelsRes.data?.data ||
        reelsRes.data ||
        [];
      const rItems = Array.isArray(rRaw) ? rRaw : [];
      setReels(rItems);
    } catch (err) {
      console.warn('Failed to load vendor profile details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendorData();
  };

  const { user, status: authStatus } = useAuth();

  const ensureAuth = (actionDesc: string, callback: () => void) => {
    if (authStatus === 'unauthed' || !user) {
      Alert.alert(
        'Account Required',
        `Please sign in to your BizReels account to ${actionDesc}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In / Register', onPress: () => router.push('/(auth)/login' as any) },
        ]
      );
      return;
    }
    callback();
  };

  const handleToggleFollow = () => {
    if (!vendorId) return;
    ensureAuth('follow stores', () => {
      const next = !isFollowing;
      setIsFollowing(next);
      if (next) {
        followMutation.mutate(vendorId);
      } else {
        unfollowMutation.mutate(vendorId);
      }
    });
  };

  const handleChat = () => {
    if (!vendorId) return;
    ensureAuth('chat with vendors', () => {
      const name = vendor?.business_name || vendor?.name || 'Store Seller';
      router.push({
        pathname: '/messages/[id]' as any,
        params: {
          id: `direct_${vendorId}`,
          recipientId: vendorId,
          name,
          avatar: vendor?.profile_pic || '',
        },
      } as any);
    });
  };

  const handleCall = () => {
    const num = vendor?.whatsapp || vendor?.phone;
    if (num) {
      Linking.openURL(`tel:${num}`).catch(() =>
        Alert.alert('Phone Call', `Vendor contact number: ${num}`)
      );
    } else {
      Alert.alert('Contact Vendor', 'Phone number not shared publicly.');
    }
  };

  const handleShare = async () => {
    try {
      const storeName = vendor?.business_name || vendor?.name || 'Vendor Store';
      await Share.share({
        message: `Discover products, services & reels from ${storeName} on BizReels! https://bizreels.in/vendor/${vendorId}`,
        url: `https://bizreels.in/vendor/${vendorId}`,
      });
    } catch (err) {}
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Loading Vendor Store...</Text>
      </View>
    );
  }

  if (!vendor || !vendorId) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="storefront-outline" size={48} color={TEXT_MUTED} />
        <Text style={styles.notFoundTitle}>Vendor Profile Not Found</Text>
        <Text style={styles.notFoundSub}>The vendor store you requested could not be located.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
          <Text style={styles.backHomeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentUserId = user?._id || (user as any)?.id;
  const isOwner = Boolean(
    currentUserId &&
      (currentUserId.toString() === vendorId?.toString() ||
        (vendor && ((vendor as any)._id?.toString() === currentUserId.toString() || (vendor as any).id?.toString() === currentUserId.toString())))
  );
  const isVendor = Boolean(
    (user as any)?.activeRole === 'vendor' || (user as any)?.role === 'vendor' || (user as any)?.current_role === 'vendor'
  );
  const hideCustomerActions = isOwner || (isVendor && currentUserId && vendorId && currentUserId.toString() === vendorId.toString());

  const avatarUri = resolveImageUrl(vendor.profile_pic) || 'https://via.placeholder.com/150';
  const bannerUri = resolveImageUrl(vendor.cover_banner) || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
  const isVerified = Boolean(
    (vendor as any)?.isVerified === true ||
    (vendor as any)?.is_verified === true ||
    (vendor as any)?.kyc_status === 'approved' ||
    (vendor as any)?.kyc_status === 'verified' ||
    (vendor as any)?.vendorProfile?.verificationStatus === 'verified' ||
    (vendor as any)?.vendorProfile?.verificationStatus === 'verified_vendor'
  );

  const productsList = products.filter((item: any) => (item.type || item.category_type) !== 'service');
  const servicesList = products.filter((item: any) => (item.type || item.category_type) === 'service');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 6 }}>
          <Text style={styles.headerBadge}>OFFICIAL VENDOR STORE ✦</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {vendor.business_name || vendor.name}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color={GOLD} />
        </TouchableOpacity>
        {!hideCustomerActions && (
          <TouchableOpacity style={styles.headerBtn} onPress={handleChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={GOLD} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}>
        
        {/* Cover Banner */}
        <View style={styles.coverBox}>
          <Image source={{ uri: bannerUri }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.coverOverlay} />
        </View>

        {/* Floating Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
            </View>
            <View style={styles.headerBtnGroup}>
              {hideCustomerActions ? (
                <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/vendor/settings' as any)}>
                  <Ionicons name="create-outline" size={14} color={GOLD} />
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    onPress={handleToggleFollow}
                    activeOpacity={0.88}>
                    <Ionicons
                      name={isFollowing ? 'checkmark-circle' : 'person-add-outline'}
                      size={14}
                      color={isFollowing ? '#fff' : ESPRESSO}
                    />
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? 'Following' : 'Follow Store'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.88}>
                    <Ionicons name="chatbubble-ellipses" size={14} color={GOLD} />
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Business Details */}
          <View style={styles.businessInfo}>
            <View style={styles.businessTitleRow}>
              <Text style={styles.businessTitle}>
                {vendor.business_name || vendor.name}
              </Text>
              {isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>VERIFIED SUPPLIER</Text>
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <Ionicons name="shield-outline" size={12} color="#D97706" />
                  <Text style={styles.unverifiedBadgeText}>UNVERIFIED</Text>
                </View>
              )}
            </View>

            {/* Unverified Owner Alert Banner */}
            {isOwner && !isVerified && (
              <View style={styles.ownerAlertBox}>
                <Ionicons name="warning-outline" size={16} color={GOLD} />
                <Text style={styles.ownerAlertText}>
                  Complete KYC verification to display your official Verified Supplier badge.
                </Text>
                <TouchableOpacity onPress={() => router.push('/vendor/verification' as any)} style={styles.verifyBtn}>
                  <Text style={styles.verifyBtnText}>Verify Now</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.categoryPillRow}>
              <View style={styles.categoryPill}>
                <Ionicons name="grid-outline" size={12} color={GOLD} />
                <Text style={styles.categoryPillText}>
                  {vendor.category ? vendor.category : 'General Business Store'}
                  {vendor.subcategory ? ` • ${vendor.subcategory}` : ''}
                </Text>
              </View>
            </View>

            {(Boolean(vendor.address) || Boolean(vendor.city)) && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={GOLD} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {vendor.address || `${vendor.city || ''}${vendor.state ? `, ${vendor.state}` : ''}`}
                </Text>
              </View>
            )}

            {Boolean(vendor.description) && (
              <Text style={styles.descriptionText} numberOfLines={3}>
                {vendor.description}
              </Text>
            )}
          </View>

          {/* Action Row */}
          {!hideCustomerActions && (
            <View style={styles.contactActionRow}>
              <TouchableOpacity style={styles.actionPill} onPress={handleCall} activeOpacity={0.88}>
                <Ionicons name="call-outline" size={14} color={GOLD} />
                <Text style={styles.actionPillText}>Call Seller</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionPill} onPress={handleChat} activeOpacity={0.88}>
                <Ionicons name="paper-plane-outline" size={14} color={GOLD} />
                <Text style={styles.actionPillText}>Send Inquiry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Metrics Grid Cards */}
          <View style={styles.metricsRow}>
            <View style={styles.metricChip}>
              <View style={styles.metricIconBoxEmerald}>
                <Ionicons name="bag-handle-outline" size={15} color="#059669" />
              </View>
              <Text style={[styles.metricVal, { color: '#059669' }]}>{vendor.stats?.products ?? productsList.length}</Text>
              <Text style={styles.metricLabel}>Products</Text>
            </View>
            
            <View style={styles.metricChip}>
              <View style={styles.metricIconBoxBlue}>
                <Ionicons name="construct-outline" size={15} color="#2563EB" />
              </View>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>{vendor.stats?.services ?? servicesList.length}</Text>
              <Text style={styles.metricLabel}>Services</Text>
            </View>

            <View style={styles.metricChip}>
              <View style={styles.metricIconBoxPurple}>
                <Ionicons name="videocam-outline" size={15} color="#7C3AED" />
              </View>
              <Text style={[styles.metricVal, { color: '#7C3AED' }]}>{vendor.stats?.posts ?? reels.length}</Text>
              <Text style={styles.metricLabel}>Reels</Text>
            </View>

            <View style={styles.metricChip}>
              <View style={styles.metricIconBoxAmber}>
                <Ionicons name="star" size={15} color="#D97706" />
              </View>
              <Text style={[styles.metricVal, { color: '#D97706' }]}>{(vendor.rating_avg || 4.9).toFixed(1)} ★</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Tab Header Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'products' && styles.tabBtnActive]}
            onPress={() => setActiveTab('products')}>
            <Ionicons
              name="bag-handle-outline"
              size={15}
              color={activeTab === 'products' ? GOLD : TEXT_MUTED}
            />
            <Text style={[styles.tabBtnText, activeTab === 'products' && styles.tabBtnTextActive]}>
              Products ({productsList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'services' && styles.tabBtnActive]}
            onPress={() => setActiveTab('services')}>
            <Ionicons
              name="construct-outline"
              size={15}
              color={activeTab === 'services' ? GOLD : TEXT_MUTED}
            />
            <Text style={[styles.tabBtnText, activeTab === 'services' && styles.tabBtnTextActive]}>
              Services ({servicesList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'reels' && styles.tabBtnActive]}
            onPress={() => setActiveTab('reels')}>
            <Ionicons
              name="videocam-outline"
              size={15}
              color={activeTab === 'reels' ? GOLD : TEXT_MUTED}
            />
            <Text style={[styles.tabBtnText, activeTab === 'reels' && styles.tabBtnTextActive]}>
              Reels ({reels.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'about' && styles.tabBtnActive]}
            onPress={() => setActiveTab('about')}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={activeTab === 'about' ? GOLD : TEXT_MUTED}
            />
            <Text style={[styles.tabBtnText, activeTab === 'about' && styles.tabBtnTextActive]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB CONTENTS */}
        {activeTab === 'products' && (
          <View style={styles.tabContent}>
            {productsList.length > 0 ? (
              <View style={styles.productGrid}>
                {productsList.map((item) => {
                  const imgUri =
                    resolveImageUrl(item.images?.[0] || item.thumbnailUrl) ||
                    'https://via.placeholder.com/300';
                  const price = item.salePrice || item.price || 0;

                  return (
                    <TouchableOpacity
                      key={item._id || item.id}
                      style={styles.productCard}
                      onPress={() => router.push(`/listing/${item._id || item.id}`)}
                      activeOpacity={0.92}>
                      <Image source={{ uri: imgUri }} style={styles.productImage} contentFit="cover" />
                      <View style={styles.productInfo}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={styles.productPriceRow}>
                          <Text style={styles.productPrice}>₹{price.toLocaleString('en-IN')}</Text>
                          {!hideCustomerActions && (
                            <TouchableOpacity
                              style={styles.addCartSmallBtn}
                              onPress={() =>
                                addToCartMutation.mutate({ listing_id: (item._id || item.id || ''), quantity: 1 })
                              }>
                              <Ionicons name="cart" size={14} color={ESPRESSO} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="basket-outline" size={40} color={TEXT_MUTED} />
                <Text style={styles.emptyTitle}>No Products Cataloged</Text>
                <Text style={styles.emptySub}>This vendor store has not published product listings yet.</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'services' && (
          <View style={styles.tabContent}>
            {servicesList.length > 0 ? (
              <View style={styles.productGrid}>
                {servicesList.map((service: any) => {
                  const imgUri =
                    resolveImageUrl(service.images?.[0] || service.thumbnailUrl) ||
                    'https://via.placeholder.com/300';
                  const price = service.salePrice || service.price || 0;
                  const sd = service.serviceDetails || {};

                  return (
                    <TouchableOpacity
                      key={service._id || service.id}
                      style={styles.productCard}
                      onPress={() => router.push(`/listing/${service._id || service.id}`)}
                      activeOpacity={0.92}>
                      <Image source={{ uri: imgUri }} style={styles.productImage} contentFit="cover" />
                      <View style={styles.productInfo}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {service.title}
                        </Text>
                        <Text style={styles.serviceMetaText}>
                          {sd.serviceMode || service.serviceMode || 'On-site'} • {sd.durationText || service.duration || '1 Hour'}
                        </Text>
                        <View style={styles.productPriceRow}>
                          <Text style={styles.productPrice}>₹{price.toLocaleString('en-IN')}</Text>
                          {!hideCustomerActions && (
                            <TouchableOpacity
                              style={styles.addCartSmallBtn}
                              onPress={() => handleChat()}>
                              <Ionicons name="chatbubble-ellipses-outline" size={14} color={ESPRESSO} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="construct-outline" size={40} color={TEXT_MUTED} />
                <Text style={styles.emptyTitle}>No Services Listed</Text>
                <Text style={styles.emptySub}>This vendor store has not published service offerings yet.</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'reels' && (
          <View style={styles.tabContent}>
            {reels.length > 0 ? (
              <View style={styles.reelsGrid}>
                {reels.map((reel) => {
                  const thumb =
                    resolveImageUrl(reel.thumbnailUrl || reel.mediaUrls?.[0]) ||
                    'https://via.placeholder.com/300';
                  return (
                    <TouchableOpacity
                      key={reel._id || reel.id}
                      style={styles.reelThumbCard}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)',
                          params: { reelId: reel._id || (reel as any).id },
                        } as any)
                      }
                      activeOpacity={0.9}>
                      <Image source={{ uri: thumb }} style={styles.reelThumbImage} contentFit="cover" />
                      <View style={styles.reelPlayBadge}>
                        <Ionicons name="play" size={11} color="#fff" />
                        <Text style={styles.reelPlayText}>{(reel.views_count || 420).toLocaleString()}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="videocam-outline" size={40} color={TEXT_MUTED} />
                <Text style={styles.emptyTitle}>No Video Reels Yet</Text>
                <Text style={styles.emptySub}>This vendor store has not posted video reels yet.</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutHeader}>STORE INFORMATION</Text>
              
              <View style={styles.aboutRow}>
                <Ionicons name="business-outline" size={16} color={GOLD} />
                <Text style={styles.aboutLabel}>Business Name:</Text>
                <Text style={styles.aboutVal}>{vendor.business_name || vendor.name}</Text>
              </View>

              <View style={styles.aboutRow}>
                <Ionicons name="grid-outline" size={16} color={GOLD} />
                <Text style={styles.aboutLabel}>Category:</Text>
                <Text style={styles.aboutVal}>{vendor.category || 'General Business Store'}</Text>
              </View>

              <View style={styles.aboutRow}>
                <Ionicons name="location-outline" size={16} color={GOLD} />
                <Text style={styles.aboutLabel}>Location:</Text>
                <Text style={styles.aboutVal}>
                  {vendor.address || `${vendor.city || 'India'}${vendor.state ? `, ${vendor.state}` : ''}`}
                </Text>
              </View>

              <View style={styles.aboutRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={GOLD} />
                <Text style={styles.aboutLabel}>Verification Status:</Text>
                <Text style={[styles.aboutVal, { color: isVerified ? '#059669' : '#D97706', fontWeight: '900' }]}>
                  {isVerified ? 'Verified Supplier' : 'Unverified Supplier'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },
  centerContainer: { flex: 1, backgroundColor: BG_MATTE, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: 12 },
  loadingText: { color: TEXT_MUTED, fontSize: FontSize.xs, fontWeight: '700' },
  notFoundTitle: { color: TEXT_MAIN, fontSize: FontSize.md, fontWeight: '900' },
  notFoundSub: { color: TEXT_MUTED, fontSize: FontSize.xs, textAlign: 'center' },
  backHomeBtn: { backgroundColor: ESPRESSO, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  backHomeBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    gap: Spacing.two,
  },
  headerBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.3 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  coverBox: { height: 140, width: '100%', position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(36, 27, 21, 0.45)' },

  profileHeaderCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: Spacing.four,
    marginTop: -36,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  avatarBorder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: GOLD,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarImage: { width: '100%', height: '100%' },

  headerBtnGroup: { flexDirection: 'row', gap: 8 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  followBtnActive: { backgroundColor: ESPRESSO },
  followBtnText: { color: ESPRESSO, fontSize: 11, fontWeight: '900' },
  followBtnTextActive: { color: '#FFFFFF' },

  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  chatBtnText: { color: GOLD, fontSize: 11, fontWeight: '900' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  editBtnText: { color: GOLD, fontSize: 11, fontWeight: '900' },

  businessInfo: { gap: 6 },
  businessTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  businessTitle: { color: TEXT_MAIN, fontSize: FontSize.md, fontWeight: '900' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: { color: '#059669', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },

  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unverifiedBadgeText: { color: '#D97706', fontSize: 9.5, fontWeight: '900' },

  ownerAlertBox: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ownerAlertText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', flex: 1 },
  verifyBtn: { backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  verifyBtnText: { color: ESPRESSO, fontSize: 11, fontWeight: '900' },

  categoryPillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3EAD8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryPillText: { color: ESPRESSO, fontSize: 11, fontWeight: '800' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  locationText: { color: TEXT_MUTED, fontSize: 11, fontWeight: '600' },
  descriptionText: { color: TEXT_MAIN, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4 },

  contactActionRow: { flexDirection: 'row', gap: Spacing.two, marginTop: 6 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  actionPillText: { color: ESPRESSO, fontSize: 11, fontWeight: '800' },

  metricsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: 6 },
  metricChip: {
    flex: 1,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
  metricIconBoxEmerald: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  metricIconBoxBlue: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  metricIconBoxPurple: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  metricIconBoxAmber: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  metricVal: { fontSize: FontSize.xs, fontWeight: '900', marginTop: 2 },
  metricLabel: { color: TEXT_MUTED, fontSize: 9.5, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: ESPRESSO },
  tabBtnText: { color: TEXT_MUTED, fontSize: 11, fontWeight: '700' },
  tabBtnTextActive: { color: GOLD, fontWeight: '900' },

  tabContent: { paddingHorizontal: Spacing.four, marginTop: Spacing.three },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  productCard: {
    width: COLUMN_WIDTH,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: { width: '100%', height: 135, backgroundColor: BG_MATTE },
  productInfo: { padding: Spacing.two, gap: 4 },
  productTitle: { color: TEXT_MAIN, fontSize: 11, fontWeight: '800', lineHeight: 15 },
  serviceMetaText: { color: GOLD, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  productPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  productPrice: { color: ESPRESSO, fontSize: FontSize.xs, fontWeight: '900' },
  addCartSmallBtn: {
    backgroundColor: GOLD,
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reelsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reelThumbCard: {
    width: (SCREEN_WIDTH - Spacing.four * 2 - 16) / 3,
    height: 160,
    backgroundColor: ESPRESSO,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  reelThumbImage: { width: '100%', height: '100%' },
  reelPlayBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  reelPlayText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  emptySub: { color: TEXT_MUTED, fontSize: 11, textAlign: 'center' },

  aboutCard: {
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
  aboutHeader: { color: ESPRESSO, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutLabel: { color: TEXT_MUTED, fontSize: 11, fontWeight: '700', width: 130 },
  aboutVal: { flex: 1, color: TEXT_MAIN, fontSize: 11, fontWeight: '800' },
});
