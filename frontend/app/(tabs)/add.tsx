import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AddScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Anzeige erstellen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={40} color="#007AFF" />
          <Text style={styles.infoTitle}>Jetzt inserieren!</Text>
          <Text style={styles.infoText}>
            Verkaufen Sie Ihre Produkte einfach. Wählen Sie eine passende Kategorie für Ihre Anzeige.
          </Text>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/listings/create' as any)}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Neue Anzeige erstellen</Text>
        </TouchableOpacity>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Anzeigen-Features:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="sparkles" size={20} color="#007AFF" />
            <Text style={styles.featureText}>KI-Beschreibung generieren</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cash" size={20} color="#007AFF" />
            <Text style={styles.featureText}>KI-Preisvorschlag</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Bilder & Videos hochladen</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="list" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Kategorie-spezifische Felder</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  content: { padding: 16 },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  infoTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', marginTop: 16, marginBottom: 8 },
  infoText: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 24 },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, marginBottom: 24 },
  createButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  featuresCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  featuresTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 16, color: '#1C1C1E', marginLeft: 12 },
});
