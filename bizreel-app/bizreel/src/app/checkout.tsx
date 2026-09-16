import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useCart } from '@/features/cart/queries';
import { checkoutCart } from '@/features/cart/api';
import { createOrder } from '@/features/orders/api';
import type { PaymentMethod } from '@/features/orders/types';
import { getListingImage, resolveImageUrl } from '@/utils/image';
import { useAuth } from '@/features/auth/context';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const INPUT_BG = '#F8FAFC';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

function extractItemPrice(item: any): number {
  if (!item) return 0;
  const candidates = [
    item.price,
    item.line_total,
    item.salePrice,
    item.sellingPrice,
    item.offer_price,
    item.actualPrice,
    item.regularPrice,
    item.originalPrice,
    item.rate,
    item.cost,
    item.amount,
    item.pricing?.amount,
    item.pricing?.price,
    item.listing?.salePrice,
    item.listing?.sellingPrice,
    item.listing?.price,
  ];
  for (const c of candidates) {
    const num = Number(c);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }
  return 0;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, status: authStatus } = useAuth();
  const params = useLocalSearchParams<{
    listingId?: string;
    title?: string;
    price?: string;
    image?: string;
    vendorName?: string;
  }>();

  const { data: cart, isLoading, refetch: refetchCart } = useCart();

  const [address, setAddress] = useState(user?.city ? `City: ${user.city}` : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [submitting, setSubmitting] = useState(false);

  const rawPriceParam = params.price;
  const directPrice = parseFloat(rawPriceParam || '0');
  const hasDirectItem = !!(params.title || params.listingId);

  const displayGroups = hasDirectItem
    ? [
        {
          vendor_id: 'direct_vendor',
          vendor: { name: params.vendorName || 'Verified Seller' },
          items: [
            {
              listing_id: params.listingId || 'direct_item',
              title: params.title || 'Product Item',
              quantity: 1,
              price: directPrice,
              line_total: directPrice,
              image: params.image || '',
            },
          ],
          subtotal: directPrice,
        },
      ]
    : cart?.groups && cart.groups.length > 0
    ? cart.groups.map((group: any) => ({
        ...group,
        items: (group.items || []).map((it: any) => {
          const p = extractItemPrice(it);
          const q = Number(it.quantity || 1);
          return {
            ...it,
            price: p,
            line_total: p * q,
          };
        }),
        subtotal: (group.items || []).reduce((sum: number, it: any) => {
          const p = extractItemPrice(it);
          const q = Number(it.quantity || 1);
          return sum + p * q;
        }, 0),
      }))
    : hasDirectItem
    ? [
        {
          vendor_id: 'direct_vendor',
          vendor: { name: params.vendorName || 'Verified Seller' },
          items: [
            {
              listing_id: params.listingId || 'direct_item',
              title: params.title || 'Product Item',
              quantity: 1,
              price: directPrice,
              line_total: directPrice,
              image: params.image || '',
            },
          ],
          subtotal: directPrice,
        },
      ]
    : [];

  const displayTotal = displayGroups.reduce((acc, g) => acc + (g.subtotal || 0), 0);
  const totalItemsCount = displayGroups.reduce(
    (acc, g) => acc + (g.items || []).reduce((iAcc: number, it: any) => iAcc + (it.quantity || 1), 0),
    0
  );
  const DELIVERY_FEE = 40;
  const grandTotal = displayTotal > 0 ? displayTotal + DELIVERY_FEE : 0;

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Delivery Address Required', 'Please enter your complete delivery address before placing your order.');
      return;
    }

    setSubmitting(true);

    try {
      if (params.listingId) {
        // Direct single item purchase
        await createOrder({
          listingId: params.listingId as string,
          quantity: Number((params as any).quantity || 1),

          address: address.trim(),
          paymentMethod,
        });
      } else {
        // Full shopping cart checkout with delivery fee
        await checkoutCart({
          address: address.trim(),
          paymentMethod,
          shippingCharges: 40,
        });
        await refetchCart();

      }

      Alert.alert(
        '🎉 Order Placed Successfully!',
        'Your order request has been created and sent to the vendor(s). You can track status in My Orders.',
        [
          {
            text: 'View My Orders',
            onPress: () => router.replace('/orders'),
          },
        ]
      );
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.detail || err?.message;
      const isStockError = serverMsg && (serverMsg.toLowerCase().includes('stock') || serverMsg.toLowerCase().includes('quantity') || serverMsg.toLowerCase().includes('available'));
      const alertTitle = isStockError ? '⚠️ Stock & Availability Notice' : 'Checkout Notice';
      const alertMsg = serverMsg || 'Could not place order. Please check supplier details and try again.';

      Alert.alert(alertTitle, alertMsg, [{ text: 'OK' }]);
    } finally {

      setSubmitting(false);
    }
  };


  if (isLoading && !hasDirectItem) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Preparing checkout...</Text>
      </View>
    );
  }

  if (authStatus === 'unauthed' || !user) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="lock-closed" size={32} color={ESPRESSO} />
        </View>
        <Text style={styles.emptyTitle}>Sign In to Complete Checkout</Text>
        <Text style={styles.emptySub}>Please sign in to your account to place your order and set delivery details.</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.browseBtnText}>LOG IN / REGISTER</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (displayGroups.length === 0 && !hasDirectItem) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="basket" size={32} color={ESPRESSO} />
        </View>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySub}>Add products or services to your cart to proceed with instant checkout.</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.browseBtnText}>EXPLORE PRODUCTS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>FAST &amp; SECURE CHECKOUT</Text>
          <Text style={styles.headerTitle}>ORDER SUMMARY</Text>
        </View>
        <View style={styles.headerStepPill}>
          <Text style={styles.headerStepText}>{totalItemsCount} Items</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Recipient Quick Info Banner */}
        <View style={styles.bannerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerBadge}>PURCHASER DETAILS</Text>
            <Text style={styles.bannerName}>{user?.name || 'Customer'}</Text>
            <Text style={styles.bannerSub}>{user?.email || (user as any)?.phone || (user as any)?.mobile || 'Contact Verified'}</Text>
          </View>
          <View style={styles.bannerIconBox}>
            <Ionicons name="person-circle" size={26} color={ESPRESSO} />
          </View>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Delivery &amp; Shipping Address</Text>
          </View>
          <Text style={styles.label}>Street Address &amp; Pincode *</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="House / Flat No., Building, Street Name, City & Pincode"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>2</Text>
            </View>
            <Text style={styles.cardTitle}>Ordered Items ({totalItemsCount})</Text>
          </View>

          {displayGroups.map((group) => (
            <View key={group.vendor_id} style={styles.vendorBlock}>
              <View style={styles.vendorHeaderRow}>
                <Ionicons name="storefront-outline" size={14} color={GOLD} />
                <Text style={styles.vendorName}>{group.vendor?.name || 'Verified Seller'}</Text>
              </View>

              {group.items.map((item: any) => {
                const itemImg = resolveImageUrl(item.image) || getListingImage(item);
                const itemPrice = extractItemPrice(item);
                return (
                  <View key={item.listing_id} style={styles.summaryItemRow}>
                    {itemImg ? (
                      <Image source={{ uri: itemImg }} style={styles.itemThumb} contentFit="cover" />
                    ) : (
                      <View style={styles.itemThumbFallback}>
                        <Ionicons name="cube-outline" size={20} color={TEXT_MUTED} />
                      </View>
                    )}

                    <View style={styles.itemInfo}>
                      <Text style={styles.summaryItemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.itemMetaRow}>
                        <Text style={styles.itemQtyPrice}>
                          ₹{itemPrice.toLocaleString('en-IN')} × {item.quantity || 1}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.summaryItemPrice}>₹{(item.line_total || itemPrice).toLocaleString('en-IN')}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Payment Method Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>3</Text>
            </View>
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('cod')}
            activeOpacity={0.85}>
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIconBox, paymentMethod === 'cod' && styles.paymentIconBoxSelected]}>
                <Ionicons name="cash-outline" size={18} color={paymentMethod === 'cod' ? GOLD : ESPRESSO} />
              </View>
              <View>
                <Text style={styles.paymentText}>Cash on Delivery / Vendor Direct</Text>
                <Text style={styles.paymentSubText}>Pay directly to vendor upon order delivery</Text>
              </View>
            </View>
            {paymentMethod === 'cod' && (
              <Ionicons name="checkmark-circle" size={22} color={GOLD} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('wallet')}
            activeOpacity={0.85}>
            <View style={styles.paymentOptionLeft}>
              <View style={[styles.paymentIconBox, paymentMethod === 'wallet' && styles.paymentIconBoxSelected]}>
                <Ionicons name="wallet-outline" size={18} color={paymentMethod === 'wallet' ? GOLD : ESPRESSO} />
              </View>
              <View>
                <Text style={styles.paymentText}>BizReels Wallet Balance</Text>
                <Text style={styles.paymentSubText}>Use available wallet credits for instant checkout</Text>
              </View>
            </View>
            {paymentMethod === 'wallet' && (
              <Ionicons name="checkmark-circle" size={22} color={GOLD} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bill Summary Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bill Summary &amp; Taxes</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billValue}>₹{displayTotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Shipping &amp; Delivery</Text>
            <Text style={styles.billValue}>₹{DELIVERY_FEE}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Guarantee Fee</Text>
            <Text style={[styles.billValue, { color: '#059669' }]}>₹0 (Waived)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalBillRow}>
            <Text style={styles.totalBillLabel}>Grand Total</Text>
            <Text style={styles.totalBillValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Guarantee Banner */}
        <View style={styles.guaranteeBox}>
          <Ionicons name="shield-checkmark" size={18} color="#059669" />
          <Text style={styles.guaranteeText}>
            100% Direct Verified Vendor Purchase • Protected by BizReels Guarantee
          </Text>
        </View>
      </ScrollView>

      {/* Place Order Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.85}>
          {submitting ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <View style={styles.placeOrderRow}>
              <Ionicons name="lock-closed" size={16} color={GOLD} />
              <Text style={styles.placeOrderBtnText}>
                CONFIRM &amp; PLACE ORDER • ₹{grandTotal.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_MATTE,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: ESPRESSO,
    fontSize: FontSize.base,
    fontWeight: '900',
  },
  emptySub: {
    color: TEXT_MUTED,
    fontSize: FontSize.xs,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: ESPRESSO,
    paddingHorizontal: Spacing.five,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ESPRESSO,
    marginTop: Spacing.two,
  },
  browseBtnText: {
    color: GOLD,
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 1,
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
    gap: Spacing.three,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },
  headerStepPill: { backgroundColor: '#1A1410', borderWidth: 1, borderColor: '#3A2C22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  headerStepText: { color: GOLD, fontSize: 10, fontWeight: '900' },

  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 120,
    gap: Spacing.four,
  },

  bannerCard: {
    backgroundColor: ESPRESSO,
    borderRadius: 14,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#3A2C22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  bannerBadge: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  bannerName: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', marginTop: 2 },
  bannerSub: { color: '#CBD5E1', fontSize: FontSize.xs, marginTop: 1 },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: Spacing.two,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 10,
    marginBottom: 4,
  },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: ESPRESSO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: { color: GOLD, fontSize: 11, fontWeight: '900' },
  cardTitle: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: { color: '#334155', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  addressInput: {
    backgroundColor: INPUT_BG,
    color: TEXT_MAIN,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: Spacing.three,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlignVertical: 'top',
    minHeight: 80,
  },

  vendorBlock: {
    gap: 8,
    marginTop: 4,
  },
  vendorHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BG_MATTE, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: BORDER_COLOR },
  vendorName: {
    color: ESPRESSO,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: 4,
  },
  itemThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  itemThumbFallback: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  summaryItemTitle: {
    color: TEXT_MAIN,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemQtyPrice: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryItemPrice: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: INPUT_BG,
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  paymentOptionSelected: {
    borderColor: GOLD,
    backgroundColor: '#FFFDF9',
    borderWidth: 2,
  },
  paymentOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flex: 1 },
  paymentIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconBoxSelected: {
    backgroundColor: ESPRESSO,
    borderColor: ESPRESSO,
  },
  paymentText: {
    color: TEXT_MAIN,
    fontSize: FontSize.xs,
    fontWeight: '900',
  },
  paymentSubText: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 1,
  },

  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  billLabel: {
    color: TEXT_MUTED,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  billValue: {
    color: TEXT_MAIN,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  freeTag: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#059669', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  freeTagText: { color: '#059669', fontSize: 9.5, fontWeight: '900' },

  divider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 6 },

  totalBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalBillLabel: {
    color: ESPRESSO,
    fontSize: FontSize.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  totalBillValue: {
    color: GOLD,
    fontSize: FontSize.lg,
    fontWeight: '900',
  },

  guaranteeBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guaranteeText: { color: '#065F46', fontSize: 10.5, fontWeight: '800', flex: 1, lineHeight: 15 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CARD_BG,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  placeOrderBtn: {
    backgroundColor: ESPRESSO,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ESPRESSO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeOrderBtnText: {
    color: GOLD,
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

