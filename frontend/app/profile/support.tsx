import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { COLORS } from '../../constants/colors';

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus');
      return;
    }
    setLoading(true);
    try {
      await api.post('/support', { subject, message });
      Alert.alert('Erfolg!', 'Ihre Nachricht wurde gesendet. Wir werden uns bald bei Ihnen melden.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Nachricht senden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.red} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="help-circle" size={60} color={COLORS.red} />
          <Text style={styles.infoTitle}>Wie können wir helfen?</Text>
          <Text style={styles.infoText}>
            Haben Sie Fragen oder Probleme? Kontaktieren Sie unser Support-Team.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Betreff *</Text>
            <TextInput
              style={styles.input}
              placeholder="Betreff eingeben"
              placeholderTextColor={COLORS.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Nachricht *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Beschreiben Sie Ihr Anliegen"
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="send" size={20} color={COLORS.black} />
            <Text style={styles.submitButtonText}>{loading ? 'Wird gesendet...' : 'Nachricht senden'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>Andere Kontaktmöglichkeiten:</Text>
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={20} color={COLORS.gold} />
            <Text style={styles.contactText}>support@chancenmarket.com</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="time" size={20} color={COLORS.gold} />
            <Text style={styles.contactText}>Mo-Fr: 9:00 - 18:00 Uhr</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  content: { padding: 16 },
  infoCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  infoTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  infoText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  form: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 150, textAlignVertical: 'top' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold, paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 8 },
  submitButtonDisabled: { backgroundColor: COLORS.textMuted },
  submitButtonText: { color: COLORS.black, fontSize: 18, fontWeight: 'bold' },
  contactInfo: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  contactTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  contactText: { fontSize: 16, color: COLORS.textSecondary },
});
