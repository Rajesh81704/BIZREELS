import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { useInquiries, useReplyInquiry } from '@/features/inquiries/queries';
import type { Inquiry } from '@/features/inquiries/types';
import { resolveImageUrl } from '@/utils/image';

// Theme Design System Tokens matching Web & App
const GOLD = '#D99A3D';
const GOLD_DARK = '#9E6715';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#1A1A1A';
const TEXT_MUTED = '#64748B';
const EMERALD = '#059669';
const EMERALD_BG = '#D1FAE5';
const AMBER = '#D97706';
const AMBER_BG = '#FEF3C7';
const WHATSAPP_GREEN = '#25D366';

/**
 * Masks phone number with xxx (e.g. 63xxxxxx34) matching web
 */
const maskPhone = (phone?: string) => {
  if (!phone) return '';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 10) {
    const first2 = digits.slice(-10, -8);
    const last2 = digits.slice(-2);
    return `${first2}xxxxxx${last2}`;
  }
  return str.slice(0, 2) + 'xxxxxx' + str.slice(-2);
};

/**
 * Masks email address with xxx (e.g. anxxxxx@gmail.com) matching web
 */
const maskEmail = (email?: string) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length < 2) return 'xxxx@xxx.com';
  const name = parts[0];
  const domain = parts[1];
  const visible = name.length > 2 ? name.slice(0, 2) : name.slice(0, 1);
  return `${visible}xxxxx@${domain}`;
};

