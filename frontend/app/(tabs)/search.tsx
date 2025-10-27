import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

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
          <Ionicons name="image-outline" size={40} color="#C7C7CC" />
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
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nach allem suchen..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchButtonText}>Suchen</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : searched ? (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listingsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color="#C7C7CC" />
              <Text style={styles.emptyText}>Keine Ergebnisse gefunden</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color="#C7C7CC" />
          <Text style={styles.emptyText}>Anzeigen durchsuchen</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  searchContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#FFFFFF', gap: 8 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1C1C1E' },
  searchButton: { backgroundColor: '#007AFF', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  searchButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listingsList: { padding: 8 },
  listingCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, margin: 8, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  listingImage: { width: '100%', height: 150, backgroundColor: '#F2F2F7' },
  noImage: { justifyContent: 'center', alignItems: 'center' },
  listingInfo: { padding: 12 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 },
  listingPrice: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 16 },
});
