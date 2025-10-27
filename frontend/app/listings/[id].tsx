import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, TextInput, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface Listing {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  video: string | null;
  category_fields: Record<string, any>;
  views: number;
  created_at: string;
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadListing();
  }, [id]);

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

  const handleContact = () => {
    if (!listing) return;
    router.push(`/messages/${listing.id}/${listing.seller_id}` as any);
  };

  const handleSendOffer = async () => {
    if (!offerPrice) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Preis ein');
      return;
    }
    setSending(true);
    try {
      await api.post('/offers', {
        listing_id: listing?.id,
        seller_id: listing?.seller_id,
        offered_price: parseFloat(offerPrice),
        message: offerMessage,
      });
      Alert.alert('Erfolg!', 'Angebot erfolgreich gesendet');
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Angebot senden fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!listing) return null;
  const isOwner = user?.id === listing.seller_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {listing.images && listing.images.length > 0 && (
          <View style={styles.imagesSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {listing.images.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.image} resizeMode=\"cover\" />
              ))}
            </ScrollView>
            {listing.images.length > 1 && (
              <View style={styles.pagination}>
                {listing.images.map((_, index) => (
                  <View key={index} style={[styles.paginationDot, index === currentImageIndex && styles.paginationDotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.mainInfo}>
          <Text style={styles.price}>€{listing.price}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name=\"eye\" size={16} color=\"#8E8E93\" />
              <Text style={styles.metaText}>{listing.views} Ansichten</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name=\"time\" size={16} color=\"#8E8E93\" />
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
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verkäufer</Text>
          <View style={styles.sellerInfo}>
            <View style={styles.sellerAvatar}>
              <Ionicons name=\"person\" size={24} color=\"#FFFFFF\" />
            </View>
            <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>{listing.seller_name}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!isOwner && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.offerButton} onPress={() => setShowOfferModal(true)}>
            <Ionicons name=\"pricetag\" size={20} color=\"#007AFF\" />
            <Text style={styles.offerButtonText}>Angebot senden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <Ionicons name=\"chatbubble\" size={20} color=\"#FFFFFF\" />
            <Text style={styles.contactButtonText}>Nachricht</Text>
          </TouchableOpacity>
        </View>
      )}

      {showOfferModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preisangebot senden</Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <Ionicons name=\"close\" size={24} color=\"#1C1C1E\" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Ihr Angebot (€)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder=\"Preis eingeben\"
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType=\"numeric\"
              />
              <Text style={styles.modalLabel}>Nachricht (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder=\"Nachricht an Verkäufer\"
                value={offerMessage}
                onChangeText={setOfferMessage}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.sendOfferButton, sending && styles.sendOfferButtonDisabled]}
                onPress={handleSendOffer}
                disabled={sending}
              >
                {sending ? <ActivityIndicator color=\"#FFFFFF\" /> : <Text style={styles.sendOfferButtonText}>Angebot senden</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, zIndex: 10, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  imagesSection: { position: 'relative' },
  image: { width: width, height: 400 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 16, left: 0, right: 0 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.5)', marginHorizontal: 4 },
  paginationDotActive: { backgroundColor: '#FFFFFF', width: 24 },
  mainInfo: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  price: { fontSize: 28, fontWeight: 'bold', color: '#34C759', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', color: '#1C1C1E', marginBottom: 12 },
  metaInfo: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, color: '#8E8E93' },
  section: { backgroundColor: '#FFFFFF', padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 12 },
  description: { fontSize: 16, color: '#1C1C1E', lineHeight: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  detailLabel: { fontSize: 16, color: '#8E8E93' },
  detailValue: { fontSize: 16, color: '#1C1C1E', fontWeight: '600' },
  sellerInfo: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sellerDetails: { flex: 1 },
  sellerName: { fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  footer: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E5EA', gap: 12 },
  offerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#007AFF', gap: 6 },
  offerButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  contactButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, gap: 6 },
  contactButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' },
  modalBody: { padding: 16 },
  modalLabel: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  modalInput: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 12, fontSize: 16, color: '#1C1C1E', marginBottom: 16 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  sendOfferButton: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  sendOfferButtonDisabled: { backgroundColor: '#B0D5FF' },
  sendOfferButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
