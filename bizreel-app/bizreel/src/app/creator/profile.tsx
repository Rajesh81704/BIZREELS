/**
 * Creator Profile Management Screen
 * Parity with Web CreatorProfilePage.jsx
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/context';
import { api } from '@/lib/api';

const AMBER_GOLD = '#D99A3D';
const DARK_ESPRESSO = '#241B15';
const WARM_CREAM = '#F8F4EC';
const WHITE_CARD = '#FFFFFF';
const BORDER_COLOR = '#E3DCCB';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';

export default function CreatorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  const u = (user as any) || {};
  const cp = u.creatorProfile || {};

  const [displayName, setDisplayName] = useState(cp.displayName || cp.name || u.name || '');
  const [category, setCategory] = useState(cp.category || cp.creatorCategories?.[0] || 'Product Reel Creator');
  const [bio, setBio] = useState(cp.bio || '');
  const [mobileNumber, setMobileNumber] = useState(cp.mobileNumber || u.phone || '');
  const [email, setEmail] = useState(cp.email || u.email || '');

  // Address
  const [city, setCity] = useState(cp.address?.city || cp.city || u.city || '');
  const [stateName, setStateName] = useState(cp.address?.state || cp.state || '');
  const [pincode, setPincode] = useState(cp.address?.pincode || cp.pincode || '');

  // Social Links
  const [instagram, setInstagram] = useState(cp.portfolio?.instagramLink || cp.socialMedia?.instagram?.handleOrUrl || '');
  const [youtube, setYoutube] = useState(cp.portfolio?.youtubeLink || '');
  const [portfolioVideo, setPortfolioVideo] = useState(cp.portfolio?.portfolioVideoLink || '');

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!displayName.trim() || !city.trim()) {
      Alert.alert('Required Fields', 'Please enter your Display Name and City location.');
      return;
    }

    setSaving(true);
    try {
      const updatedCreatorProfile = {
        ...cp,
        displayName: displayName.trim(),
        name: displayName.trim(),
        category: category.trim(),
        bio: bio.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        address: {
          ...(cp.address || {}),
          city: city.trim(),
          state: stateName.trim(),
          pincode: pincode.trim(),
        },
        portfolio: {
          ...(cp.portfolio || {}),
          instagramLink: instagram.trim(),
          youtubeLink: youtube.trim(),
          portfolioVideoLink: portfolioVideo.trim(),
        },
        updatedAt: new Date().toISOString(),
      };

      const res = await api.patch('/users/me', {
        name: displayName.trim(),
        city: city.trim(),
        creatorProfile: updatedCreatorProfile,
      });

      const updatedUser = res.data?.data?.user || res.data?.user || res.data;
      if (updatedUser) {
        setUser({
          ...user,
          ...updatedUser,
          activeRole: 'creator',
          current_role: 'creator',
        });
      }

      Alert.alert('Success 🎉', 'Creator Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Ionicons name="arrow-back" size={20} color="#241B15" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR HUB</Text>
          <Text style={styles.headerTitle}>CREATOR PROFILE &amp; BIO</Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/creator/onboarding')}>
          <Ionicons name="create-outline" size={18} color="#241B15" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Intro */}
        <View style={styles.bannerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerSubtitle}>PORTFOLIO &amp; STAGE PROFILE</Text>
            <Text style={styles.bannerTitle}>SHOWCASE YOUR CREATIVE BRAND</Text>
            <Text style={styles.bannerDesc}>Update your stage name, bio pitch, contact info, and portfolio links for local business clients.</Text>
          </View>
          <View style={styles.bannerIconBox}>
            <Ionicons name="person" size={22} color="#D99A3D" />
          </View>
        </View>

        {/* Identity & Category Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Identity &amp; Category Specialty</Text>
          </View>

          <Text style={styles.label}>Creator Display Name *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Rahul Content Studio"
            placeholderTextColor="#9E9287"
          />

          <Text style={styles.label}>Primary Specialty / Category</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Product Reel Creator"
            placeholderTextColor="#9E9287"
          />

          <Text style={styles.label}>Creator Bio / Pitch</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell local vendors and brands why they should collaborate with you..."
            placeholderTextColor="#9E9287"
            multiline
          />
        </View>

        {/* Contact & Location Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>2</Text>
            </View>
            <Text style={styles.cardTitle}>Contact &amp; Physical Location</Text>
          </View>

          <Text style={styles.label}>Mobile Phone Number</Text>
          <TextInput
            style={styles.input}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
            placeholderTextColor="#9E9287"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="creator@example.com"
            placeholderTextColor="#9E9287"
            autoCapitalize="none"
          />

          <Text style={styles.label}>City Location *</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Mumbai, Bengaluru, Raipur"
            placeholderTextColor="#9E9287"
          />

          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={stateName}
            onChangeText={setStateName}
            placeholder="e.g. Maharashtra"
            placeholderTextColor="#9E9287"
          />
        </View>

        {/* Social Links Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.numBadge}>
              <Text style={styles.numBadgeText}>3</Text>
            </View>
            <Text style={styles.cardTitle}>Social Handles &amp; Portfolio Links</Text>
          </View>

          <Text style={styles.label}>Instagram Handle or Link</Text>
          <TextInput
            style={styles.input}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="https://instagram.com/handle"
            placeholderTextColor="#9E9287"
            autoCapitalize="none"
          />

          <Text style={styles.label}>YouTube Channel Link</Text>
          <TextInput
            style={styles.input}
            value={youtube}
            onChangeText={setYoutube}
            placeholder="https://youtube.com/@channel"
            placeholderTextColor="#9E9287"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Sample Reel / Portfolio Video Link</Text>
          <TextInput
            style={styles.input}
            value={portfolioVideo}
            onChangeText={setPortfolioVideo}
            placeholder="https://drive.google.com/..."
            placeholderTextColor="#9E9287"
            autoCapitalize="none"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProfile} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator color={AMBER_GOLD} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={18} color={AMBER_GOLD} />
              <Text style={styles.submitBtnText}>SAVE CREATOR PROFILE</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WARM_CREAM },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: WHITE_CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    gap: Spacing.three,
  },
  backBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#F4EFE6',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  headerBadge: { color: AMBER_GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: DARK_ESPRESSO, fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 0.5 },
  actionBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#F4EFE6',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 40 },

  bannerCard: {
    backgroundColor: WHITE_CARD,
    padding: Spacing.four,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  bannerSubtitle: { color: AMBER_GOLD, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
  bannerTitle: { color: DARK_ESPRESSO, fontSize: FontSize.base, fontWeight: '900', letterSpacing: 0.5 },
  bannerDesc: { color: TEXT_MUTED, fontSize: FontSize.xs, marginTop: 4, lineHeight: 16 },
  bannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: DARK_ESPRESSO,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: WHITE_CARD,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: Spacing.four,
    borderRadius: 14,
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 10,
    marginBottom: 4,
  },
  numBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: DARK_ESPRESSO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: { color: AMBER_GOLD, fontSize: 11, fontWeight: '900' },
  cardTitle: { color: DARK_ESPRESSO, fontSize: FontSize.xs, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  label: { color: DARK_ESPRESSO, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6 },
  input: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    color: TEXT_DARK,
    paddingHorizontal: Spacing.three,
    height: 44,
    fontSize: FontSize.xs,
    fontWeight: '600',
    borderRadius: 10,
  },

  submitBtn: {
    backgroundColor: DARK_ESPRESSO,
    borderWidth: 1.5,
    borderColor: AMBER_GOLD,
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: { color: AMBER_GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 1 },
});
