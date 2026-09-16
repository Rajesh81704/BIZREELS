import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { api } from '@/lib/api';

const GOLD = '#D99A3D';
const ESPRESSO = '#241B15';
const BG_MATTE = '#F8F4EC';
const CARD_BG = '#FFFFFF';
const INPUT_BG = '#F8FAFC';
const BORDER_COLOR = '#E3DCCB';
const TEXT_MAIN = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function CreatorVerificationScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  // Verification Forms State
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarRefId, setAadhaarRefId] = useState('');
  const [showAadhaarOtpInput, setShowAadhaarOtpInput] = useState(false);

  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  const [verifyingPan, setVerifyingPan] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [verifyingUpi, setVerifyingUpi] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/creator/me/verification-status');
      setStatus(res.data?.data || res.data || {});
    } catch (err) {
      console.warn('Failed to load verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleVerifyPan = async () => {
    if (!panNumber.trim() || panNumber.trim().length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-character PAN number');
      return;
    }
    setVerifyingPan(true);
    try {
      await api.post('/creator/me/verification/pan', { panNumber: panNumber.trim().toUpperCase() });
      Alert.alert('Success', 'PAN card verified successfully!');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('PAN Verification Failed', err.response?.data?.message || 'Invalid PAN details');
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
      Alert.alert('OTP Sent', 'An OTP has been sent to your Aadhaar-linked mobile number.');
    } catch (err: any) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not initiate Aadhaar OTP');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (!aadhaarOtp.trim()) {
      Alert.alert('Required', 'Please enter the OTP');
      return;
    }
    setVerifyingAadhaar(true);
    try {
      await api.post('/creator/me/verification/aadhaar/verify-otp', {
        refId: aadhaarRefId,
        otp: aadhaarOtp.trim(),
      });
      Alert.alert('Verified!', 'Aadhaar identity verified successfully!');
      setShowAadhaarOtpInput(false);
      fetchStatus();
    } catch (err: any) {
      Alert.alert('OTP Error', err.response?.data?.message || 'Invalid Aadhaar OTP');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!accountNumber.trim() || !ifscCode.trim()) {
      Alert.alert('Required', 'Please enter Account Number & IFSC code');
      return;
    }
    setVerifyingBank(true);
    try {
      await api.post('/creator/me/verification/bank', {
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
      });
      Alert.alert('Bank Account Verified', 'Penny drop verification successful!');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('Bank Verification Failed', err.response?.data?.message || 'Invalid bank account details');
    } finally {
      setVerifyingBank(false);
    }
  };

  const handleVerifyUpi = async () => {
    if (!upiId.trim() || !upiId.includes('@')) {
      Alert.alert('Required', 'Please enter a valid UPI ID (e.g. user@upi)');
      return;
    }
    setVerifyingUpi(true);
    try {
      await api.post('/creator/me/verification/upi', { upiId: upiId.trim().toLowerCase() });
      Alert.alert('UPI Verified', 'UPI handle verified for instant payouts!');
      fetchStatus();
    } catch (err: any) {
      Alert.alert('UPI Check Failed', err.response?.data?.message || 'Could not verify UPI handle');
    } finally {
      setVerifyingUpi(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR STUDIO</Text>
          <Text style={styles.headerTitle}>VERIFICATION CENTER</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* PAN Verification */}
        {(() => {
          const panDoc = status?.documents?.pan || {};
          const isApproved = panDoc.status === 'approved' || status?.panVerified;
          const isPending = panDoc.status === 'pending';
          const isRejected = panDoc.status === 'rejected' || panDoc.status === 'failed';
          const reason = panDoc.rejectionReason || panDoc.failureReason;

          return (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="card-outline" size={20} color={GOLD} />
                <Text style={styles.cardTitle}>1. PAN Card Verification</Text>
                {isApproved ? (
                  <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>VERIFIED</Text></View>
                ) : isPending ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.verifiedBadgeText}>PENDING</Text></View>
                ) : isRejected ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#DC2626' }]}><Text style={styles.verifiedBadgeText}>REJECTED</Text></View>
                ) : null}
              </View>

              {isRejected && (
                <View style={styles.rejectedBox}>
                  <Text style={styles.rejectedTitle}>❌ Verification Rejected</Text>
                  <Text style={styles.rejectedSub}>{reason || 'Uploaded PAN document did not pass compliance inspection.'}</Text>
                </View>
              )}

              {isPending && (
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingTitle}>⏳ Verification Pending Review</Text>
                  <Text style={styles.pendingSub}>Submitted and currently being verified by compliance team.</Text>
                </View>
              )}

              {!isApproved ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 10-character PAN (e.g. ABCDE1234F)"
                    placeholderTextColor="#94A3B8"
                    value={panNumber}
                    onChangeText={setPanNumber}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                  <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyPan} disabled={verifyingPan} activeOpacity={0.85}>
                    {verifyingPan ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>{isRejected ? 'Re-Submit PAN Card' : 'Verify PAN Card'}</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.successNote}>✓ PAN verification completed successfully.</Text>
              )}
            </View>
          );
        })()}

        {/* Aadhaar Verification */}
        {(() => {
          const aadhaarDoc = status?.documents?.aadhaar || {};
          const isApproved = aadhaarDoc.status === 'approved' || status?.aadhaarVerified;
          const isPending = aadhaarDoc.status === 'pending';
          const isRejected = aadhaarDoc.status === 'rejected' || aadhaarDoc.status === 'failed';
          const reason = aadhaarDoc.rejectionReason || aadhaarDoc.failureReason;

          return (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="finger-print-outline" size={20} color={GOLD} />
                <Text style={styles.cardTitle}>2. Aadhaar Identity (OTP)</Text>
                {isApproved ? (
                  <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>VERIFIED</Text></View>
                ) : isPending ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#F59E0B' }]}><Text style={styles.verifiedBadgeText}>PENDING</Text></View>
                ) : isRejected ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: '#DC2626' }]}><Text style={styles.verifiedBadgeText}>REJECTED</Text></View>
                ) : null}
              </View>

              {isRejected && (
                <View style={styles.rejectedBox}>
                  <Text style={styles.rejectedTitle}>❌ Aadhaar Verification Rejected</Text>
                  <Text style={styles.rejectedSub}>{reason || 'Aadhaar identity proof did not pass review.'}</Text>
                </View>
              )}

              {isPending && (
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingTitle}>⏳ Verification Pending Review</Text>
                  <Text style={styles.pendingSub}>Aadhaar submitted and under compliance check.</Text>
                </View>
              )}

              {!isApproved ? (
                !showAadhaarOtpInput ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 12-digit Aadhaar Number"
                      placeholderTextColor="#94A3B8"
                      value={aadhaarNumber}
                      onChangeText={setAadhaarNumber}
                      keyboardType="number-pad"
                      maxLength={12}
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleInitiateAadhaar} disabled={verifyingAadhaar} activeOpacity={0.85}>
                      {verifyingAadhaar ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>{isRejected ? 'Re-Request Aadhaar OTP' : 'Get Aadhaar OTP'}</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit OTP sent to mobile"
                      placeholderTextColor="#94A3B8"
                      value={aadhaarOtp}
                      onChangeText={setAadhaarOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyAadhaarOtp} disabled={verifyingAadhaar} activeOpacity={0.85}>
                      {verifyingAadhaar ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Verify Aadhaar OTP</Text>}
                    </TouchableOpacity>
                  </>
                )
              ) : (
                <Text style={styles.successNote}>✓ Aadhaar identity verified via DigiLocker OTP.</Text>
              )}
            </View>
          );
        })()}

        {/* Bank Account Verification */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="business-outline" size={20} color={GOLD} />
            <Text style={styles.cardTitle}>3. Bank Account Penny Drop</Text>
            {status?.bankVerified && (
              <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>VERIFIED</Text></View>
            )}
          </View>
          {!status?.bankVerified ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Bank Account Number"
                placeholderTextColor="#94A3B8"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="IFSC Code (e.g. SBIN0001234)"
                placeholderTextColor="#94A3B8"
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyBank} disabled={verifyingBank} activeOpacity={0.85}>
                {verifyingBank ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Verify Bank Account</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.successNote}>✓ Bank account penny drop verified for instant payouts.</Text>
          )}
        </View>

        {/* UPI Verification */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flash-outline" size={20} color={GOLD} />
            <Text style={styles.cardTitle}>4. Instant UPI Payout Handle</Text>
            {status?.upiVerified && (
              <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>VERIFIED</Text></View>
            )}
          </View>
          {!status?.upiVerified ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter UPI ID (e.g. mobile@upi)"
                placeholderTextColor="#94A3B8"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyUpi} disabled={verifyingUpi} activeOpacity={0.85}>
                {verifyingUpi ? <ActivityIndicator color={GOLD} /> : <Text style={styles.submitBtnText}>Verify UPI ID</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.successNote}>✓ UPI ID verified for instant campaign payouts.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },
  loadingContainer: { flex: 1, backgroundColor: BG_MATTE, alignItems: 'center', justifyContent: 'center' },
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
  backBtn: { width: 38, height: 38, backgroundColor: '#1A1410', borderWidth: 1, borderColor: '#3A2C22', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { color: GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 40 },

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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: ESPRESSO, fontSize: FontSize.xs, fontWeight: '900', flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  verifiedBadge: { backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  rejectedBox: { backgroundColor: '#FEF2F2', padding: 10, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8 },
  rejectedTitle: { color: '#DC2626', fontSize: 11, fontWeight: '900' },
  rejectedSub: { color: '#7F1D1D', fontSize: 10, marginTop: 2 },

  pendingBox: { backgroundColor: '#FFFBEB', padding: 10, borderWidth: 1, borderColor: GOLD, borderRadius: 8 },
  pendingTitle: { color: ESPRESSO, fontSize: 11, fontWeight: '900' },
  pendingSub: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },

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
  successNote: { color: '#059669', fontSize: FontSize.xs, fontWeight: '700' },
});

