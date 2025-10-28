import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS } from '../../constants/colors';

interface Listing {
  id: string;
  title: string;
  price: number;
  images: string[];
  category: string;
  views: number;
  created_at: string;
}

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const response = await api.get('/listings/my');
      setListings(response.data);
    } catch (error) {
      console.error('Error loading listings:', error);
      Alert.alert('Fehler', 'Anzeigen konnten nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const deleteListing = async (listingId: string) => {
    try {
      await api.delete(`/listings/${listingId}`);
      setListings(listings.filter(listing => listing.id !== listingId));
      Alert.alert('Erfolg', 'Anzeige gelöscht');
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Löschen fehlgeschlagen');
    }
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push(`/listings/${item.id}` as any)}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={48} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.price}>€{item.price.toFixed(2)}</Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="eye" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.views} Ansichten</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => {
            Alert.alert(
              'Anzeige löschen?',
              'Möchten Sie diese Anzeige wirklich löschen?',
              [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => deleteListing(item.id) }
              ]
            );
          }}
        >
          <Ionicons name="trash" size={24} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Meine Anzeigen</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={listings}
        renderItem={renderListing}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={80} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Keine Anzeigen</Text>
            <Text style={styles.emptyText}>
              Sie haben noch keine Anzeigen erstellt. Erstellen Sie Ihre erste Anzeige!
            </Text>
            <TouchableOpacity 
              style={styles.createButton} 
              onPress={() => router.push('/listings/create' as any)}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.black} />
              <Text style={styles.createButtonText}>Anzeige erstellen</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={listings.length === 0 ? styles.emptyList : styles.list}
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
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: 100,
    height: 120,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  deleteButton: {
    padding: 8,
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '700',
  },
});
