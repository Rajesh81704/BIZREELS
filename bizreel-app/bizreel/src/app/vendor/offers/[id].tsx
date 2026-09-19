/**
 * Dedicated Dynamic Offer & Coupon Detail View Screen — Mobile Application
 * Implements full 19-Type Offer Engine rules breakdown, live coupon validation testing tool, analytics & controls.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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

import { OFFER_CATEGORIES } from '@/constants/offerCategories';
import { FontSize, FontWeight, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  useDeleteVendorOffer,
  useDuplicateVendorOffer,
  useTestValidateCoupon,
  useToggleVendorOfferStatus,
  useVendorOfferDetails,
} from '@/features/vendor-offers/queries';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_COLOR = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function SingleOfferDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const offerId = Array.isArray(id) ? id[0] : id;

  const { data: offerData, isLoading, refetch } = useVendorOfferDetails(offerId);

  const toggleStatusMutation = useToggleVendorOfferStatus();
  const duplicateMutation = useDuplicateVendorOffer();
  const deleteMutation = useDeleteVendorOffer();
  const validateCouponMutation = useTestValidateCoupon();

  // Test Coupon validation state
  const [testSubtotal, setTestSubtotal] = useState('1000');
  const [testResult, setTestResult] = useState<any>(null);

  const offer: any = offerData || {};
  const catMeta = OFFER_CATEGORIES[offer.category || 'discount'] || {
    label: offer.offerName || 'Custom Offer',
    icon: 'pricetag',
    bg: '#FEF3C7',
    color: '#D97706',
    description: 'Special Promotional Deal',
  };

  const isActive = offer.status === 'active' || offer.is_active === true;
  const couponCode = offer.couponCode || offer.code || 'NO-CODE';
  const config = offer.config || {};

  const handleToggleStatus = async () => {
    try {
      await toggleStatusMutation.mutateAsync(offerId!);
      Alert.alert('Status Updated', `Offer is now ${isActive ? 'Paused' : 'Active'}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDuplicate = async () => {
    Alert.alert('Duplicate Offer', 'Create a copy of this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            await duplicateMutation.mutateAsync(offerId!);
            Alert.alert('Success ✨', 'Offer duplicated successfully!');
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to duplicate offer');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Offer ⚠️',
      'Are you sure you want to delete this promotional offer? Active customer carts may be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(offerId!);
              Alert.alert('Deleted', 'Offer has been removed.');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete offer');
            }
          },
        },
      ]
    );
  };

  const handleRunValidationTest = async () => {
    const subtotalNum = Number(testSubtotal);
    if (isNaN(subtotalNum) || subtotalNum <= 0) {
      Alert.alert('Invalid Test Amount', 'Please enter a valid order subtotal amount in ₹.');
      return;
    }
    try {
      const res = await validateCouponMutation.mutateAsync({
        id: offerId!,
        payload: {
          couponCode: couponCode,
          orderSubtotal: subtotalNum,
        },
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        valid: false,
        error: err?.response?.data?.message || 'Coupon validation failed for given conditions.',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Fetching Offer Engine Details...</Text>
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
          {offer.title || 'Dynamic Offer Engine'}
        </Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleDuplicate}>
          <Ionicons name="copy-outline" size={20} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Badge & Status */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={[styles.categoryPill, { backgroundColor: (catMeta as any).bg || '#FEF3C7' }]}>
              <Ionicons name={catMeta.icon as any} size={14} color={(catMeta as any).color || '#D97706'} />
              <Text style={[styles.categoryPillText, { color: (catMeta as any).color || '#D97706' }]}>
                {catMeta.label.toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity onPress={handleToggleStatus} style={styles.statusChip}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? '#22C55E' : '#F59E0B' },
                ]}
              />
              <Text style={styles.statusText}>{isActive ? 'ACTIVE' : 'PAUSED'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.offerTitle}>{offer.title || offer.offerName}</Text>
          {offer.description ? (
            <Text style={styles.offerDescription}>{offer.description}</Text>
          ) : null}

          {/* Code Highlight Box */}
          {couponCode ? (
            <View style={styles.couponBox}>
              <View>
                <Text style={styles.couponBoxLbl}>COUPON CODE</Text>
                <Text style={styles.couponCodeText}>{couponCode}</Text>
              </View>
              <View style={styles.couponBadge}>
                <Ionicons name="checkmark-circle-outline" size={16} color={GOLD} />
                <Text style={styles.couponBadgeText}>Verified</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Dynamic Offer Rules & Engine Parameters */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Offer Engine Configuration</Text>
          <View style={styles.divider} />

          <View style={styles.configGrid}>
            <View style={styles.configItem}>
              <Text style={styles.configKey}>Discount Type:</Text>
              <Text style={styles.configVal}>
                {config.discountType === 'percent'
                  ? `${config.discountValue || offer.discountPct || 0}% OFF`
                  : `Flat ₹${config.discountValue || offer.discountValue || 0} OFF`}
              </Text>
            </View>

            {config.minOrderValue ? (
              <View style={styles.configItem}>
                <Text style={styles.configKey}>Minimum Order Subtotal:</Text>
                <Text style={styles.configVal}>₹{config.minOrderValue.toLocaleString('en-IN')}</Text>
              </View>
            ) : null}

            {config.maxDiscountCap ? (
              <View style={styles.configItem}>
                <Text style={styles.configKey}>Max Discount Cap:</Text>
                <Text style={styles.configVal}>₹{config.maxDiscountCap.toLocaleString('en-IN')}</Text>
              </View>
            ) : null}

            {config.buyQuantity ? (
              <View style={styles.configItem}>
                <Text style={styles.configKey}>BOGO Rule:</Text>
                <Text style={styles.configVal}>
                  Buy {config.buyQuantity} Get {config.getQuantity || 1} Free
                </Text>
              </View>
            ) : null}

            {config.giftItemName ? (
              <View style={styles.configItem}>
                <Text style={styles.configKey}>Free Gift Item:</Text>
                <Text style={styles.configVal}>{config.giftItemName}</Text>
              </View>
            ) : null}

            {offer.validTill || config.validTill ? (
              <View style={styles.configItem}>
                <Text style={styles.configKey}>Validity Deadline:</Text>
                <Text style={styles.configVal}>
                  {new Date(offer.validTill || config.validTill).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Live Coupon Tester Tool */}
        <View style={styles.card}>
          <View style={styles.rowAlign}>
            <Ionicons name="flask-outline" size={20} color={GOLD} />
            <Text style={styles.sectionTitle}>Live Coupon Validation Simulator</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Test how this offer calculates discount for a customer cart subtotal.
          </Text>

          <View style={styles.testerInputRow}>
            <View style={styles.inputPrefixBox}>
              <Text style={styles.inputPrefixText}>₹ Subtotal</Text>
            </View>
            <TextInput
              style={styles.testerInput}
              keyboardType="number-pad"
              value={testSubtotal}
              onChangeText={setTestSubtotal}
              placeholder="e.g. 1500"
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              style={styles.testRunBtn}
              onPress={handleRunValidationTest}
              disabled={validateCouponMutation.isPending}>
              {validateCouponMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.testRunBtnText}>Simulate</Text>
              )}
            </TouchableOpacity>
          </View>

          {testResult && (
            <View
              style={[
                styles.testResultBox,
                testResult.valid !== false ? styles.testResultSuccess : styles.testResultError,
              ]}>
              {testResult.valid !== false ? (
                <>
                  <View style={styles.rowBetween}>
                    <Text style={styles.resultTitle}>✅ Coupon Applied Successfully!</Text>
                    <Text style={styles.resultSavings}>
                      Saved ₹{testResult.discountAmount || testResult.savings || 0}
                    </Text>
                  </View>
                  <Text style={styles.resultDesc}>
                    Final Payable Amount:{' '}
                    <Text style={{ fontWeight: 'bold' }}>
                      ₹
                      {Math.max(
                        0,
                        Number(testSubtotal) -
                          (testResult.discountAmount || testResult.savings || 0)
                      ).toLocaleString('en-IN')}
                    </Text>
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.resultTitleError}>❌ Validation Failed</Text>
                  <Text style={styles.resultDescError}>{testResult.error}</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Usage Analytics */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Performance & Claims</Text>
          <View style={styles.analyticsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{offer.redemptionCount ?? offer.usesCount ?? 0}</Text>
              <Text style={styles.statLbl}>Total Claims</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                ₹{(offer.totalDiscountGiven ?? 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.statLbl}>Customer Savings</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{offer.usageLimit || 'Unlimited'}</Text>
              <Text style={styles.statLbl}>Usage Max Cap</Text>
            </View>
          </View>
        </View>

        {/* Control Footer */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleStatus}>
            <Ionicons
              name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={18}
              color={GOLD}
            />
            <Text style={styles.toggleBtnText}>{isActive ? 'Pause Offer' : 'Activate'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
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
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  offerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  offerDescription: {
    fontSize: FontSize.sm,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  couponBox: {
    backgroundColor: ESPRESSO,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponBoxLbl: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  couponCodeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: GOLD,
    letterSpacing: 1.5,
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 154, 61, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  couponBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: GOLD,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
  },
  configGrid: {
    gap: Spacing.sm,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configKey: {
    fontSize: FontSize.xs,
    color: TEXT_MUTED,
  },
  configVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  testerInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputPrefixBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  inputPrefixText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: TEXT_MUTED,
  },
  testerInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  testRunBtn: {
    backgroundColor: ESPRESSO,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  testRunBtnText: {
    color: GOLD,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },
  testResultBox: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  testResultSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  testResultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  resultTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  resultSavings: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
    color: '#047857',
  },
  resultDesc: {
    fontSize: FontSize.xs,
    color: '#047857',
  },
  resultTitleError: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#991B1B',
  },
  resultDescError: {
    fontSize: FontSize.xs,
    color: '#B91C1C',
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statVal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: TEXT_MAIN,
  },
  statLbl: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  toggleBtn: {
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
  toggleBtnText: {
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
