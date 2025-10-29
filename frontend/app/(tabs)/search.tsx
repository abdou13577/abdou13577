import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
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
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const response = await api.get('/listings', { params: { search: searchQuery, limit: 50 } });
      setListings(response.data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

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
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Suchen</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Nach allem suchen..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={handleSearch} returnKeyType="search" />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchButtonText}>Suchen</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      ) : searched ? (
        <FlatList data={listings} renderItem={renderListing} keyExtractor={(item) => item.id} numColumns={2} contentContainerStyle={styles.listingsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Keine Ergebnisse gefunden</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Anzeigen durchsuchen</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.red },
  searchContainer: { flexDirection: 'row', padding: 16, backgroundColor: COLORS.cardBackground, gap: 8 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary },
  searchButton: { backgroundColor: COLORS.red, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  searchButtonText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listingsList: { padding: 8 },
  listingCard: { flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: 12, margin: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  listingImage: { width: '100%', height: 150, backgroundColor: COLORS.background },
  noImage: { justifyContent: 'center', alignItems: 'center' },
  listingInfo: { padding: 12 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  listingPrice: { fontSize: 18, fontWeight: 'bold', color: COLORS.red },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 16 },
});
