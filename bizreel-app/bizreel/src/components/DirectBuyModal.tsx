import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

import { BrandColors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { createOrder } from '@/features/orders/api';
import { api } from '@/lib/api';
import { getListingImage, resolveImageUrl } from '@/utils/image';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const WARM_BG = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const MUTED_TEXT = '#7A6E65';
const INPUT_BG = '#FDFBF7';

export function extractModalPrice(item: any): number {
  if (!item) return 0;
  const candidates = [
    item.sellingPrice,
    item.salePrice,
    item.price,
    item.offer_price,
    item.actualPrice,
    item.regularPrice,
    item.originalPrice,
    item.rate,
    item.cost,
    item.amount,
    item.taggedListing?.sellingPrice,
    item.taggedListing?.salePrice,
    item.taggedListing?.price,
    item.taggedListing?.offer_price,
    item.taggedListing?.actualPrice,
    item.listing?.sellingPrice,
    item.listing?.salePrice,
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

interface DirectBuyModalProps {
  visible: boolean;
  onClose: () => void;
  item: any;
  onSuccess?: () => void;
}

export default function DirectBuyModal({ visible, onClose, item, onSuccess }: DirectBuyModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [pincode, setPincode] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet' | 'upi'>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [fetchedPrice, setFetchedPrice] = useState<number>(0);
  const [fetchedListing, setFetchedListing] = useState<any>(null);

  // Extract specific selected product & metadata
  const targetProduct =
    item?.selectedProduct ||
    (typeof item?.taggedListing === 'object' ? item?.taggedListing : null) ||
    (typeof item?.targetListing === 'object' ? item?.targetListing : null) ||
    item?.listing ||
    fetchedListing ||
    item ||
    {};

  const rawListingId =
    targetProduct?._id ||
    targetProduct?.id ||
    (typeof item?.taggedListing === 'string' ? item?.taggedListing : null) ||
    (typeof item?.targetListing === 'string' ? item?.targetListing : null) ||
    item?._id ||
    item?.id ||
    item?.listing_id;

  const listingIdStr = typeof rawListingId === 'string' ? rawListingId : rawListingId?.toString();

  const initialPrice = extractModalPrice(targetProduct);

  // If price is 0 from initial item, fetch listing details from API
  useEffect(() => {
    if (visible) {
      setOrderPlaced(false);
      setQuantity(1);

      const p = extractModalPrice(targetProduct);
      setFetchedPrice(p);

      if (p === 0 && listingIdStr && listingIdStr.length === 24) {
        api.get(`/listings/${listingIdStr}`)
          .then(({ data }) => {
            const lData = data.data || data;
            setFetchedListing(lData);
            const fetchedP = extractModalPrice(lData);
            if (fetchedP > 0) {
              setFetchedPrice(fetchedP);
            }
          })
          .catch(() => null);
      }

      // Prefill user profile address details
      api.get('/users/me')
        .then(({ data }) => {
          const u = data.data?.user || data.user || data;
          if (u) {
            setCustomerName(u.name || '');
            setCustomerPhone(u.phone || u.mobile || u.mobileNumber || '');
            setStreetAddress(u.location?.address || u.customerProfile?.address || u.address || '');
            setCity(u.location?.city || u.city || '');
            setStateVal(u.location?.state || u.state || '');
            setPincode(u.location?.pincode || u.pincode || '');
          }
        })
        .catch(() => null);
    }
  }, [visible, item, listingIdStr]);

  const targetItem = fetchedListing || targetProduct;
  const activePrice = fetchedPrice > 0 ? fetchedPrice : extractModalPrice(targetItem);
  const originalPrice = Number(targetItem.actualPrice || targetItem.regularPrice || targetItem.mrp || (activePrice > 0 ? Math.round(activePrice * 1.25) : 0));
  const hasDiscount = originalPrice > activePrice && activePrice > 0;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - activePrice) / originalPrice) * 100) : 0;

  const itemTitle = targetItem.title || item?.caption || 'Featured Product Item';
  const itemImage = resolveImageUrl(targetItem.images?.[0]?.url || item?.thumbnailUrl || (item?.mediaUrls && item?.mediaUrls[0])) || getListingImage(targetItem);
  const vendorObj = targetItem.vendor || targetItem.vendorId || item?.vendor || item?.creator || {};
  const vendorName = vendorObj.shopName || vendorObj.businessName || vendorObj.name || item?.creatorName || 'Verified Supplier';

  const DELIVERY_FEE = 40;
  const totalPrice = activePrice * quantity;
  const grandTotal = totalPrice > 0 ? totalPrice + DELIVERY_FEE : 0;

  const { user } = useAuth();

  const handlePlaceOrder = async () => {
    if (!user) {
      onClose();
      Alert.alert(
        'Login Required',
        'Please log in or create an account to complete your order checkout.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !streetAddress.trim() || !city.trim() || !stateVal.trim() || !pincode.trim()) {
      Alert.alert('Delivery Address Incomplete', 'Please fill in all standard address details: Name, Mobile, Street Address, City, State, and Pincode.');
      return;
    }

    const fullAddressString = `${customerName.trim()} | Ph: ${customerPhone.trim()}\n${streetAddress.trim()}, ${city.trim()}, ${stateVal.trim()} - ${pincode.trim()}`;

    setSubmitting(true);
    try {
      if (listingIdStr) {
        await createOrder({
          listingId: listingIdStr,
          quantity,
          address: fullAddressString,
          pincode: pincode.trim(),
          paymentMethod: paymentMethod === 'wallet' ? 'wallet' : 'cod',
        });
      }

      setOrderPlaced(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.detail || err?.message;
      const isStockError = serverMsg && (serverMsg.toLowerCase().includes('stock') || serverMsg.toLowerCase().includes('quantity') || serverMsg.toLowerCase().includes('available'));
      const alertTitle = isStockError ? '⚠️ Stock & Availability Notice' : 'Order Notice';
      const alertMsg = serverMsg || 'Failed to place order. Please try again.';

      Alert.alert(alertTitle, alertMsg, [{ text: 'OK' }]);
    } finally {

      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />

        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header Bar matching Warm Editorial Flow */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="cube" size={18} color={GOLD} />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Order Checkout & Payment</Text>
                <Text style={styles.sheetSubtitle}>Direct Verified Transaction with {vendorName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={ESPRESSO} />
            </TouchableOpacity>
          </View>

          {orderPlaced ? (
            /* Order Success View */
            <View style={styles.successBox}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
              </View>
              <Text style={styles.successTitle}>Order Placed Successfully!</Text>
              <Text style={styles.successSub}>
                Your order for <Text style={{ color: GOLD, fontWeight: '900' }}>"{itemTitle}"</Text> has been placed with {vendorName}.
              </Text>
              <TouchableOpacity
                style={styles.viewOrdersBtn}
                onPress={() => {
                  onClose();
                  router.replace('/orders');
                }}>
                <Text style={styles.viewOrdersText}>View My Orders</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Direct Order Form */
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
              {/* Product Info Card */}
              <View style={styles.productCard}>
                {itemImage ? (
                  <Image source={{ uri: itemImage }} style={styles.productThumb} contentFit="cover" />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="cube-outline" size={24} color={MUTED_TEXT} />
                  </View>
                )}

                <View style={styles.productInfo}>
                  <Text style={styles.vendorTag}>{vendorName}</Text>
                  <Text style={styles.productTitle} numberOfLines={2}>{itemTitle}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.activePrice}>₹{activePrice.toLocaleString('en-IN')}</Text>
                    {hasDiscount && (
                      <>
                        <Text style={styles.originalPrice}>₹{originalPrice.toLocaleString('en-IN')}</Text>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Quantity Stepper */}
              <View style={styles.cardSection}>
                <Text style={styles.sectionLabel}>Select Quantity</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                    <Text style={styles.stepperBtnText}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{quantity}</Text>

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuantity((q) => Math.min(99, q + 1))}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Standard E-Commerce Delivery Address */}
              <View style={styles.cardSection}>
                <View style={styles.labelHeader}>
                  <Ionicons name="location-outline" size={16} color={GOLD} />
                  <Text style={styles.sectionLabel}>1. DELIVERY ADDRESS DETAILS</Text>
                </View>

                <View style={{ gap: 8 }}>
                  {/* Name & Mobile Number */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.smallInput, { flex: 1 }]}
                      placeholder="Full Name *"
                      placeholderTextColor="#9A8E85"
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                    <TextInput
                      style={[styles.smallInput, { flex: 1 }]}
                      placeholder="Mobile Number *"
                      placeholderTextColor="#9A8E85"
                      keyboardType="phone-pad"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                  </View>

                  {/* House No., Building, Street */}
                  <TextInput
                    style={styles.addressInput}
                    placeholder="House No., Building, Street, Area *"
                    placeholderTextColor="#9A8E85"
                    multiline
                    numberOfLines={2}
                    value={streetAddress}
                    onChangeText={setStreetAddress}
                  />

                  {/* City, State, Pincode */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput
                      style={[styles.smallInput, { flex: 1 }]}
                      placeholder="Town / City *"
                      placeholderTextColor="#9A8E85"
                      value={city}
                      onChangeText={setCity}
                    />
                    <TextInput
                      style={[styles.smallInput, { flex: 1 }]}
                      placeholder="State *"
                      placeholderTextColor="#9A8E85"
                      value={stateVal}
                      onChangeText={setStateVal}
                    />
                    <TextInput
                      style={[styles.smallInput, { width: 85 }]}
                      placeholder="Pincode *"
                      placeholderTextColor="#9A8E85"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={pincode}
                      onChangeText={setPincode}
                    />
                  </View>
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.cardSection}>
                <Text style={styles.sectionLabel}>Payment Option</Text>

                <TouchableOpacity
                  style={[styles.paymentCard, paymentMethod === 'cod' && styles.paymentCardActive]}
                  onPress={() => setPaymentMethod('cod')}>
                  <Ionicons name="cash-outline" size={20} color={paymentMethod === 'cod' ? GOLD : ESPRESSO} />
                  <Text style={[styles.paymentTitle, paymentMethod === 'cod' && styles.paymentTitleActive]}>Cash on Delivery / Direct Supplier Pay</Text>
                  {paymentMethod === 'cod' && <Ionicons name="checkmark-circle" size={18} color={GOLD} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paymentCard, paymentMethod === 'wallet' && styles.paymentCardActive]}
                  onPress={() => setPaymentMethod('wallet')}>
                  <Ionicons name="wallet-outline" size={20} color={paymentMethod === 'wallet' ? GOLD : ESPRESSO} />
                  <Text style={[styles.paymentTitle, paymentMethod === 'wallet' && styles.paymentTitleActive]}>BizReels Wallet Balance</Text>
                  {paymentMethod === 'wallet' && <Ionicons name="checkmark-circle" size={18} color={GOLD} />}
                </TouchableOpacity>
              </View>

              {/* Price Details Breakdown matching Web */}
              <View style={styles.summaryCard}>
                <Text style={styles.priceDetailsHeading}>PRICE DETAILS</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price ({quantity} {quantity === 1 ? 'item' : 'items'})</Text>
                  <Text style={styles.summaryVal}>₹{totalPrice.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Charges</Text>
                  <Text style={styles.summaryVal}>₹{DELIVERY_FEE}</Text>
                </View>

                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                  <Text style={styles.totalVal}>₹{grandTotal.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Place Order CTA Button */}
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
                onPress={handlePlaceOrder}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color={GOLD} />
                    <Text style={styles.confirmBtnText}>Place Order (₹{grandTotal.toLocaleString('en-IN')})</Text>
                  </>
                )}
              </TouchableOpacity>

            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36,27,21,0.6)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: WARM_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 154, 61, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 61, 0.3)',
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  flipkartTag: {
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  flipkartTagText: {
    color: ESPRESSO,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sheetSubtitle: {
    color: '#D4C9BF',
    fontSize: 10,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },

  productCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    backgroundColor: CARD_BG,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
  },
  productThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: WARM_BG,
  },
  thumbFallback: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: WARM_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  vendorTag: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
  },
  productTitle: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  activePrice: {
    color: ESPRESSO,
    fontSize: FontSize.base,
    fontWeight: '900',
  },
  originalPrice: {
    color: MUTED_TEXT,
    fontSize: FontSize.xs,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: 'rgba(217, 154, 61, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
  },

  cardSection: {
    gap: Spacing.two,
  },
  labelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ESPRESSO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: GOLD,
    fontSize: FontSize.lg,
    fontWeight: '900',
  },
  quantityText: {
    color: ESPRESSO,
    fontSize: FontSize.base,
    fontWeight: '900',
    minWidth: 32,
    textAlign: 'center',
  },

  smallInput: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '600',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    height: 42,
  },
  addressInput: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '600',
    padding: Spacing.three,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.three,
  },
  paymentCardActive: {
    borderColor: ESPRESSO,
    backgroundColor: '#FAF7F0',
    borderWidth: 1.5,
  },
  paymentTitle: {
    flex: 1,
    color: MUTED_TEXT,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  paymentTitleActive: {
    color: ESPRESSO,
    fontWeight: '900',
  },

  summaryCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.three,
    gap: 8,
  },
  priceDetailsHeading: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 6,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: MUTED_TEXT,
    fontSize: FontSize.xs,
  },
  summaryVal: {
    color: ESPRESSO,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  totalLabel: {
    color: ESPRESSO,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
  totalVal: {
    color: GOLD,
    fontSize: FontSize.base,
    fontWeight: '900',
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  savingsPillText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },

  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: ESPRESSO,
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.two,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '900',
  },

  successBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.three,
  },
  successBadge: {
    marginBottom: Spacing.two,
  },
  successTitle: {
    color: ESPRESSO,
    fontSize: FontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  successSub: {
    color: MUTED_TEXT,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewOrdersBtn: {
    backgroundColor: ESPRESSO,
    borderRadius: 14,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    marginTop: Spacing.three,
  },
  viewOrdersText: {
    color: GOLD,
    fontSize: FontSize.sm,
    fontWeight: '900',
  },
});
