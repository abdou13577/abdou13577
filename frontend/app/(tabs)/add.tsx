import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';

export default function AddScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleCreateListing = () => {
    if (!user) {
      Alert.alert(
        'Anmelden erforderlich',
        'Sie müssen sich anmelden, um eine Anzeige zu erstellen.',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Anmelden', onPress: () => router.push('/auth/login') },
          { text: 'Registrieren', onPress: () => router.push('/auth/register') }
        ]
      );
    } else {
      router.push('/listings/create' as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Anzeige erstellen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={40} color={COLORS.red} />
          <Text style={styles.infoTitle}>Jetzt inserieren!</Text>
          <Text style={styles.infoText}>Verkaufen Sie Ihre Produkte einfach. Wählen Sie eine passende Kategorie für Ihre Anzeige.</Text>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateListing}>
          <Ionicons name="add-circle" size={24} color={COLORS.black} />
          <Text style={styles.createButtonText}>Neue Anzeige erstellen</Text>
        </TouchableOpacity>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Anzeigen-Features:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="sparkles" size={20} color={COLORS.gold} />
            <Text style={styles.featureText}>KI-Beschreibung generieren</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cash" size={20} color={COLORS.gold} />
            <Text style={styles.featureText}>KI-Preisvorschlag</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="images" size={20} color={COLORS.gold} />
            <Text style={styles.featureText}>Bilder & Videos hochladen</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="list" size={20} color={COLORS.gold} />
            <Text style={styles.featureText}>Kategorie-spezifische Felder</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.red },
  content: { padding: 16 },
  infoCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  infoTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  infoText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: 12, marginBottom: 24 },
  createButtonText: { color: COLORS.black, fontSize: 18, fontWeight: '600', marginLeft: 8 },
  featuresCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  featuresTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 16, color: COLORS.textPrimary, marginLeft: 12 },
});
