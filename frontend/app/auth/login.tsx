import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Felder aus');
      return;
    }
    setLoading(true);
    try {
      console.log('Calling login function...');
      await login(email, password);
      console.log('Login successful!');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      Alert.alert('Anmeldefehler', error.message || 'Benutzername oder Passwort ist falsch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="COLORS.gold" />
        </TouchableOpacity>
        <View style={styles.header}>
          <Ionicons name="log-in" size={60} color="COLORS.gold" />
          <Text style={styles.title}>Anmelden</Text>
          <Text style={styles.subtitle}>Willkommen zurück!</Text>
        </View>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="COLORS.textMuted" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="COLORS.textMuted" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Passwort" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="COLORS.textMuted" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginButtonText}>{loading ? 'Anmeldung läuft...' : 'Anmelden'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerLinkText}>Noch kein Konto? <Text style={styles.registerLinkBold}>Jetzt registrieren</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'COLORS.background' },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { marginBottom: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'COLORS.textPrimary', marginTop: 16 },
  subtitle: { fontSize: 16, color: 'COLORS.textMuted', marginTop: 8 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: 'COLORS.textPrimary' },
  eyeIcon: { padding: 4 },
  loginButton: { backgroundColor: 'COLORS.gold', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  loginButtonDisabled: { backgroundColor: '#B0D5FF' },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerLinkText: { fontSize: 16, color: 'COLORS.textMuted' },
  registerLinkBold: { color: 'COLORS.gold', fontWeight: '600' },
});
