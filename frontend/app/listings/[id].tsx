import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    loadListing();
    if (user) {
      checkFavorite();
    }
  }, [id, user]);

  const loadListing = async () => {
    try {
      const response = await api.get(`/listings/${id}`);
      setListing(response.data);
    } catch (error) {
      Alert.alert('Fehler', 'Anzeige konnte nicht geladen werden');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const response = await api.get(`/favorites/check/${id}`);
      setIsFavorited(response.data.is_favorited);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert(
        'Anmelden erforderlich',
        'Sie müssen sich anmelden, um Favoriten zu speichern.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Anmelden', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        await api.delete(`/favorites/${id}`);
        setIsFavorited(false);
        Alert.alert('Erfolg', 'Aus Favoriten entfernt');
      } else {
        await api.post(`/favorites/${id}`);
        setIsFavorited(true);
        Alert.alert('Erfolg', 'Zu Favoriten hinzugefügt');
      }
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Aktion fehlgeschlagen');
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  if (!listing) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.red} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {listing.images && listing.images.length > 0 && (
          <View style={styles.imagesSection}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {listing.images.map((image: string, index: number) => (
                <Image key={index} source={{ uri: image }} style={styles.image} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.mainInfo}>
          <Text style={styles.price}>€{listing.price}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{listing.views} Ansichten</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{format(new Date(listing.created_at), 'dd.MM.yyyy')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beschreibung</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {listing.category_fields && Object.keys(listing.category_fields).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {Object.entries(listing.category_fields).map(([key, value]) => (
              <View key={key} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{key}:</Text>
                <Text style={styles.detailValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verkäufer</Text>
          <View style={styles.sellerInfo}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="person" size={24} color={COLORS.black} />
            </View>
            <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>{listing.seller_name}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {(!user || user?.id !== listing.seller_id) && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.contactButton} 
            onPress={() => {
              if (!user) {
                Alert.alert(
                  'Anmelden erforderlich',
                  'Sie müssen sich anmelden, um den Verkäufer zu kontaktieren.',
                  [
                    { text: 'Abbrechen', style: 'cancel' },
                    { text: 'Anmelden', onPress: () => router.push('/auth/login') },
                    { text: 'Registrieren', onPress: () => router.push('/auth/register') }
                  ]
                );
              } else {
                router.push(`/messages/${listing.id}/${listing.seller_id}` as any);
              }
            }}
          >
            <Ionicons name="chatbubble" size={20} color={COLORS.black} />
            <Text style={styles.contactButtonText}>Nachricht senden</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, zIndex: 10, backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  imagesSection: { position: 'relative' },
  image: { width: width, height: 400 },
  mainInfo: { backgroundColor: COLORS.cardBackground, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  price: { fontSize: 28, fontWeight: 'bold', color: COLORS.red, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
  metaInfo: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, color: COLORS.textMuted },
  section: { backgroundColor: COLORS.cardBackground, padding: 16, marginTop: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  description: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 16, color: COLORS.textMuted },
  detailValue: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '600' },
  sellerInfo: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sellerDetails: { flex: 1 },
  sellerName: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  footer: { backgroundColor: COLORS.cardBackground, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 12, gap: 6 },
  contactButtonText: { color: COLORS.black, fontSize: 16, fontWeight: '600' },
});
