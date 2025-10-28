import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS } from '../../constants/colors';

interface Offer {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  buyer_id: string;
  buyer_name: string;
  offered_price: number;
  original_price: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export default function OffersScreen() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const response = await api.get('/offers/my');
      setOffers(response.data);
    } catch (error) {
      console.error('Error loading offers:', error);
      Alert.alert('Fehler', 'Angebote konnten nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOffers();
  };

  const handleOffer = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      await api.post(`/offers/${offerId}/${action}`);
      Alert.alert('Erfolg', action === 'accept' ? 'Angebot angenommen' : 'Angebot abgelehnt');
      loadOffers();
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Aktion fehlgeschlagen');
    }
  };

  const renderOffer = ({ item }: { item: Offer }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.listingInfo}>
          {item.listing_image ? (
            <Image source={{ uri: item.listing_image }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
            </View>
          )}
          <View style={styles.textInfo}>
            <Text style={styles.listingTitle} numberOfLines={2}>{item.listing_title}</Text>
            <Text style={styles.buyerName}>Von: {item.buyer_name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.priceSection}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Originalpreis:</Text>
          <Text style={styles.originalPrice}>€{item.original_price.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Angebotspreis:</Text>
          <Text style={styles.offeredPrice}>€{item.offered_price.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Differenz:</Text>
          <Text style={[styles.difference, item.offered_price < item.original_price ? styles.differenceNegative : styles.differencePositive]}>
            {item.offered_price < item.original_price ? '-' : '+'}€{Math.abs(item.original_price - item.offered_price).toFixed(2)}
          </Text>
        </View>
      </View>

      {item.status === 'pending' ? (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.rejectButton} 
            onPress={() => {
              Alert.alert(
                'Angebot ablehnen?',
                'Möchten Sie dieses Angebot wirklich ablehnen?',
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Ablehnen', style: 'destructive', onPress: () => handleOffer(item.id, 'reject') }
                ]
              );
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.error} />
            <Text style={styles.rejectButtonText}>Ablehnen</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acceptButton} 
            onPress={() => {
              Alert.alert(
                'Angebot annehmen?',
                'Möchten Sie dieses Angebot annehmen?',
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Annehmen', onPress: () => handleOffer(item.id, 'accept') }
                ]
              );
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.black} />
            <Text style={styles.acceptButtonText}>Annehmen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusBadge}>
          <Ionicons 
            name={item.status === 'accepted' ? 'checkmark-circle' : 'close-circle'} 
            size={16} 
            color={item.status === 'accepted' ? COLORS.success : COLORS.error} 
          />
          <Text style={[styles.statusText, item.status === 'accepted' ? styles.statusAccepted : styles.statusRejected]}>
            {item.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preisangebote</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={80} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Keine Angebote</Text>
            <Text style={styles.emptyText}>
              Sie haben noch keine Preisangebote erhalten.
            </Text>
          </View>
        }
        contentContainerStyle={offers.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.red,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    marginBottom: 16,
  },
  listingInfo: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  buyerName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceSection: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  originalPrice: {
    fontSize: 14,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  offeredPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  difference: {
    fontSize: 14,
    fontWeight: '600',
  },
  differenceNegative: {
    color: COLORS.error,
  },
  differencePositive: {
    color: COLORS.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.error,
    gap: 6,
  },
  rejectButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '700',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusAccepted: {
    color: COLORS.success,
  },
  statusRejected: {
    color: COLORS.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
