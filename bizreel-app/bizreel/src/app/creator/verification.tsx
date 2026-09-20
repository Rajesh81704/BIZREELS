import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { api } from '@/lib/api';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const INPUT_BG = '#F8FAFC';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

const BADGE_DESCRIPTIONS: Record<string, { label: string; bg: string; text: string; border: string; icon: string; desc: string }> = {
  unverified: {
    label: 'Unverified Creator',
    bg: '#F1F5F9',
    text: '#334155',
    border: '#CBD5E1',
    icon: '⚪',
    desc: 'Verify contact details and government identity to get verified checkmark and brand offers.',
  },
  partially_verified: {
    label: 'Partially Verified',
    bg: '#FEF3C7',
    text: '#78350F',
    border: '#FCD34D',
    icon: '🟡',
    desc: 'Great progress! Complete PAN, Aadhaar or Payout verification to unlock your 🟢 Verified Creator badge.',
  },
  verified_creator: {
    label: 'Verified Creator (OFFICIAL)',
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#6EE7B7',
    icon: '🟢',
    desc: 'Verified Talent! You get top ranking in creator search, verified checkmark, and direct brand campaign offers.',
  },
  pro_verified: {
    label: 'Pro Verified (SUBSCRIBED)',
    bg: '#FFFBEB',
    text: '#92400E',
    border: GOLD,
    icon: '🔵',
    desc: 'VIP Status! Featured placement across BizReels, premium brand discovery, and priority payout processing.',
  },
};

