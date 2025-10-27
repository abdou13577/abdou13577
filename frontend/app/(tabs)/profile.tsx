import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchten Sie sich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mein Profil</Text>
      </View>
      <ScrollView>
        <View style={styles.profileHeader}>
          {user.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={48} color={COLORS.black} />
            </View>
          )}
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color={COLORS.gold} />
              <Text style={styles.ratingText}>{user.rating.toFixed(1)} ({user.review_count} Bewertungen)</Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meine Anzeigen</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/my-listings' as any)}>
            <Ionicons name="list" size={24} color={COLORS.gold} />
            <Text style={styles.menuText}>Meine Anzeigen</Text>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/offers' as any)}>
            <Ionicons name="pricetag" size={24} color={COLORS.gold} />
            <Text style={styles.menuText}>Preisangebote</Text>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hilfe</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/support' as any)}>
            <Ionicons name="help-circle" size={24} color={COLORS.gold} />
            <Text style={styles.menuText}>Support</Text>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        {user.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verwaltung</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/dashboard' as any)}>
              <Ionicons name="shield" size={24} color={COLORS.red} />
              <Text style={styles.menuText}>Admin Dashboard</Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color={COLORS.red} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.red },
  profileHeader: { backgroundColor: COLORS.cardBackground, alignItems: 'center', paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  avatarPlaceholder: { backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  userEmail: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 12 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  ratingText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 6 },
  section: { marginTop: 24, backgroundColor: COLORS.cardBackground, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.background },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, marginLeft: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardBackground, marginTop: 24, marginHorizontal: 16, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: COLORS.red, marginBottom: 32 },
  logoutText: { fontSize: 18, fontWeight: '600', color: COLORS.red, marginLeft: 8 },
});