export default function InquiriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, status: authStatus } = useAuth();

  const { data: inquiriesData, isLoading, refetch, isRefetching } = useInquiries();
  const replyMutation = useReplyInquiry();

  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [closedIds, setClosedIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const rawInquiries = (Array.isArray(inquiriesData) ? inquiriesData : []).filter(
    (item) => !deletedIds.includes(item._id || (item as any).id)
  );

  // Metrics computation matching web dashboard
  const totalCount = rawInquiries.length;
  const newCount = rawInquiries.filter(
    (i) => (i.status as string || 'sent') === 'sent' || i.status === 'pending'
  ).length;
  const repliedCount = rawInquiries.filter(
    (i) => i.status === 'replied' || i.status === 'closed' || closedIds.includes(i._id || (i as any).id)
  ).length;

  const walletCredits = (user as any)?.walletBalance ?? 26066.0;

  // Filtered inquiries list
  const filteredInquiries = rawInquiries.filter((item) => {
    const id = item._id || (item as any).id;
    const isItemClosed = closedIds.includes(id) || item.status === 'closed';

    // Category Filter
    if (activeCategoryTab === 'product' && (item.listing as any)?.type === 'service') return false;
    if (activeCategoryTab === 'service' && (item.listing as any)?.type !== 'service') return false;
    if (activeCategoryTab === 'quote' && !item.subject?.toLowerCase().includes('quote')) return false;

    // Search Query Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const customerObj = (item.customer as any) || {};
    const customerName = (customerObj.name || '').toLowerCase();
    const listingTitle = (item.listing?.title || item.subject || '').toLowerCase();
    const msg = (item.message || (item as any).msg || '').toLowerCase();

    return (
      customerName.includes(q) ||
      listingTitle.includes(q) ||
      msg.includes(q)
    );
  });

  const handleSendReply = () => {
    if (!selectedInquiry || !replyText.trim()) return;
    const inqId = selectedInquiry._id || (selectedInquiry as any).id;
    replyMutation.mutate(
      { inquiry_id: inqId, message: replyText.trim() },
      {
        onSuccess: () => {
          Alert.alert('Reply Sent', 'Your quick reply has been sent successfully.');
          setReplyText('');
          setSelectedInquiry(null);
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Failed to send reply');
        },
      }
    );
  };

  const handleMarkClosed = (inquiryId: string) => {
    Alert.alert('Mark Closed', 'Are you sure you want to mark this inquiry as closed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Inquiry',
        onPress: () => {
          setClosedIds((prev) => [...prev, inquiryId]);
        },
      },
    ]);
  };

  const handleDeleteInquiry = (inquiryId: string) => {
    Alert.alert('Delete Inquiry', 'Are you sure you want to delete this lead from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setDeletedIds((prev) => [...prev, inquiryId]);
        },
      },
    ]);
  };

  const handleWhatsAppContact = (inquiry: Inquiry) => {
    const cust = inquiry.customer as any;
    const phone = cust?.phone || cust?.whatsapp || '9876543210';
    const title = inquiry.listing?.title || inquiry.subject || 'your listing';
    const name = cust?.name || 'Customer';

    let cleanPhone = String(phone).replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const msgText = encodeURIComponent(`Hi ${name}! Regarding your inquiry on BizReels for "${title}"...`);
    const url = `https://wa.me/${cleanPhone}?text=${msgText}`;

    const { Linking } = require('react-native');
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', `Customer phone: ${phone}`);
    });
  };

  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('Call Customer', 'Phone details not available for this buyer.');
      return;
    }
    const { Linking } = require('react-native');
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone Call', `Phone: ${phone}`);
    });
  };

  if (authStatus === 'unauthed' || !user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={GOLD} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerBadge}>VENDOR PORTAL ✦</Text>
            <Text style={styles.headerTitle}>LEADS &amp; ENQUIRIES</Text>
          </View>
        </View>

        <View style={styles.centered}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="chatbubbles-outline" size={40} color={GOLD} />
          </View>
          <Text style={styles.authTitle}>Sign In to View Vendor Leads</Text>
          <Text style={styles.authSub}>
            Please sign in to your BizReels Vendor account to track buyer inquiries, send quick replies, and bid on customer requirements.
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.authBtnText}>Log In / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Espresso Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>VENDOR PORTAL ✦</Text>
          <Text style={styles.headerTitle}>LEADS &amp; ENQUIRIES</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={GOLD} colors={[GOLD]} />
        }>
        {/* Intro Subhead Banner */}
        <View style={styles.introCard}>
          <View style={styles.introHeaderRow}>
            <View style={styles.inboxIconBox}>
              <Ionicons name="mail-outline" size={22} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.introTitleRow}>
                <Text style={styles.introTitle}>MANAGE BUYER LEADS</Text>
                <View style={styles.shieldBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={EMERALD} />
                  <Text style={styles.shieldBadgeText}>Privacy Active</Text>
                </View>
              </View>
              <Text style={styles.introSub}>
                Manage direct product &amp; service inquiries from buyers, send verified quick replies, and bid on broadcast customer requirements.
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Bento Metrics Cards Grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollGrid}>
          {/* Card 1: Total Inquiries */}
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>TOTAL INQUIRIES</Text>
              <View style={styles.statIconBoxGold}>
                <Ionicons name="mail-outline" size={14} color={GOLD_DARK} />
              </View>
            </View>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statSub}>Across all listings &amp; reels</Text>
          </View>

          {/* Card 2: Needs Reply */}
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>NEEDS REPLY</Text>
              <View style={styles.statIconBoxAmber}>
                <Ionicons name="time-outline" size={14} color={AMBER} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: AMBER }]}>{newCount}</Text>
            <Text style={styles.statSub}>Unanswered buyer messages</Text>
          </View>

          {/* Card 3: Resolved Leads */}
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>RESOLVED LEADS</Text>
              <View style={styles.statIconBoxEmerald}>
                <Ionicons name="checkmark-circle-outline" size={14} color={EMERALD} />
              </View>
            </View>
            <Text style={[styles.statValue, { color: EMERALD }]}>{repliedCount}</Text>
            <Text style={styles.statSub}>Replied or marked closed</Text>
          </View>

          {/* Card 4: Wallet Credits */}
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>WALLET CREDITS</Text>
              <View style={styles.statIconBoxGold}>
                <Ionicons name="flash-outline" size={14} color={GOLD_DARK} />
              </View>
            </View>
            <View style={styles.walletRow}>
              <Text style={styles.statValue}>{Number(walletCredits).toFixed(1)}</Text>
              <TouchableOpacity
                style={styles.rechargeBtn}
                onPress={() => router.push('/creator/wallet' as any)}>
                <Text style={styles.rechargeBtnText}>+ Recharge</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.statSub}>Available for RFQ bidding</Text>
          </View>
        </ScrollView>

        {/* Category Horizontal Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPillsRow}>
          <TouchableOpacity
            style={[styles.catPill, activeCategoryTab === 'all' && styles.catPillActive]}
            onPress={() => setActiveCategoryTab('all')}>
            <Text style={[styles.catPillText, activeCategoryTab === 'all' && styles.catPillTextActive]}>
              All Enquiries ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catPill, activeCategoryTab === 'product' && styles.catPillActive]}
            onPress={() => setActiveCategoryTab('product')}>
            <Text style={[styles.catPillText, activeCategoryTab === 'product' && styles.catPillTextActive]}>
              Product Enquiries (0)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catPill, activeCategoryTab === 'service' && styles.catPillActive]}
            onPress={() => setActiveCategoryTab('service')}>
            <Text style={[styles.catPillText, activeCategoryTab === 'service' && styles.catPillTextActive]}>
              Service Enquiries (0)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catPill, activeCategoryTab === 'quote' && styles.catPillActive]}
            onPress={() => setActiveCategoryTab('quote')}>
            <Text style={[styles.catPillText, activeCategoryTab === 'quote' && styles.catPillTextActive]}>
              Quote Requests ({totalCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name, message, or listing title..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Inquiry Cards List matching Web 1:1 */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.loadingText}>Loading buyer inquiries...</Text>
          </View>
        ) : filteredInquiries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={44} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching inquiries found' : 'No Customer Inquiries Yet'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? 'Try adjusting your search query or active filter category.'
                : 'Customer inquiries sent from your product listings or video reels will appear here in real-time.'}
            </Text>
          </View>
        ) : (
          filteredInquiries.map((item) => {
            const inqId = item._id || (item as any).id;
            const customerObj = (item.customer as any) || {};
            const customerName = customerObj?.name || 'Ankit Kumar';
            const customerPhone = customerObj?.phone || '63xxxxxx34';
            const customerEmail = customerObj?.email || 'anxxxxxx@gmail.com';
            const customerInit = customerName.charAt(0).toUpperCase();

            const listingObj = (item.listing as any) || {};
            const itemTitle = listingObj.title || item.subject || 'Classic Full-Grain Leather Wallet';
            const itemImage = resolveImageUrl(listingObj.images?.[0]);
            const price = listingObj.price || 1499;

            const isClosed = closedIds.includes(inqId) || item.status === 'closed';
            const isReplied = item.status === 'replied' || isClosed;
            const rawDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '16 Sept 2026';

            const latestReply = (item as any).replyMessage || (Array.isArray(item.replies) && item.replies.length > 0 ? item.replies[item.replies.length - 1]?.message : null);

            return (
              <View key={inqId} style={styles.inquiryCard}>
                {/* ── Top Header Row: Avatar, Name, Status, Masked Contacts, Actions ── */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitText}>{customerInit}</Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.customerNameText} numberOfLines={1}>
                        {customerName}
                      </Text>
                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          isClosed
                            ? styles.statusBadgeClosed
                            : isReplied
                            ? styles.statusBadgeReplied
                            : styles.statusBadgeNew,
                        ]}>
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isClosed
                              ? { color: '#475569' }
                              : isReplied
                              ? { color: EMERALD }
                              : { color: AMBER },
                          ]}>
                          {isClosed ? 'Closed' : isReplied ? '✓ Replied' : '● NEW INQUIRY'}
                        </Text>
                      </View>
                    </View>

                    {/* Masked Phone, Email, Date pills row */}
                    <View style={styles.contactDetailsRow}>
                      {Boolean(customerPhone) && (
                        <View style={styles.maskedPill}>
                          <Ionicons name="call-outline" size={10} color={GOLD_DARK} />
                          <Text style={styles.maskedPillText}>{maskPhone(customerPhone)}</Text>
                        </View>
                      )}

                      {Boolean(customerEmail) && (
                        <View style={styles.maskedPill}>
                          <Ionicons name="mail-outline" size={10} color={GOLD} />
                          <Text style={styles.maskedPillText}>{maskEmail(customerEmail)}</Text>
                        </View>
                      )}

                      <View style={styles.dateInfoPill}>
                        <Ionicons name="time-outline" size={10} color={TEXT_MUTED} />
                        <Text style={styles.dateInfoText}>{rawDate}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Header Actions: Mark Closed & Trash Delete */}
                  <View style={styles.headerActionsRow}>
                    {!isClosed && (
                      <TouchableOpacity
                        style={styles.markClosedBtn}
                        onPress={() => handleMarkClosed(inqId)}>
                        <Text style={styles.markClosedText}>Mark Closed</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteIconBtn}
                      onPress={() => handleDeleteInquiry(inqId)}>
                      <Ionicons name="trash-outline" size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Product Reference Card Box ── */}
                <View style={styles.productCardBox}>
                  {itemImage ? (
                    <Image source={{ uri: itemImage }} style={styles.productImg} contentFit="cover" />
                  ) : (
                    <View style={styles.productFallbackImg}>
                      <Ionicons name="bag-handle-outline" size={18} color={GOLD_DARK} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={styles.productTypeRow}>
                      <View style={styles.productTypeBadge}>
                        <Text style={styles.productTypeBadgeText}>PRODUCT</Text>
                      </View>
                      <Text style={styles.productTitleText} numberOfLines={1}>
                        {itemTitle}
                      </Text>
                      <Ionicons name="open-outline" size={12} color={TEXT_MUTED} />
                    </View>

                    {price !== null && (
                      <Text style={styles.productPriceText}>
                        Listing Price: <Text style={styles.priceHighlight}>₹{Number(price).toLocaleString('en-IN')}</Text>
                      </Text>
                    )}
                  </View>
                </View>

                {/* ── Customer Message Box ── */}
                <View style={styles.messageContainerBox}>
                  <Text style={styles.messageBoxHeader}>CUSTOMER MESSAGE:</Text>
                  <Text style={styles.messageBoxContent}>
                    "{item.message || (item as any).msg || 'I\'m interested in your post: "Classic Full-Grain Leather Wallet"'}"
                  </Text>

                  {/* Vendor Reply Bubble if exists */}
                  {Boolean(latestReply) && (
                    <View style={styles.vendorReplyBox}>
                      <Ionicons name="arrow-undo" size={12} color={EMERALD} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vendorReplyHeader}>YOUR REPLY:</Text>
                        <Text style={styles.vendorReplyContent}>{latestReply}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* ── Bottom Action Buttons Row: WhatsApp, Call, Quick Reply ── */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.whatsAppBtn}
                    onPress={() => handleWhatsAppContact(item)}
                    activeOpacity={0.88}>
                    <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                    <Text style={styles.whatsAppBtnText}>Reply on WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCallCustomer(customerPhone)}
                    activeOpacity={0.88}>
                    <Ionicons name="call-outline" size={13} color={GOLD_DARK} />
                    <Text style={styles.callBtnText}>Call Customer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickReplyBtn}
                    onPress={() => setSelectedInquiry(item)}
                    activeOpacity={0.88}>
                    <Ionicons name="paper-plane-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.quickReplyBtnText}>
                      {latestReply ? 'Update Reply' : 'Send Quick Reply'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Inquiry Conversation / Quick Reply Modal */}
      <Modal
        visible={Boolean(selectedInquiry)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedInquiry(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedInquiry(null)} />
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalBadge}>CONVERSATION THREAD ✦</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedInquiry?.listing?.title || selectedInquiry?.subject || 'Inquiry Thread'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedInquiry(null)}>
                <Ionicons name="close" size={22} color={TEXT_MAIN} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {/* Customer Initial Message */}
              <View style={styles.msgBubbleCustomer}>
                <Text style={styles.msgSenderName}>
                  {(selectedInquiry?.customer as any)?.name || 'Customer'}
                </Text>
                <Text style={styles.msgText}>{selectedInquiry?.message || (selectedInquiry as any)?.msg}</Text>
              </View>

              {/* Replies */}
              {selectedInquiry?.replies?.map((rep, idx) => {
                const isCustomer = rep.sender === 'customer';
                return (
                  <View
                    key={idx}
                    style={isCustomer ? styles.msgBubbleCustomer : styles.msgBubbleVendor}>
                    <Text style={isCustomer ? styles.msgSenderName : styles.msgSenderNameVendor}>
                      {isCustomer ? (selectedInquiry.customer as any)?.name || 'Customer' : 'You (Vendor)'}
                    </Text>
                    <Text style={styles.msgText}>{rep.message}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Input Reply Row */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your response to buyer..."
                placeholderTextColor="#94A3B8"
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSendReply}
                disabled={replyMutation.isPending || !replyText.trim()}
                activeOpacity={0.88}>
                {replyMutation.isPending ? (
                  <ActivityIndicator size="small" color={ESPRESSO} />
                ) : (
                  <Ionicons name="send" size={15} color={ESPRESSO} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: 12 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F5EFE4', borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center', justifyContent: 'center' },
  authTitle: { color: TEXT_MAIN, fontSize: FontSize.md, fontWeight: '900' },
  authSub: { color: TEXT_MUTED, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
  authBtn: { backgroundColor: ESPRESSO, borderWidth: 1, borderColor: GOLD, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  authBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900' },

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
  backBtn: {
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

  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 60 },

  introCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.four,
  },
  introHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  inboxIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5EFE4', borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center', justifyContent: 'center' },
  introTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  introTitle: { color: TEXT_MAIN, fontSize: FontSize.sm, fontWeight: '900' },
  shieldBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  shieldBadgeText: { color: EMERALD, fontSize: 8.5, fontWeight: '900' },
  introSub: { color: TEXT_MUTED, fontSize: 11, marginTop: 2, lineHeight: 15 },

  statsScrollGrid: { flexDirection: 'row', gap: Spacing.three, paddingRight: Spacing.four },
  statCard: {
    width: 155,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 4,
  },
  statTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: TEXT_MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statIconBoxGold: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  statIconBoxAmber: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' },
  statIconBoxEmerald: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: TEXT_MAIN },
  statSub: { color: TEXT_MUTED, fontSize: 9.5, lineHeight: 12 },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rechargeBtn: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' },
  rechargeBtnText: { color: GOLD_DARK, fontSize: 9, fontWeight: '900' },

  categoryPillsRow: { flexDirection: 'row', gap: 8, paddingRight: Spacing.four },
  catPill: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catPillActive: { backgroundColor: ESPRESSO, borderColor: ESPRESSO },
  catPillText: { color: TEXT_MUTED, fontSize: 11, fontWeight: '800' },
  catPillTextActive: { color: GOLD, fontWeight: '900' },

  searchBox: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: TEXT_MAIN, fontSize: FontSize.xs },

  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: TEXT_MUTED, fontSize: FontSize.xs, fontWeight: '700' },

  emptyCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { color: TEXT_MAIN, fontSize: FontSize.xs, fontWeight: '900' },
  emptySub: { color: TEXT_MUTED, fontSize: 11, textAlign: 'center', lineHeight: 16 },

  inquiryCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: Spacing.four,
    gap: 12,
  },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5EFE4',
    borderWidth: 1.5,
    borderColor: '#D5CBBA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitText: { color: GOLD_DARK, fontSize: 13, fontWeight: '900' },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  customerNameText: { color: TEXT_MAIN, fontSize: 13, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1 },
  statusBadgeNew: { backgroundColor: '#FEF08A', borderColor: '#FDE047' },
  statusBadgeReplied: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' },
  statusBadgeClosed: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  contactDetailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  maskedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  maskedPillText: { color: '#334155', fontSize: 9.5, fontWeight: '800', fontFamily: 'monospace' },
  dateInfoPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateInfoText: { color: TEXT_MUTED, fontSize: 9.5 },

  headerActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markClosedBtn: {
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markClosedText: { color: '#334155', fontSize: 10, fontWeight: '800' },
  deleteIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F4EC',
  },

  productCardBox: {
    backgroundColor: '#FBF9F5',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: CARD_BG },
  productFallbackImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F5EFE4', alignItems: 'center', justifyContent: 'center' },
  productTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productTypeBadge: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER_COLOR, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  productTypeBadgeText: { color: '#475569', fontSize: 8.5, fontWeight: '900' },
  productTitleText: { color: TEXT_MAIN, fontSize: 12, fontWeight: '900', flex: 1 },
  productPriceText: { color: TEXT_MUTED, fontSize: 10.5, marginTop: 2 },
  priceHighlight: { color: '#065F46', fontWeight: '900' },

  messageContainerBox: {
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 4,
  },
  messageBoxHeader: { color: GOLD_DARK, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
  messageBoxContent: { color: '#2D261E', fontSize: 12, fontStyle: 'italic', lineHeight: 18, fontWeight: '500' },

  vendorReplyBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
  },
  vendorReplyHeader: { color: '#065F46', fontSize: 8.5, fontWeight: '900' },
  vendorReplyContent: { color: TEXT_MAIN, fontSize: 11, marginTop: 1 },

  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  whatsAppBtn: {
    backgroundColor: WHATSAPP_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  whatsAppBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  callBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callBtnText: { color: TEXT_MAIN, fontSize: 11, fontWeight: '900' },
  quickReplyBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickReplyBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderTopColor: GOLD,
    padding: Spacing.four,
    maxHeight: '82%',
    gap: Spacing.three,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, paddingBottom: 10 },
  modalBadge: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { color: ESPRESSO, fontSize: FontSize.base, fontWeight: '900' },

  msgBubbleCustomer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: Spacing.three,
    borderRadius: 14,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  msgBubbleVendor: {
    backgroundColor: ESPRESSO,
    padding: Spacing.three,
    borderRadius: 14,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  msgSenderName: { color: '#2563EB', fontSize: 9.5, fontWeight: '900', marginBottom: 2 },
  msgSenderNameVendor: { color: GOLD, fontSize: 9.5, fontWeight: '900', marginBottom: 2 },
  msgText: { color: TEXT_MAIN, fontSize: FontSize.xs, lineHeight: 18 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 10 },
  replyInput: {
    flex: 1,
    backgroundColor: BG_MATTE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    color: TEXT_MAIN,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: FontSize.xs,
    borderRadius: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: GOLD,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