export default function CreatorVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'payment' | 'contacts'>('documents');
  const [status, setStatus] = useState<any>(null);

  // Forms State
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarRefId, setAadhaarRefId] = useState('');
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);

  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Contact Channels Forms State
  const [mobileInput, setMobileInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // OTP Modal State for Contact Verification
  const [contactOtpModal, setContactOtpModal] = useState({
    visible: false,
    type: '' as 'mobile' | 'whatsapp' | 'email' | '',
    value: '',
    code: '',
  });

  // Action Spinners
  const [verifyingPan, setVerifyingPan] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [verifyingUpi, setVerifyingUpi] = useState(false);
  const [sendingContactOtp, setSendingContactOtp] = useState(false);
  const [verifyingContactOtp, setVerifyingContactOtp] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/creator/me/verification-status');
      const data = res.data?.data || res.data || {};
      setStatus(data);

      // Pre-fill user contact defaults
      const creatorProf = (user as any)?.creatorProfile || {};
      setMobileInput(creatorProf.mobileNumber || (user as any)?.phone || (user as any)?.mobileNumber || '');
      setWhatsappInput(creatorProf.whatsappNumber || creatorProf.mobileNumber || (user as any)?.phone || (user as any)?.mobileNumber || '');
      setEmailInput(user?.email || '');
    } catch (err) {
      console.warn('Failed to load creator verification status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  // ── Verification Handlers ──

  const handleVerifyPan = async () => {
    if (!panNumber.trim() || panNumber.trim().length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F)');
      return;
    }
    setVerifyingPan(true);
    try {
      await api.post('/creator/me/verification/pan', { panNumber: panNumber.trim().toUpperCase() });
      Alert.alert('Success ✓', 'PAN Card verified successfully!');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('PAN Verification Failed', err.response?.data?.message || 'Invalid PAN details or compliance check failed');
    } finally {
      setVerifyingPan(false);
    }
  };

  const handleInitiateAadhaar = async () => {
    if (!aadhaarNumber.trim() || aadhaarNumber.trim().length !== 12) {
      Alert.alert('Required', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setVerifyingAadhaar(true);
    try {
      const res = await api.post('/creator/me/verification/aadhaar/initiate', { aadhaarNumber: aadhaarNumber.trim() });
      const refId = res.data?.refId || res.data?.data?.refId || 'REF_MOCK_123';
      setAadhaarRefId(refId);
      setShowAadhaarOtpInput(true);
      Alert.alert('OTP Sent 📲', 'An OTP has been sent to your Aadhaar-registered mobile number.');
    } catch (err: any) {
      Alert.alert('Aadhaar Failed', err.response?.data?.message || 'Could not initiate Aadhaar OTP verification');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit Aadhaar OTP');
      return;
    }
    setVerifyingAadhaar(true);
    try {
      await api.post('/creator/me/verification/aadhaar/verify-otp', {
        refId: aadhaarRefId,
        otp: aadhaarOtp.trim(),
      });
      Alert.alert('Verified! 🎉', 'Aadhaar identity verified successfully!');
      setShowAadhaarOtpInput(false);
      fetchStatus();
    } catch (err: any) {
      Alert.alert('OTP Verification Failed', err.response?.data?.message || 'Invalid or expired Aadhaar OTP');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!accountNumber.trim() || !ifscCode.trim()) {
      Alert.alert('Required', 'Please enter both Bank Account Number & IFSC code');
      return;
    }
    setVerifyingBank(true);
    try {
      await api.post('/creator/me/verification/bank', {
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
      });
      Alert.alert('Bank Account Verified ✓', 'Real-time penny drop verification successful!');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('Bank Verification Failed', err.response?.data?.message || 'Invalid bank account details');
    } finally {
      setVerifyingBank(false);
    }
  };

  const handleVerifyUpi = async () => {
    if (!upiId.trim() || !upiId.includes('@')) {
      Alert.alert('Required', 'Please enter a valid UPI ID (e.g. name@upi)');
      return;
    }
    setVerifyingUpi(true);
    try {
      await api.post('/creator/me/verification/upi', { upiId: upiId.trim().toLowerCase() });
      Alert.alert('UPI Verified ✓', 'UPI handle verified for instant payouts!');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('UPI Check Failed', err.response?.data?.message || 'Could not verify UPI handle');
    } finally {
      setVerifyingUpi(false);
    }
  };

  // ── Contact Channels OTP Handlers ──

  const handleSendContactOtp = async (type: 'mobile' | 'whatsapp' | 'email', value: string) => {
    if (!value.trim()) {
      Alert.alert('Required', `Please enter a valid ${type} address/number`);
      return;
    }
    setSendingContactOtp(true);
    try {
      await api.post('/creator/me/send-contact-otp', {
        type,
        value: value.trim(),
        channel: type === 'whatsapp' ? 'whatsapp' : 'sms',
      });
      setContactOtpModal({
        visible: true,
        type,
        value: value.trim(),
        code: '',
      });
      Alert.alert('OTP Sent 📲', `Verification code sent to ${type}: ${value}`);
    } catch (err: any) {
      Alert.alert('OTP Failed', err.response?.data?.message || `Failed to send OTP to ${type}`);
    } finally {
      setSendingContactOtp(false);
    }
  };

  const handleConfirmContactOtp = async () => {
    if (!contactOtpModal.code || contactOtpModal.code.length < 4) {
      Alert.alert('Required', 'Please enter a valid verification code');
      return;
    }
    setVerifyingContactOtp(true);
    try {
      await api.post('/creator/me/verify-contact', {
        type: contactOtpModal.type,
        value: contactOtpModal.value,
        code: contactOtpModal.code,
      });
      Alert.alert('Success ✓', `${contactOtpModal.type.toUpperCase()} verified successfully!`);
      setContactOtpModal({ visible: false, type: '', value: '', code: '' });
      fetchStatus();
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setVerifyingContactOtp(false);
    }
  };

  // Status Derived State
  const tierKey = status?.tier || status?.verificationStatus || 'unverified';
  const badgeInfo = BADGE_DESCRIPTIONS[tierKey] || BADGE_DESCRIPTIONS.unverified;
  const completion = status?.completionPercentage || 0;

  const contactVerified = status?.contactVerified || {};
  const documents = status?.documents || {};
  const paymentDetails = status?.paymentDetails || {};

  const isDocumentsComplete = documents.aadhaar?.status === 'approved' && documents.pan?.status === 'approved';
  const isPayoutComplete = paymentDetails.upiVerified || (paymentDetails.verified && paymentDetails.ifscVerified);
  const isContactsComplete = Boolean(contactVerified.mobile && (contactVerified.whatsapp || contactVerified.email));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>Loading Creator Verification Center...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR STUDIO ✦</Text>
          <Text style={styles.headerTitle}>VERIFICATION CENTER</Text>
        </View>
        <TouchableOpacity style={styles.reloadBtn} onPress={fetchStatus}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />}
        showsVerticalScrollIndicator={false}>
        
        {/* Banner Hero Card */}
        <View style={styles.bannerHeroCard}>
          <View style={styles.bannerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerEyebrow}>CREATOR KYC & VERIFICATION CENTER</Text>
              <Text style={styles.bannerTitle}>CREATOR VERIFICATION STATUS</Text>
              <Text style={styles.bannerSub}>
                Verify contact details, government identity (Aadhaar & PAN), and UPI/Bank payout accounts to earn your verified badge.
              </Text>
            </View>
            <View style={styles.shieldIconBox}>
              <Ionicons name="shield-checkmark" size={26} color={ESPRESSO} />
            </View>
          </View>

          {/* Tier & Score Row */}
          <View style={styles.tierScoreCard}>
            <View style={styles.tierBadgeGroup}>
              <Text style={{ fontSize: 24 }}>{badgeInfo.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <View style={[styles.tierPill, { backgroundColor: badgeInfo.bg, borderColor: badgeInfo.border }]}>
                    <Text style={[styles.tierPillText, { color: badgeInfo.text }]}>{badgeInfo.label}</Text>
                  </View>
                </View>
                <Text style={styles.tierDesc}>{badgeInfo.desc}</Text>
              </View>
            </View>

            {/* Score Ring */}
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{completion}%</Text>
              <Text style={styles.scoreLabel}>VERIFIED SCORE</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'documents' && styles.tabItemActive]}
            onPress={() => setActiveTab('documents')}
            activeOpacity={0.85}>
            <Ionicons name="document-text-outline" size={15} color={activeTab === 'documents' ? GOLD : TEXT_MUTED} />
            <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
              1. Identity Docs
            </Text>
            {isDocumentsComplete && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'payment' && styles.tabItemActive]}
            onPress={() => setActiveTab('payment')}
            activeOpacity={0.85}>
            <Ionicons name="card-outline" size={15} color={activeTab === 'payment' ? GOLD : TEXT_MUTED} />
            <Text style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}>
              2. Payout
            </Text>
            {isPayoutComplete && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'contacts' && styles.tabItemActive]}
            onPress={() => setActiveTab('contacts')}
            activeOpacity={0.85}>
            <Ionicons name="call-outline" size={15} color={activeTab === 'contacts' ? GOLD : TEXT_MUTED} />
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>
              3. Contacts
            </Text>
            {isContactsComplete && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
          </TouchableOpacity>
        </View>

        {/* TAB 1: IDENTITY DOCUMENTS */}
        {activeTab === 'documents' && (
          <View style={styles.tabContentSection}>
            {/* PAN Card Verification */}
            {(() => {
              const panDoc = documents.pan || {};
              const isApproved = panDoc.status === 'approved' || status?.panVerified;
              const isPending = panDoc.status === 'pending';
              const isRejected = panDoc.status === 'rejected' || panDoc.status === 'failed';
              const reason = panDoc.rejectionReason || panDoc.failureReason;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="card" size={20} color={GOLD} />
                      <Text style={styles.cardTitle}>1. PAN Card Verification</Text>
                    </View>
                    {isApproved ? (
                      <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>APPROVED ✓</Text></View>
                    ) : isPending ? (
                      <View style={[styles.approvedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.approvedBadgeText}>PENDING REVIEW</Text></View>
                    ) : isRejected ? (
                      <View style={[styles.approvedBadge, { backgroundColor: '#EF4444' }]}><Text style={styles.approvedBadgeText}>REJECTED ❌</Text></View>
                    ) : null}
                  </View>

                  {isRejected && (
                    <View style={styles.rejectedAlertBox}>
                      <Text style={styles.rejectedAlertTitle}>❌ Verification Rejected by Compliance</Text>
                      <Text style={styles.rejectedAlertDesc}>{reason || 'Uploaded PAN details did not match government registry records.'}</Text>
                    </View>
                  )}

                  {isPending && (
                    <View style={styles.pendingAlertBox}>
                      <Text style={styles.pendingAlertTitle}>⏳ Verification Under Compliance Review</Text>
                      <Text style={styles.pendingAlertDesc}>Submitted document is undergoing automatic verification inspection.</Text>
                    </View>
                  )}

                  {!isApproved ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.inputLabel}>10-Character Permanent Account Number (PAN)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. ABCDE1234F"
                        placeholderTextColor="#94A3B8"
                        value={panNumber}
                        onChangeText={setPanNumber}
                        autoCapitalize="characters"
                        maxLength={10}
                      />
                      <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyPan} disabled={verifyingPan} activeOpacity={0.88}>
                        {verifyingPan ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>{isRejected ? 'Re-Submit PAN Card' : 'Verify PAN Card'}</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={styles.successText}>PAN verification completed & verified in government registry.</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Aadhaar Card Verification */}
            {(() => {
              const aadhaarDoc = documents.aadhaar || {};
              const isApproved = aadhaarDoc.status === 'approved' || status?.aadhaarVerified;
              const isPending = aadhaarDoc.status === 'pending';
              const isRejected = aadhaarDoc.status === 'rejected' || aadhaarDoc.status === 'failed';
              const reason = aadhaarDoc.rejectionReason || aadhaarDoc.failureReason;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="finger-print" size={20} color={GOLD} />
                      <Text style={styles.cardTitle}>2. Aadhaar Identity Verification</Text>
                    </View>
                    {isApproved ? (
                      <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>APPROVED ✓</Text></View>
                    ) : isPending ? (
                      <View style={[styles.approvedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.approvedBadgeText}>PENDING REVIEW</Text></View>
                    ) : isRejected ? (
                      <View style={[styles.approvedBadge, { backgroundColor: '#EF4444' }]}><Text style={styles.approvedBadgeText}>REJECTED ❌</Text></View>
                    ) : null}
                  </View>

                  {isRejected && (
                    <View style={styles.rejectedAlertBox}>
                      <Text style={styles.rejectedAlertTitle}>❌ Aadhaar Identity Rejected</Text>
                      <Text style={styles.rejectedAlertDesc}>{reason || 'Aadhaar identity proof did not pass review.'}</Text>
                    </View>
                  )}

                  {isPending && (
                    <View style={styles.pendingAlertBox}>
                      <Text style={styles.pendingAlertTitle}>⏳ Verification Pending Review</Text>
                      <Text style={styles.pendingAlertDesc}>Aadhaar details submitted and undergoing compliance review.</Text>
                    </View>
                  )}

                  {!isApproved ? (
                    !showAadhaarOtpInput ? (
                      <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>12-Digit Aadhaar Card Number</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 1234 5678 9012"
                          placeholderTextColor="#94A3B8"
                          value={aadhaarNumber}
                          onChangeText={setAadhaarNumber}
                          keyboardType="number-pad"
                          maxLength={12}
                        />
                        <TouchableOpacity style={styles.submitBtn} onPress={handleInitiateAadhaar} disabled={verifyingAadhaar} activeOpacity={0.88}>
                          {verifyingAadhaar ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>{isRejected ? 'Re-Request Aadhaar OTP' : 'Get Aadhaar OTP'}</Text>}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>6-Digit DigiLocker Aadhaar OTP</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter 6-digit OTP"
                          placeholderTextColor="#94A3B8"
                          value={aadhaarOtp}
                          onChangeText={setAadhaarOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                        <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyAadhaarOtp} disabled={verifyingAadhaar} activeOpacity={0.88}>
                          {verifyingAadhaar ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Confirm Aadhaar OTP ✓</Text>}
                        </TouchableOpacity>
                      </View>
                    )
                  ) : (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={styles.successText}>Aadhaar identity verified via DigiLocker Sandbox API.</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* TAB 2: PAYOUT DETAILS */}
        {activeTab === 'payment' && (
          <View style={styles.tabContentSection}>
            {/* UPI Payout Handle */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="flash" size={20} color={GOLD} />
                  <Text style={styles.cardTitle}>1. Instant UPI Payout Handle</Text>
                </View>
                {paymentDetails.upiVerified && (
                  <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>VERIFIED ✓</Text></View>
                )}
              </View>

              {!paymentDetails.upiVerified ? (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>VPA / UPI ID Handle</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. mobile@upi or username@okicici"
                    placeholderTextColor="#94A3B8"
                    value={upiId}
                    onChangeText={setUpiId}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyUpi} disabled={verifyingUpi} activeOpacity={0.88}>
                    {verifyingUpi ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Verify UPI ID (Penny Drop)</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.successText}>UPI Handle verified for instant campaign payouts.</Text>
                </View>
              )}
            </View>

            {/* Bank Account Penny Drop */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="business" size={20} color={GOLD} />
                  <Text style={styles.cardTitle}>2. Bank Account Penny Drop</Text>
                </View>
                {paymentDetails.verified && paymentDetails.ifscVerified && (
                  <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>VERIFIED ✓</Text></View>
                )}
              </View>

              {!(paymentDetails.verified && paymentDetails.ifscVerified) ? (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Bank Account Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Account Number"
                    placeholderTextColor="#94A3B8"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                  />
                  
                  <Text style={[styles.inputLabel, { marginTop: 10 }]}>IFSC Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. SBIN0001234"
                    placeholderTextColor="#94A3B8"
                    value={ifscCode}
                    onChangeText={setIfscCode}
                    autoCapitalize="characters"
                  />

                  <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyBank} disabled={verifyingBank} activeOpacity={0.88}>
                    {verifyingBank ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Verify Bank Account (Penny Drop)</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.successText}>Bank account verified for direct bank transfer payouts.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB 3: CONTACT CHANNELS */}
        {activeTab === 'contacts' && (
          <View style={styles.tabContentSection}>
            {/* Mobile Phone Verification */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="call" size={20} color={GOLD} />
                  <Text style={styles.cardTitle}>1. Mobile Phone Verification</Text>
                </View>
                {contactVerified.mobile ? (
                  <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>VERIFIED ✓</Text></View>
                ) : (
                  <View style={[styles.approvedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.approvedBadgeText}>UNVERIFIED</Text></View>
                )}
              </View>

              {!contactVerified.mobile ? (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    value={mobileInput}
                    onChangeText={setMobileInput}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => handleSendContactOtp('mobile', mobileInput)}
                    disabled={sendingContactOtp}
                    activeOpacity={0.88}>
                    {sendingContactOtp ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Send Mobile SMS OTP</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.successText}>Mobile number verified with OTP.</Text>
                </View>
              )}
            </View>

            {/* WhatsApp Verification */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={styles.cardTitle}>2. WhatsApp Channel Verification</Text>
                </View>
                {contactVerified.whatsapp ? (
                  <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>VERIFIED ✓</Text></View>
                ) : (
                  <View style={[styles.approvedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.approvedBadgeText}>UNVERIFIED</Text></View>
                )}
              </View>

              {!contactVerified.whatsapp ? (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>WhatsApp Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter WhatsApp phone number"
                    placeholderTextColor="#94A3B8"
                    value={whatsappInput}
                    onChangeText={setWhatsappInput}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => handleSendContactOtp('whatsapp', whatsappInput)}
                    disabled={sendingContactOtp}
                    activeOpacity={0.88}>
                    {sendingContactOtp ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Send WhatsApp OTP</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.successText}>WhatsApp channel verified for instant lead alerts.</Text>
                </View>
              )}
            </View>

            {/* Email Address Verification */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="mail" size={20} color={GOLD} />
                  <Text style={styles.cardTitle}>3. Email Address Verification</Text>
                </View>
                {contactVerified.email ? (
                  <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>VERIFIED ✓</Text></View>
                ) : (
                  <View style={[styles.approvedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.approvedBadgeText}>UNVERIFIED</Text></View>
                )}
              </View>

              {!contactVerified.email ? (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor="#94A3B8"
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => handleSendContactOtp('email', emailInput)}
                    disabled={sendingContactOtp}
                    activeOpacity={0.88}>
                    {sendingContactOtp ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Send Email Verification Code</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.successText}>Email address verified for campaign contracts & receipts.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* OTP Confirmation Modal for Contact Channels */}
      <Modal visible={contactOtpModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Enter OTP Code</Text>
              <TouchableOpacity
                onPress={() => setContactOtpModal({ visible: false, type: '', value: '', code: '' })}>
                <Ionicons name="close-circle" size={22} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSub}>
              Enter the verification code sent to {contactOtpModal.type.toUpperCase()}: {'\n'}
              <Text style={{ fontWeight: 'bold', color: TEXT_MAIN }}>{contactOtpModal.value}</Text>
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#94A3B8"
              value={contactOtpModal.code}
              onChangeText={(t) => setContactOtpModal((prev) => ({ ...prev, code: t }))}
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setContactOtpModal({ visible: false, type: '', value: '', code: '' })}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmContactOtp}
                disabled={verifyingContactOtp}>
                {verifyingContactOtp ? <ActivityIndicator color={ESPRESSO} /> : <Text style={styles.modalConfirmText}>Verify Code ✓</Text>}
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
  loadingContainer: { flex: 1, backgroundColor: BG_MATTE, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: TEXT_MUTED, fontSize: FontSize.xs, fontWeight: '700' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: ESPRESSO,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    gap: Spacing.three,
  },
  backBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#1A1410',
    borderWidth: 1,
    borderColor: '#3A2C22',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 40 },

  // Hero Banner Card
  bannerHeroCard: {
    backgroundColor: ESPRESSO,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.four,
    borderWidth: 1.5,
    borderColor: GOLD,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  bannerEyebrow: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  bannerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  bannerSub: { color: '#CBD5E1', fontSize: 11, marginTop: 4, lineHeight: 16 },
  shieldIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierScoreCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tierBadgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tierPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  tierPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  tierDesc: { color: '#94A3B8', fontSize: 10.5, marginTop: 4, lineHeight: 14 },
  scoreContainer: {
    backgroundColor: '#1A130E',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 61, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  scoreValue: { color: GOLD, fontSize: 20, fontWeight: '900' },
  scoreLabel: { color: '#94A3B8', fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

  // Tabs
  tabBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: ESPRESSO,
    borderColor: ESPRESSO,
  },
  tabText: { color: TEXT_MUTED, fontSize: 11, fontWeight: '800' },
  tabTextActive: { color: GOLD, fontWeight: '900' },

  tabContentSection: { gap: Spacing.four },

  // Card Components
  card: {
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardTitle: { color: ESPRESSO, fontSize: FontSize.xs, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  approvedBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  approvedBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  rejectedAlertBox: { backgroundColor: '#FEF2F2', padding: 10, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8 },
  rejectedAlertTitle: { color: '#DC2626', fontSize: 11, fontWeight: '900' },
  rejectedAlertDesc: { color: '#7F1D1D', fontSize: 10, marginTop: 2 },

  pendingAlertBox: { backgroundColor: '#FFFBEB', padding: 10, borderWidth: 1, borderColor: GOLD, borderRadius: 8 },
  pendingAlertTitle: { color: ESPRESSO, fontSize: 11, fontWeight: '900' },
  pendingAlertDesc: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },

  formGroup: { gap: 6 },
  inputLabel: { color: TEXT_MUTED, fontSize: 10.5, fontWeight: '700' },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    color: TEXT_MAIN,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: FontSize.xs,
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: ESPRESSO,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 0.5 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  successText: { color: '#065F46', fontSize: 11, fontWeight: '700', flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContentCard: { backgroundColor: CARD_BG, width: '100%', borderRadius: 16, padding: 20, gap: 14 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: ESPRESSO, fontSize: 15, fontWeight: '900' },
  modalSub: { color: TEXT_MUTED, fontSize: 12, lineHeight: 18 },
  modalInput: { backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 8, height: 46, paddingHorizontal: 12, fontSize: 15, fontWeight: 'bold', color: TEXT_MAIN, textAlign: 'center', letterSpacing: 4 },
  modalActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  modalCancelBtn: { flex: 1, height: 42, borderRadius: 8, borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: TEXT_MUTED, fontSize: 12, fontWeight: '700' },
  modalConfirmBtn: { flex: 1, height: 42, borderRadius: 8, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { color: ESPRESSO, fontSize: 12, fontWeight: '900' },
});
