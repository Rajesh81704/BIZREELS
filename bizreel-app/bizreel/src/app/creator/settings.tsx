import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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

export default function CreatorSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete BizReels Account ⚠️',
      'Are you sure you want to permanently delete your BizReels Creator account? Your portfolio, reels, and data will be permanently removed. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/v1/auth/profile').catch(() => api.delete('/auth/profile'));
              Alert.alert('Account Deleted', 'Your creator account has been permanently deleted.');
              if (signOut) {
                await signOut();
              }
              router.replace('/(auth)/login' as any);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState((user as any)?.creatorProfile?.bio || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/users/me', {
        name: name.trim(),
        creatorProfile: {
          bio: bio.trim(),
        },
      });
      const updatedUser = res.data?.data?.user || res.data?.user || res.data;
      if (updatedUser) setUser(updatedUser);
      Alert.alert('Success', 'Creator settings saved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please enter both current and new password');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/me/password', {
        currentPassword,
        newPassword,
      });
      Alert.alert('Success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Ionicons name="arrow-back" size={20} color={GOLD} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBadge}>CREATOR STUDIO</Text>
          <Text style={styles.headerTitle}>CREATOR SETTINGS</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Email Address</Text>
          <TextInput style={[styles.input, { opacity: 0.6 }]} value={email} editable={false} />

          <Text style={styles.label}>Creator Bio / Tagline</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
            placeholder="Tell vendors about your video creation skills..."
            placeholderTextColor="#94A3B8"
            value={bio}
            onChangeText={setBio}
            multiline
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={GOLD} /> : <Text style={styles.saveBtnText}>Save Profile Settings</Text>}
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security &amp; Password</Text>

          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={GOLD} /> : <Text style={styles.saveBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>

        {/* Privacy Policy & Terms */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => Linking.openURL('https://bizreels.in/privacy-policy')}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="document-text-outline" size={20} color={GOLD} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>PRIVACY POLICY &amp; TERMS</Text>
              <Text style={{ color: TEXT_MUTED, fontSize: FontSize.xs }}>https://bizreels.in/privacy-policy</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={GOLD} />
          </View>
        </TouchableOpacity>

        {/* Danger Zone: Delete Account */}
        <View style={[styles.card, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.cardTitle, { color: '#DC2626' }]}>DANGER ZONE</Text>
          <Text style={{ color: '#7F1D1D', fontSize: FontSize.xs }}>
            Permanently delete your creator account, public portfolio, reels, and wallet history.
          </Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_MATTE },
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
    gap: Spacing.two,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { color: ESPRESSO, fontSize: FontSize.xs, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { color: '#334155', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
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
  saveBtn: {
    backgroundColor: ESPRESSO,
    borderWidth: 1,
    borderColor: ESPRESSO,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: { color: GOLD, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 0.5 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#DC2626', height: 44, borderRadius: 10, marginTop: 8 },
  deleteBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '900' },
});

