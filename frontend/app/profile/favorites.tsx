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
  created_at: string;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await api.get('/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Fehler', 'Favoriten konnten nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const removeFavorite = async (listingId: string) => {
    try {
      await api.delete(`/favorites/${listingId}`);
      setFavorites(favorites.filter(fav => fav.id !== listingId));
      Alert.alert('Erfolg', 'Aus Favoriten entfernt');
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Aktion fehlgeschlagen');
    }
  };

  const renderFavorite = ({ item }: { item: Listing }) => (
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
      </View>
      <TouchableOpacity 
        style={styles.removeButton} 
        onPress={() => {
          Alert.alert(
            'Aus Favoriten entfernen?',
            'Möchten Sie diese Anzeige wirklich aus Ihren Favoriten entfernen?',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Entfernen', style: 'destructive', onPress: () => removeFavorite(item.id) }
            ]
          );
        }}
      >
        <Ionicons name="heart" size={24} color={COLORS.red} />
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Meine Favoriten</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Keine Favoriten</Text>
            <Text style={styles.emptyText}>
              Fügen Sie Ihre Lieblingsanzeigen zu Favoriten hinzu, um sie hier zu sehen.
            </Text>
          </View>
        }
        contentContainerStyle={favorites.length === 0 ? styles.emptyList : styles.list}
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
    paddingVertical: 16,
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
    height: 100,
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
  },
  removeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
