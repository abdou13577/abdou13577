import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Register() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein';
    if (!/[A-Z]/.test(pwd)) return 'Passwort muss einen Großbuchstaben enthalten';
    if (!/[0-9]/.test(pwd)) return 'Passwort muss eine Zahl enthalten';
    return null;
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Passwortfehler', passwordError);
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registrierungsfehler', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.header}>
          <Ionicons name="person-add" size={60} color="#007AFF" />
          <Text style={styles.title}>Konto erstellen</Text>
          <Text style={styles.subtitle}>Jetzt bei uns anmelden</Text>
        </View>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Passwort" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordHints}>
            <Text style={styles.hintText}>• Mindestens 8 Zeichen</Text>
            <Text style={styles.hintText}>• Ein Großbuchstabe</Text>
            <Text style={styles.hintText}>• Eine Zahl</Text>
          </View>
          <TouchableOpacity style={[styles.registerButton, loading && styles.registerButtonDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.registerButtonText}>{loading ? 'Registrierung läuft...' : 'Registrieren'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLinkText}>Bereits ein Konto? <Text style={styles.loginLinkBold}>Anmelden</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1C1C1E', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#8E8E93', marginTop: 8 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#1C1C1E' },
  eyeIcon: { padding: 4 },
  passwordHints: { backgroundColor: '#F2F2F7', padding: 12, borderRadius: 8, marginBottom: 16 },
  hintText: { fontSize: 14, color: '#8E8E93', marginBottom: 4 },
  registerButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  registerButtonDisabled: { backgroundColor: '#B0D5FF' },
  registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { fontSize: 16, color: '#8E8E93' },
  loginLinkBold: { color: '#007AFF', fontWeight: '600' },
});
