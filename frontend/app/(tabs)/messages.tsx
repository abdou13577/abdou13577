import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import api from '../../services/api';
import { COLORS } from '../../constants/colors';

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_image: string | null;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  last_message: string;
  last_message_time: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.conversationCard} onPress={() => router.push(`/messages/${item.listing_id}/${item.other_user_id}` as any)}>
      {item.other_user_image ? (
        <Image source={{ uri: item.other_user_image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={24} color={COLORS.black} />
        </View>
      )}
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName} numberOfLines={1}>{item.other_user_name}</Text>
          <Text style={styles.timeText}>{format(new Date(item.last_message_time), 'HH:mm')}</Text>
        </View>
        <Text style={styles.listingTitle} numberOfLines={1}>{item.listing_title}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message}</Text>
      </View>
      {item.listing_image && <Image source={{ uri: item.listing_image }} style={styles.listingThumbnail} />}
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
        <Text style={styles.headerTitle}>Nachrichten</Text>
      </View>
      <FlatList data={conversations} renderItem={renderConversation} keyExtractor={(item) => `${item.listing_id}_${item.other_user_id}`} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.red} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Keine Nachrichten</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.red },
  conversationCard: { flexDirection: 'row', backgroundColor: COLORS.cardBackground, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: COLORS.gold, justifyContent: 'center', alignItems: 'center' },
  conversationContent: { flex: 1, justifyContent: 'center' },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  timeText: { fontSize: 12, color: COLORS.textMuted },
  listingTitle: { fontSize: 14, color: COLORS.red, marginBottom: 4 },
  lastMessage: { fontSize: 14, color: COLORS.textSecondary },
  listingThumbnail: { width: 56, height: 56, borderRadius: 8, marginLeft: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 16 },
});
