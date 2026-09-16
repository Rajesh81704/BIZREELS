import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { useCart, useRemoveFromCart, useUpdateCartQuantity } from '@/features/cart/queries';
import { getListingImage, resolveImageUrl } from '@/utils/image';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MUTED = '#7A6E65';
const DELIVERY_FEE = 40;

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, status: authStatus } = useAuth();

  const { data: cart, isLoading } = useCart();
  const updateQuantityMutation = useUpdateCartQuantity();
  const removeItemMutation = useRemoveFromCart();

  const groups = cart?.groups || [];
  const rawSubtotal = cart?.total_amount || 0;
  const totalItems = cart?.total_items || 0;
  const grandTotal = rawSubtotal > 0 ? rawSubtotal + DELIVERY_FEE : 0;

  const handleUpdateQuantity = (listingId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) {
      handleRemoveItem(listingId);
    } else {
      updateQuantityMutation.mutate({ listingId, quantity: newQty });
    }
  };

  const handleRemoveItem = (listingId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this product from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItemMutation.mutate(listingId),
        },
      ]
    );
  };

  if (authStatus === 'unauthed' || !user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={ESPRESSO} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SHOPPING CART</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="cart" size={32} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Sign In to Access Your Cart</Text>
          <Text style={styles.emptySub}>
            Please sign in to your BizReels account to view your cart items, save listings, and place orders.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.exploreBtnText}>Log In / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ESPRESSO} />
        <Text style={styles.loadingText}>Fetching your cart items...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Espresso Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={ESPRESSO} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerBadge}>ORDER BAG</Text>
          <Text style={styles.headerTitle}>SHOPPING CART ({totalItems})</Text>
        </View>
        <View style={styles.headerStepPill}>
          <Text style={styles.headerStepText}>{groups.length} Vendors</Text>
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="bag-handle-outline" size={36} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySub}>Explore products and services on BizReels to start adding items from local verified suppliers!</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.exploreBtnText}>Explore Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={groups}
            keyExtractor={(item) => item.vendor_id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: group }) => (
              <View style={styles.vendorGroupCard}>
                {/* Vendor Header Pill */}
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorIconBox}>
                    <Ionicons name="storefront" size={14} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vendorName} numberOfLines={1}>
                      {group.vendor?.name || (group.vendor as any)?.shopName || 'Verified Supplier'}
                    </Text>

                    <Text style={styles.vendorItemCount}>{group.items?.length || 1} item(s) in group</Text>
                  </View>
                  <View style={styles.vendorSubtotalBadge}>
                    <Text style={styles.vendorSubtotalText}>₹{group.subtotal.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Items List */}
                {group.items.map((item: any, idx: number) => {
                  const itemImg = resolveImageUrl(item.image) || getListingImage(item);
                  const priceVal = Number(item.price || item.line_total || 0);
                  const itemTotal = priceVal * (item.quantity || 1);
                  const isLast = idx === group.items.length - 1;

                  return (
                    <View
                      key={item.listing_id}
                      style={[styles.itemRow, !isLast && { borderBottomWidth: 1, borderBottomColor: BORDER_COLOR }]}>
                      {/* Product Thumbnail (Clickable) */}
                      <TouchableOpacity onPress={() => router.push(`/listing/${item.listing_id}`)}>
                        {itemImg ? (
                          <Image source={{ uri: itemImg }} style={styles.itemImage} contentFit="cover" />
                        ) : (
                          <View style={styles.itemImageFallback}>
                            <Ionicons name="cube-outline" size={22} color={TEXT_MUTED} />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Product Details (Clickable) */}
                      <TouchableOpacity
                        style={styles.itemDetails}
                        onPress={() => router.push(`/listing/${item.listing_id}`)}>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.itemPrice}>₹{priceVal.toLocaleString('en-IN')}</Text>
                          <Text style={styles.eachText}>per unit</Text>
                        </View>
                        <Text style={styles.lineTotalText}>Subtotal: ₹{itemTotal.toLocaleString('en-IN')}</Text>
                      </TouchableOpacity>

                      {/* Quantity Stepper & Remove Trash Button */}
                      <View style={styles.actionsColumn}>
                        {/* Remove Trash Button */}
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => handleRemoveItem(item.listing_id)}
                          disabled={removeItemMutation.isPending}>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>

                        {/* Quantity Stepper */}
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleUpdateQuantity(item.listing_id, item.quantity, -1)}
                            disabled={updateQuantityMutation.isPending}>
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>

                          <Text style={styles.qtyText}>{item.quantity}</Text>

                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleUpdateQuantity(item.listing_id, item.quantity, 1)}
                            disabled={updateQuantityMutation.isPending}>
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            ListFooterComponent={
              <View style={styles.deliveryNoticeCard}>
                <Ionicons name="car-outline" size={18} color={GOLD} />
                <Text style={styles.deliveryNoticeText}>
                  Standard ₹{DELIVERY_FEE} Express Delivery applied per order.
                </Text>
              </View>

            }
          />

          {/* Bottom Checkout Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalSubLabel}>Total Amount (Inc. Delivery)</Text>
                <Text style={styles.totalPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => router.push('/checkout')}
                activeOpacity={0.85}>
                <Ionicons name="flash" size={16} color={ESPRESSO} />
                <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_MATTE,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_MATTE,
    gap: Spacing.three,
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  headerStepPill: {
    backgroundColor: 'rgba(217, 154, 61, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 61, 0.3)',
  },
  headerStepText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
  },
  listContent: {
    padding: Spacing.four,
    paddingBottom: 130,
    gap: Spacing.three,
  },

  vendorGroupCard: {
    backgroundColor: CARD_BG,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: Spacing.two,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ESPRESSO,
    padding: Spacing.two,
    borderRadius: 12,
  },
  vendorIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(217, 154, 61, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorName: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  vendorItemCount: {
    color: '#D4C9BF',
    fontSize: 9,
  },
  vendorSubtotalBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vendorSubtotalText: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: BG_MATTE,
  },
  itemImageFallback: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    lineHeight: 18,
  },
  itemPrice: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  eachText: {
    color: TEXT_MUTED,
    fontSize: 10,
  },
  lineTotalText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },

  actionsColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  trashBtn: {
    padding: 4,
  },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 2,
    gap: 4,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ESPRESSO,
  },
  qtyBtnText: {
    color: GOLD,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  qtyText: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    minWidth: 20,
    textAlign: 'center',
  },

  deliveryNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.three,
  },
  deliveryNoticeText: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: ESPRESSO,
    fontSize: FontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySub: {
    color: TEXT_MUTED,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  exploreBtn: {
    backgroundColor: ESPRESSO,
    borderRadius: 14,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  exploreBtnText: {
    color: GOLD,
    fontWeight: '900',
    fontSize: FontSize.xs,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ESPRESSO,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSubLabel: {
    color: '#D4C9BF',
    fontSize: 10,
    fontWeight: '700',
  },
  totalPrice: {
    color: GOLD,
    fontSize: FontSize.lg,
    fontWeight: '900',
  },
  checkoutBtn: {
    flexDirection: 'row',
    backgroundColor: GOLD,
    borderRadius: 14,
    height: 44,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkoutBtnText: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

