/**
 * Search Screen — Rebuilt to match the Web Frontend Search Page & SearchFiltersBar exactly.
 * 
 * Includes exact Web Filters:
 * 1. Text Search Input (search/query)
 * 2. Type Toggle Tabs (All, Products, Services)
 * 3. Distance Radius Selector (Anywhere, 2 km, 5 km, 10 km, 20 km, 50 km)
 * 4. Category Chips Bar & Category Search Modal
 * 5. Max Budget Slider (Up to ₹2 Cr) with Quick Preset Chips (50k, 5L, 25L, 1 Cr, 2 Cr)
 * 6. 🔥 With Offers & 🟢 Open Now Toggles
 * 7. Advanced Filters Drawer:
 *    - Delivery Type (Home Delivery, Shop Pickup, Courier Available, COD Available)
 *    - Condition (All Conditions, New, Old / Used, Refurbished)
 *    - Seller Type (All Sellers, Verified Vendor, GST Verified, Local Seller)
 *    - Minimum Rating (Any Rating, 4+ Stars, 3+ Stars, 2+ Stars)
 *    - Shop / Vendor Name filter
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { useAddToCart } from '@/features/cart/queries';
import { useCategories, useListings } from '@/features/search/queries';
import type { Category } from '@/features/search/types';
import { getListingImage } from '@/utils/image';

const DISTANCE_VALUES = [
  { value: 'all', label: 'Anywhere' },
  { value: '2', label: 'Within 2 km' },
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
  { value: '20', label: 'Within 20 km' },
  { value: '50', label: 'Within 50 km' },
];

const BUDGET_PRESETS = [
  { label: '50k', val: 50000 },
  { label: '5L', val: 500000 },
  { label: '25L', val: 2500000 },
  { label: '1 Cr', val: 10000000 },
  { label: '2 Cr', val: 20000000 },
];

const PRICE_SLIDER_STEPS = [
  { label: '₹1K', val: 1000 },
  { label: '₹50K', val: 50000 },
  { label: '₹5L', val: 500000 },
  { label: '₹25L', val: 2500000 },
  { label: '₹1Cr', val: 10000000 },
  { label: '₹2Cr', val: 20000000 },
];

const DELIVERY_OPTIONS = [
  'Home Delivery',
  'Shop Pickup',
  'Courier Available',
  'COD Available',
];

const CONDITION_OPTIONS = [
  { value: 'all', label: 'All Conditions' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Old / Used' },
  { value: 'refurbished', label: 'Refurbished' },
];

const SELLER_TYPE_OPTIONS = [
  { value: 'all', label: 'All Sellers' },
  { value: 'verified', label: '✅ Verified Vendor' },
  { value: 'gst_verified', label: '📋 GST Verified' },
  { value: 'local', label: '📍 Local Seller' },
];

const RATING_OPTIONS = [
  { value: 'all', label: 'Any Rating' },
  { value: '4', label: '⭐ 4+ Stars' },
  { value: '3', label: '⭐ 3+ Stars' },
  { value: '2', label: '⭐ 2+ Stars' },
];

const DEFAULT_SUBCATEGORIES_MAP: Record<string, string[]> = {
  Electronics: ['Mobile Phones', 'Laptops & Computers', 'TV & Audio', 'Home Appliances', 'Accessories'],
  Fashion: ['Men Clothing', 'Women Clothing', 'Kids Wear', 'Footwear', 'Accessories'],
  'Home & Furniture': ['Living Room Furniture', 'Bedroom Furniture', 'Kitchen & Dining', 'Home Decor'],
  Vehicles: ['Cars', 'Bikes & Scooters', 'Commercial Vehicles', 'Auto Parts & Accessories'],
  Services: ['Website & App Development', 'Graphic & Logo Design', 'Plumbing', 'Electrician', 'AC Repair'],
  'Beauty & Salon': ['Men Salon & Grooming', 'Women Beauty & Makeup', 'Bridal Packages', 'Spa & Wellness'],
  'Food & Grocery': ['Restaurants & Cafes', 'Fresh Grocery', 'Bakery & Sweets', 'Packaged Foods'],
  'Real Estate': ['Property for Rent', 'Property for Sale', 'PG & Shared Hostels', 'Commercial Spaces'],
};

export function getSubcategoriesList(cat: any): string[] {
  if (!cat) return [];
  if (Array.isArray(cat.children) && cat.children.length > 0) {
    return cat.children.map((c: any) => (typeof c === 'string' ? c : c.name));
  }
  const name = cat.name || '';
  if (DEFAULT_SUBCATEGORIES_MAP[name]) return DEFAULT_SUBCATEGORIES_MAP[name];

  const foundKey = Object.keys(DEFAULT_SUBCATEGORIES_MAP).find(
    (k) => k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase())
  );
  return foundKey ? DEFAULT_SUBCATEGORIES_MAP[foundKey] : [];
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string; subcategory?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const u = (user as any) || {};
  const activeRole = u.activeRole || u.current_role || u.role || 'customer';
  const isVendor = activeRole === 'vendor';

  useEffect(() => {
    if (isVendor) {
      router.replace('/(tabs)/home');
    }
  }, [isVendor]);

  // ── 1. Search Query & Main Filters (Web Parity) ──
  const [query, setQuery] = useState(params.q || '');
  const [type, setType] = useState<'all' | 'product' | 'service'>('all');
  const [distance, setDistance] = useState<string>('all');
  const [category, setCategory] = useState<string>(params.category || 'all');
  const [subcategory, setSubcategory] = useState<string>(params.subcategory || 'all');
  const [selectedChipId, setSelectedChipId] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(20000000); // 2 Cr Max
  const [hasOffers, setHasOffers] = useState<boolean>(false);
  const [openNow, setOpenNow] = useState<boolean>(false);

  // ── 2. Advanced Filters Drawer (Web Parity) ──
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [deliveryType, setDeliveryType] = useState<string[]>([]);
  const [condition, setCondition] = useState<string>('all');
  const [sellerType, setSellerType] = useState<string>('all');
  const [minRating, setMinRating] = useState<string>('all');
  const [shopName, setShopName] = useState<string>('');

  // ── 3. Category Modal State ──
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // ── 4. Pagination & GPS Location ──
  const [currentPage, setCurrentPage] = useState<number>(1);
  const flatListRef = useRef<FlatList>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const addToCartMutation = useAddToCart();
  const deferredQuery = useDeferredValue(query.trim());

  // Count active advanced filters for badge
  const activeAdvancedCount = [
    condition !== 'all' ? 1 : 0,
    sellerType !== 'all' ? 1 : 0,
    minRating !== 'all' ? 1 : 0,
    hasOffers ? 1 : 0,
    openNow ? 1 : 0,
    shopName.trim() ? 1 : 0,
    deliveryType.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Request location for distance filtering
  useEffect(() => {
    async function getCustomerLocation() {
      try {
        if (u.location && Array.isArray(u.location.coordinates) && u.location.coordinates.length === 2) {
          const [lng, lat] = u.location.coordinates;
          if (parseFloat(lng) !== 0 || parseFloat(lat) !== 0) {
            setUserCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
            return;
          }
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (err) {
        // location optional
      }
    }
    getCustomerLocation();
  }, []);

  const toggleDeliveryType = (dt: string) => {
    setDeliveryType((prev) =>
      prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt]
    );
  };

  // Build API Params exactly matching web fetchListings
  const listingsParams = useMemo(() => {
    const p: Record<string, any> = {
      page: currentPage,
      limit: 50,
    };
    if (type !== 'all') p.type = type;
    if (category !== 'all') p.category = category;
    if (subcategory !== 'all') p.subcategory = subcategory;
    if (deferredQuery) p.search = deferredQuery;
    if (maxPrice < 20000000) p.maxPrice = maxPrice;
    if (distance && distance !== 'all') p.distance = distance;
    if (condition !== 'all') p.condition = condition;
    if (sellerType !== 'all') p.sellerType = sellerType;
    if (minRating !== 'all') p.minRating = minRating;
    if (hasOffers) p.has_offer = true;
    if (shopName.trim()) p.shopName = shopName.trim();
    if (openNow) p.openNow = true;
    if (deliveryType.length > 0) p.deliveryType = deliveryType.join(',');
    if (userCoords && distance && distance !== 'all') {
      p.lat = userCoords.lat;
      p.lng = userCoords.lng;
    }
    return p;
  }, [
    currentPage,
    type,
    category,
    subcategory,
    deferredQuery,
    maxPrice,
    distance,
    condition,
    sellerType,
    minRating,
    hasOffers,
    shopName,
    openNow,
    deliveryType,
    userCoords,
  ]);

  const { data: categoriesData } = useCategories();
  const {
    data: listingsData,
    isLoading: listingsLoading,
    isRefetching: listingsRefetching,
    refetch: refetchListings,
  } = useListings(listingsParams, true);

  const rawCategories = Array.isArray(categoriesData) ? categoriesData : (categoriesData as any)?.data || [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    deferredQuery,
    type,
    distance,
    category,
    subcategory,
    maxPrice,
    hasOffers,
    openNow,
    condition,
    sellerType,
    minRating,
    shopName,
    deliveryType,
  ]);

  const categoryChips = useMemo(() => {
    if (rawCategories && rawCategories.length > 0) {
      return rawCategories.map((c: any) => ({
        id: `cat_${(c.name || c).toLowerCase().replace(/\s+/g, '_')}`,
        label: c.name || c,
        category: c.name || c,
        type: 'category',
      }));
    }
    return [
      { id: 'cat_electronics', label: 'Electronics', category: 'Electronics', type: 'category' },
      { id: 'cat_fashion', label: 'Fashion', category: 'Fashion', type: 'category' },
      { id: 'cat_home', label: 'Home & Furniture', category: 'Home & Furniture', type: 'category' },
      { id: 'cat_services', label: 'Services', category: 'Services', type: 'category' },
      { id: 'cat_vehicles', label: 'Vehicles', category: 'Vehicles', type: 'category' },
      { id: 'cat_food', label: 'Food & Grocery', category: 'Food & Grocery', type: 'category' },
      { id: 'cat_beauty', label: 'Beauty & Salon', category: 'Beauty & Salon', type: 'category' },
      { id: 'cat_realestate', label: 'Real Estate', category: 'Real Estate', type: 'category' },
    ];
  }, [rawCategories]);

  const handleSelectChip = (chip: any) => {
    if (!chip || chip.id === 'all' || selectedChipId === chip.id) {
      setSelectedChipId('all');
      setCategory('all');
      setSubcategory('all');
    } else {
      setSelectedChipId(chip.id);
      setCategory(chip.category || chip.label);
      setSubcategory('all');
    }
  };

  const rawListings = Array.isArray(listingsData)
    ? listingsData
    : (listingsData as any)?.data || (listingsData as any)?.listings || [];

  const metaData = (listingsData as any)?.meta || {};
  const totalItemsCount = metaData.total ?? rawListings.length;
  const totalPagesCount = metaData.totalPages || (totalItemsCount > 0 ? Math.ceil(totalItemsCount / 50) : 1);
  const hasNextPage = metaData.hasNextPage ?? (currentPage < totalPagesCount || rawListings.length === 50);
  const hasPrevPage = metaData.hasPrevPage ?? (currentPage > 1);

  const resetAllFilters = () => {
    setQuery('');
    setType('all');
    setDistance('all');
    setCategory('all');
    setSubcategory('all');
    setSelectedChipId('all');
    setMaxPrice(20000000);
    setHasOffers(false);
    setOpenNow(false);
    setDeliveryType([]);
    setCondition('all');
    setSellerType('all');
    setMinRating('all');
    setShopName('');
    setShowAdvanced(false);
  };

  const formatPriceLabel = (val: number) => {
    if (val >= 20000000) return '₹2 Cr (Max)';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(val % 10000000 === 0 ? 0 : 2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── TOP HEADER / SEARCH BAR BAR (Web Parity) ── */}
      <View style={styles.headerBar}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search" size={16} color="#1A1A1A" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, services, shops..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters Drawer Toggle Button */}
        <TouchableOpacity
          style={[styles.filtersBtn, (showAdvanced || activeAdvancedCount > 0) && styles.filtersBtnActive]}
          onPress={() => setShowAdvanced(!showAdvanced)}>
          <Ionicons
            name="options-outline"
            size={18}
            color={showAdvanced || activeAdvancedCount > 0 ? '#FFFFFF' : '#1A1A1A'}
          />
          <Text style={[styles.filtersBtnText, (showAdvanced || activeAdvancedCount > 0) && styles.filtersBtnTextActive]}>
            Filters
          </Text>
          {activeAdvancedCount > 0 && (
            <View style={styles.filtersBadge}>
              <Text style={styles.filtersBadgeText}>{activeAdvancedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── TYPE TOGGLE TABS & DISTANCE RADIUS ROW ── */}
      <View style={styles.typeDistanceRow}>
        {/* Type Toggle Tabs (All / Products / Services) */}
        <View style={styles.typeTabsContainer}>
          {[
            { id: 'all', label: 'All', icon: 'grid-outline' },
            { id: 'product', label: 'Products', icon: 'pricetag-outline' },
            { id: 'service', label: 'Services', icon: 'flash-outline' },
          ].map((t) => {
            const active = type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeTab, active && styles.typeTabActive]}
                onPress={() => setType(t.id as any)}>
                <Ionicons name={t.icon as any} size={12} color={active ? '#1A1A1A' : '#64748B'} />
                <Text style={[styles.typeTabText, active && styles.typeTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Distance Selector Pill */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.distanceScroll}>
          {DISTANCE_VALUES.map((d) => {
            const isSelected = distance === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.distanceChip, isSelected && styles.distanceChipActive]}
                onPress={() => setDistance(d.value)}>
                <Text style={[styles.distanceChipText, isSelected && styles.distanceChipTextActive]}>
                  📍 {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CATEGORY CHIPS BAR & DROPDOWN BTN ── */}
      <View style={styles.categoryBarRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
          <TouchableOpacity
            style={[styles.catChip, selectedChipId === 'all' && category === 'all' && styles.catChipActive]}
            onPress={() => handleSelectChip({ id: 'all' })}>
            <Text style={[styles.catChipText, selectedChipId === 'all' && category === 'all' && styles.catChipTextActive]}>
              All Categories
            </Text>
          </TouchableOpacity>

          {categoryChips.map((chip: any) => {
            const active = selectedChipId === chip.id || category === chip.category;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => handleSelectChip(chip)}>
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.catModalOpenChip}
            onPress={() => {
              setCategorySearchQuery('');
              setCategoryModalVisible(true);
            }}>
            <Ionicons name="grid" size={12} color="#D99A3D" />
            <Text style={styles.catModalOpenChipText}>More Categories ▾</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── MAX BUDGET SLIDER & QUICK PRESETS ROW ── */}
      <View style={styles.budgetRow}>
        <View style={styles.budgetLeft}>
          <Text style={styles.budgetTitle}>Max Budget:</Text>
          <View style={styles.budgetValuePill}>
            <Text style={styles.budgetValueText}>{formatPriceLabel(maxPrice)}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.budgetPresetsScroll}>
            {BUDGET_PRESETS.map((chip) => {
              const isSelected = maxPrice === chip.val;
              return (
                <TouchableOpacity
                  key={chip.val}
                  style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                  onPress={() => setMaxPrice(chip.val)}>
                  <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Offers & Open Now Toggles */}
        <View style={styles.togglesRight}>
          <TouchableOpacity
            style={[styles.togglePill, hasOffers && styles.togglePillActiveOffers]}
            onPress={() => setHasOffers(!hasOffers)}>
            <Ionicons name="flame" size={13} color={hasOffers ? '#B45309' : '#64748B'} />
            <Text style={[styles.togglePillText, hasOffers && styles.togglePillTextActiveOffers]}>
              Offers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.togglePill, openNow && styles.togglePillActiveOpen]}
            onPress={() => setOpenNow(!openNow)}>
            <View style={[styles.greenDot, openNow && { backgroundColor: '#10B981' }]} />
            <Text style={[styles.togglePillText, openNow && styles.togglePillTextActiveOpen]}>
              Open Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── ADVANCED FILTERS COLLAPSIBLE DRAWER (Web Parity) ── */}
      {showAdvanced && (
        <ScrollView style={styles.advancedDrawer} showsVerticalScrollIndicator={false}>
          <View style={styles.drawerInner}>
            {/* 1. Delivery Type */}
            <View style={styles.drawerGroup}>
              <Text style={styles.drawerLabel}>DELIVERY TYPE</Text>
              <View style={styles.chipsWrap}>
                {DELIVERY_OPTIONS.map((dt) => {
                  const isSelected = deliveryType.includes(dt);
                  return (
                    <TouchableOpacity
                      key={dt}
                      style={[styles.drawerChip, isSelected && styles.drawerChipActive]}
                      onPress={() => toggleDeliveryType(dt)}>
                      <Text style={[styles.drawerChipText, isSelected && styles.drawerChipTextActive]}>
                        {dt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Condition */}
            <View style={styles.drawerGroup}>
              <Text style={styles.drawerLabel}>CONDITION</Text>
              <View style={styles.chipsWrap}>
                {CONDITION_OPTIONS.map((c) => {
                  const isSelected = condition === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      style={[styles.drawerChip, isSelected && styles.drawerChipActive]}
                      onPress={() => setCondition(c.value)}>
                      <Text style={[styles.drawerChipText, isSelected && styles.drawerChipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Seller Type */}
            <View style={styles.drawerGroup}>
              <Text style={styles.drawerLabel}>SELLER TYPE</Text>
              <View style={styles.chipsWrap}>
                {SELLER_TYPE_OPTIONS.map((s) => {
                  const isSelected = sellerType === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.drawerChip, isSelected && styles.drawerChipActive]}
                      onPress={() => setSellerType(s.value)}>
                      <Text style={[styles.drawerChipText, isSelected && styles.drawerChipTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Minimum Rating */}
            <View style={styles.drawerGroup}>
              <Text style={styles.drawerLabel}>MINIMUM RATING</Text>
              <View style={styles.chipsWrap}>
                {RATING_OPTIONS.map((r) => {
                  const isSelected = minRating === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.drawerChip, isSelected && styles.drawerChipActive]}
                      onPress={() => setMinRating(r.value)}>
                      <Text style={[styles.drawerChipText, isSelected && styles.drawerChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Shop / Vendor Name Filter */}
            <View style={styles.drawerGroup}>
              <Text style={styles.drawerLabel}>FILTER BY SHOP / VENDOR NAME</Text>
              <TextInput
                style={styles.shopNameInput}
                placeholder="e.g. Kumar Electronics, Sharma Services..."
                placeholderTextColor="#94A3B8"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            {/* Reset All Filters Link */}
            <TouchableOpacity style={styles.resetDrawerLink} onPress={resetAllFilters}>
              <Ionicons name="refresh" size={14} color="#EF4444" />
              <Text style={styles.resetDrawerText}>RESET ALL FILTERS</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── SEARCH RESULTS LIST (Web Parity) ── */}
      <FlatList
        ref={flatListRef}
        data={rawListings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.resultsList, { paddingBottom: Math.max(120, insets.bottom + 100) }]}
        refreshControl={
          <RefreshControl refreshing={listingsRefetching} onRefresh={refetchListings} tintColor="#D99A3D" />
        }
        ListHeaderComponent={
          category !== 'all' ? (
            <View style={styles.activeFilterNotice}>
              <Text style={styles.activeFilterNoticeText}>
                Showing results for Category: <Text style={{ fontWeight: '900' }}>{category}</Text>
                {subcategory !== 'all' ? ` › ${subcategory}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCategory('all');
                  setSubcategory('all');
                  setSelectedChipId('all');
                }}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          listingsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#D99A3D" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No matching listings found</Text>
              <Text style={styles.emptySub}>
                Try loosening your filters, distance radius, or budget limit.
              </Text>
              <TouchableOpacity style={styles.resetFilterBtn} onPress={resetAllFilters}>
                <Text style={styles.resetFilterBtnText}>RESET ALL FILTERS</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => {
          const mainImg = getListingImage(item);
          const vendorObj = item.vendor || (item as any).vendorId || {};
          const vendorName = vendorObj.shopName || vendorObj.businessName || vendorObj.name || item.vendorName || 'Verified Supplier';

          let cityText =
            item.city ||
            item.location?.city ||
            vendorObj.city ||
            vendorObj.location?.city ||
            vendorObj.address?.city ||
            'India';

          let distText = '';
          if (item.distance !== undefined && item.distance !== null) {
            distText = `${Number(item.distance).toFixed(1)} km away`;
          }

          return (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => router.push(`/listing/${item._id}`)}>
              {mainImg ? (
                <Image source={{ uri: mainImg }} style={styles.resultImage} contentFit="cover" />
              ) : (
                <View style={styles.resultImageFallback}>
                  <Ionicons name="bag" size={24} color="#94A3B8" />
                </View>
              )}

              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <View style={styles.vendorCityRow}>
                  <Text style={styles.resultVendorName} numberOfLines={1}>
                    {vendorName}
                  </Text>
                  <View style={styles.cityBadge}>
                    <Ionicons name="location" size={10} color="#D99A3D" />
                    <Text style={styles.cityBadgeText}>{cityText}</Text>
                  </View>
                  {!!distText && (
                    <View style={styles.distBadge}>
                      <Text style={styles.distBadgeText}>{distText}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.resultPriceRow}>
                  <Text style={styles.resultPrice}>₹{(item.salePrice || item.price || 0).toLocaleString('en-IN')}</Text>

                  <TouchableOpacity
                    style={styles.addCartSmallBtn}
                    onPress={() => {
                      addToCartMutation.mutate({ listing_id: item._id, quantity: 1 });
                      Alert.alert('Added', `"${item.title}" added to cart!`);
                    }}>
                    <Ionicons name="cart" size={12} color="#1A1A1A" />
                    <Text style={styles.addCartSmallText}>Add +</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          rawListings.length > 0 ? (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageBtn, (!hasPrevPage || currentPage <= 1) && styles.pageBtnDisabled]}
                onPress={() => {
                  if (hasPrevPage && currentPage > 1) {
                    setCurrentPage((prev) => prev - 1);
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }
                }}
                disabled={!hasPrevPage || currentPage <= 1}>
                <Ionicons name="chevron-back" size={16} color={currentPage > 1 ? '#1A1A1A' : '#94A3B8'} />
                <Text style={[styles.pageBtnText, (!hasPrevPage || currentPage <= 1) && styles.pageBtnTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.pageCenterBox}>
                <Text style={styles.pageCenterText}>
                  Page <Text style={{ color: '#D99A3D', fontWeight: '900' }}>{currentPage}</Text> of {totalPagesCount}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.pageBtn, !hasNextPage && styles.pageBtnDisabled]}
                onPress={() => {
                  if (hasNextPage) {
                    setCurrentPage((prev) => prev + 1);
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }
                }}
                disabled={!hasNextPage}>
                <Text style={[styles.pageBtnText, !hasNextPage && styles.pageBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons name="chevron-forward" size={16} color={hasNextPage ? '#1A1A1A' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* ── CATEGORY SELECTION DROPDOWN / MODAL ── */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="grid" size={18} color="#D99A3D" />
                <Text style={styles.modalTitle}>Select Category</Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={16} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Modal Search Bar */}
            <View style={styles.modalSearchRow}>
              <Ionicons name="search" size={16} color="#D99A3D" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search categories (e.g. Electronics, Fashion)..."
                placeholderTextColor="#94A3B8"
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
              />
              {!!categorySearchQuery && (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ flex: 1, marginTop: 10 }}>
              {/* Option 1: All Categories */}
              <TouchableOpacity
                style={[styles.categoryModalItem, category === 'all' && styles.categoryModalItemActive]}
                onPress={() => {
                  setCategory('all');
                  setSubcategory('all');
                  setSelectedChipId('all');
                  setCategoryModalVisible(false);
                }}>
                <Ionicons name="apps-outline" size={18} color={category === 'all' ? '#1A1A1A' : '#D99A3D'} />
                <Text style={[styles.categoryModalItemText, category === 'all' && styles.categoryModalItemTextActive]}>
                  All Categories (Show All Products & Services)
                </Text>
                {category === 'all' && <Ionicons name="checkmark-circle" size={18} color="#1A1A1A" />}
              </TouchableOpacity>

              {/* Category Items */}
              {rawCategories
                .filter((c: any) => {
                  if (!categorySearchQuery.trim()) return true;
                  const q = categorySearchQuery.toLowerCase().trim();
                  return (c.name || '').toLowerCase().includes(q);
                })
                .map((cat: any) => {
                  const catName = cat.name || cat;
                  const isSelected = category === catName;
                  const subs = getSubcategoriesList(cat);

                  return (
                    <View key={cat.id || cat._id || catName} style={{ marginBottom: 6 }}>
                      <TouchableOpacity
                        style={[styles.categoryModalItem, isSelected && styles.categoryModalItemActive]}
                        onPress={() => {
                          setCategory(catName);
                          setSubcategory('all');
                          setSelectedChipId(`cat_${catName.toLowerCase()}`);
                          setCategoryModalVisible(false);
                        }}>
                        <Ionicons name="pricetag-outline" size={16} color={isSelected ? '#1A1A1A' : '#D99A3D'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.categoryModalItemText, isSelected && styles.categoryModalItemTextActive]}>
                            {catName}
                          </Text>
                          {subs.length > 0 && (
                            <Text style={styles.subCountText}>{subs.length} subcategories</Text>
                          )}
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#1A1A1A" />}
                      </TouchableOpacity>

                      {/* Subcategories */}
                      {subs.length > 0 && isSelected && (
                        <View style={styles.subItemsContainer}>
                          {subs.map((subName) => {
                            const isSubSelected = subcategory === subName;
                            return (
                              <TouchableOpacity
                                key={subName}
                                style={[styles.subItemRow, isSubSelected && styles.subItemRowActive]}
                                onPress={() => {
                                  setCategory(catName);
                                  setSubcategory(subName);
                                  setCategoryModalVisible(false);
                                }}>
                                <Ionicons name="return-down-forward" size={13} color={isSubSelected ? '#1A1A1A' : '#D99A3D'} />
                                <Text style={[styles.subItemText, isSubSelected && styles.subItemTextActive]}>
                                  {subName}
                                </Text>
                                {isSubSelected && <Ionicons name="checkmark-circle" size={16} color="#1A1A1A" />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC', // Theme matching Web (#f8f4ec)
  },

  // ── Top Header / Search Box ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3DCCB',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  searchIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#D99A3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
    height: '100%',
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  filtersBtnActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  filtersBtnText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '800',
  },
  filtersBtnTextActive: {
    color: '#FFFFFF',
  },
  filtersBadge: {
    backgroundColor: '#D99A3D',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBadgeText: {
    color: '#1A1A1A',
    fontSize: 10,
    fontWeight: '900',
  },

  // ── Type & Distance Row ──
  typeDistanceRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3DCCB',
    gap: 8,
  },
  typeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F4EC',
    padding: 3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E3DCCB',
    alignSelf: 'flex-start',
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  typeTabActive: {
    backgroundColor: '#D99A3D',
  },
  typeTabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  typeTabTextActive: {
    color: '#1A1A1A',
    fontWeight: '900',
  },
  distanceScroll: {
    gap: 6,
    alignItems: 'center',
  },
  distanceChip: {
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  distanceChipActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  distanceChipText: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // ── Category Chips Bar ──
  categoryBarRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3DCCB',
    paddingVertical: 8,
  },
  categoryChipsScroll: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  catChip: {
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipActive: {
    backgroundColor: '#D99A3D',
    borderColor: '#D99A3D',
  },
  catChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  catChipTextActive: {
    color: '#1A1A1A',
    fontWeight: '900',
  },
  catModalOpenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#D99A3D',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catModalOpenChipText: {
    color: '#D99A3D',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Budget & Toggles Row ──
  budgetRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3DCCB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  budgetLeft: {
    gap: 6,
  },
  budgetTitle: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '800',
  },
  budgetValuePill: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  budgetValueText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
  },
  budgetPresetsScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  presetBtn: {
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presetBtnActive: {
    backgroundColor: '#241B15',
    borderColor: '#241B15',
  },
  presetBtnText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  presetBtnTextActive: {
    color: '#D99A3D',
  },
  togglesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  togglePillActiveOffers: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  togglePillTextActiveOffers: {
    color: '#B45309',
  },
  togglePillActiveOpen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  togglePillTextActiveOpen: {
    color: '#047857',
  },
  togglePillText: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '800',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },

  // ── Advanced Collapsible Drawer ──
  advancedDrawer: {
    maxHeight: 280,
    backgroundColor: 'rgba(248,244,236,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: '#E3DCCB',
  },
  drawerInner: {
    padding: 16,
    gap: 12,
  },
  drawerGroup: {
    gap: 6,
  },
  drawerLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  drawerChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  drawerChipActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  drawerChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  drawerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  shopNameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 38,
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '600',
  },
  resetDrawerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  resetDrawerText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Search Results List ──
  resultsList: {
    padding: 16,
    gap: 12,
  },
  activeFilterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  activeFilterNoticeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  resetFilterBtn: {
    backgroundColor: '#D99A3D',
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  resetFilterBtnText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '900',
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    elevation: 1,
  },
  resultImage: {
    width: 100,
    height: 100,
  },
  resultImageFallback: {
    width: 100,
    height: 100,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  resultTitle: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '800',
  },
  vendorCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultVendorName: {
    color: '#64748B',
    fontSize: 11,
    flex: 1,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(217,154,61,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  cityBadgeText: {
    color: '#D99A3D',
    fontSize: 10,
    fontWeight: '800',
  },
  distBadge: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  distBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  resultPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultPrice: {
    color: '#D99A3D',
    fontSize: 14,
    fontWeight: '900',
  },
  addCartSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D99A3D',
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  addCartSmallText: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '900',
  },

  // ── Pagination ──
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D99A3D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  pageBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  pageBtnText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '900',
  },
  pageBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageCenterBox: {
    alignItems: 'center',
  },
  pageCenterText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 16,
    height: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3DCCB',
  },
  modalTitle: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E3DCCB',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
    marginTop: 12,
  },
  modalSearchInput: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F4EC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E3DCCB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryModalItemActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D99A3D',
  },
  categoryModalItemText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryModalItemTextActive: {
    fontWeight: '900',
    color: '#1A1A1A',
  },
  subCountText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  subItemsContainer: {
    marginLeft: 20,
    marginTop: 4,
    gap: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#D99A3D',
    paddingLeft: 8,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8F4EC',
    borderRadius: Radius.sm,
  },
  subItemRowActive: {
    backgroundColor: '#D99A3D',
  },
  subItemText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  subItemTextActive: {
    color: '#1A1A1A',
    fontWeight: '900',
  },
});
