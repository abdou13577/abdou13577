import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
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

interface Category {
  id: string;
  name_de: string;
  icon: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [listingsRes, categoriesRes] = await Promise.all([api.get('/listings', { params: { limit: 20 } }), api.get('/categories')]);
      setListings(listingsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadListingsByCategory = async (categoryId: string | null) => {
    setLoading(true);
    try {
      const params = categoryId ? { category: categoryId, limit: 20 } : { limit: 20 };
      const response = await api.get('/listings', { params });
      setListings(response.data);
      setSelectedCategory(categoryId);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity style={[styles.categoryCard, selectedCategory === item.id && styles.categoryCardSelected]} onPress={() => loadListingsByCategory(item.id)}>
      <Ionicons name={item.icon as any} size={24} color={selectedCategory === item.id ? COLORS.black : COLORS.gold} />
      <Text style={[styles.categoryText, selectedCategory === item.id && styles.categoryTextSelected]}>{item.name_de}</Text>
    </TouchableOpacity>
  );

  const renderListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.listingCard} onPress={() => router.push(`/listings/${item.id}` as any)}>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.listingImage} resizeMode="cover" />
      ) : (
        <View style={[styles.listingImage, styles.noImage]}>
          <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.listingPrice}>€{item.price}</Text>
        <View style={styles.listingMeta}>
          <Ionicons name="eye-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.listingViews}>{item.views}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChancenMarket</Text>
      </View>

      <View style={styles.categoriesSection}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={[{ id: null, name_de: 'Alle', icon: 'apps' }, ...categories] as any} renderItem={renderCategory} keyExtractor={(item) => item.id || 'all'} contentContainerStyle={styles.categoriesList} />
      </View>

      <FlatList data={listings} renderItem={renderListing} keyExtractor={(item) => item.id} numColumns={2} contentContainerStyle={styles.listingsList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Keine Anzeigen</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.red },
  categoriesSection: { backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoriesList: { paddingHorizontal: 16, paddingVertical: 12 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  categoryCardSelected: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  categoryText: { fontSize: 14, fontWeight: '600', color: COLORS.gold, marginLeft: 6 },
  categoryTextSelected: { color: COLORS.black },
  listingsList: { padding: 8 },
  listingCard: { flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: 12, margin: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  listingImage: { width: '100%', height: 150, backgroundColor: COLORS.background },
  noImage: { justifyContent: 'center', alignItems: 'center' },
  listingInfo: { padding: 12 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  listingPrice: { fontSize: 18, fontWeight: 'bold', color: COLORS.red, marginBottom: 8 },
  listingMeta: { flexDirection: 'row', alignItems: 'center' },
  listingViews: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 16 },
});
