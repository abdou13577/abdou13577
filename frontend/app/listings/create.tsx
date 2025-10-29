import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { COLORS } from '../../constants/colors';

interface Category {
  id: string;
  name_de: string;
  icon: string;
  fields: Array<{ name: string; label: string; type: string; options?: any; }>;
}

export default function CreateListingScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryFields, setCategoryFields] = useState<Record<string, any>>({});
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [location, setLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Fehler', 'Wir benötigen Zugriff auf Ihre Galerie');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.7, base64: true });
    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => `data:image/jpeg;base64,${asset.base64}`);
      setImages([...images, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImageUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setImages(newImages);
  };

  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setImages(newImages);
  };

  const generateDescription = async () => {
    if (!title || !selectedCategory) {
      Alert.alert('Fehler', 'Bitte geben Sie zuerst Titel und Kategorie ein');
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.post('/ai/generate-description', { title, category: selectedCategory.name_de, category_fields: categoryFields });
      setDescription(response.data.description);
      Alert.alert('Erfolg!', 'Beschreibung erfolgreich generiert');
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Beschreibungsgenerierung fehlgeschlagen');
    } finally {
      setAiLoading(false);
    }
  };

  const suggestPrice = async () => {
    if (!title || !selectedCategory) {
      Alert.alert('Fehler', 'Bitte geben Sie zuerst Titel und Kategorie ein');
      return;
    }
    setAiLoading(true);
    try {
      const response = await api.post('/ai/suggest-price', { title, category: selectedCategory.name_de, condition: categoryFields.condition, category_fields: categoryFields });
      Alert.alert('Preisvorschlag', response.data.suggested_price);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Preisvorschlag fehlgeschlagen');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !price || !selectedCategory) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Fehler', 'Bitte fügen Sie mindestens ein Bild hinzu');
      return;
    }
    setLoading(true);
    try {
      await api.post('/listings', { 
        title, 
        description, 
        price: parseFloat(price.replace(/,/g, '')), // إزالة الفواصل قبل الإرسال
        category: selectedCategory.id, 
        images, 
        videos, 
        category_fields: categoryFields,
        negotiable,
        location: location || undefined,
      });
      Alert.alert('Erfolg!', 'Anzeige erfolgreich erstellt', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Anzeigenerstellung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryField = (field: any) => {
    const value = categoryFields[field.name] || '';
    if (field.type === 'select') {
      return (
        <View key={field.name} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {field.options.map((option: string) => (
              <TouchableOpacity key={option} style={[styles.optionChip, value === option && styles.optionChipSelected]} onPress={() => { setCategoryFields({ ...categoryFields, [field.name]: option }); if (field.name === 'brand') setSelectedBrand(option); }}>
                <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (field.type === 'select_dynamic' && field.name === 'model') {
      const models = selectedBrand && field.options[selectedBrand] ? field.options[selectedBrand] : [];
      if (models.length === 0) return null;
      return (
        <View key={field.name} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            scrollEnabled={true}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {models.map((option: string) => (
              <TouchableOpacity key={option} style={[styles.optionChip, value === option && styles.optionChipSelected]} onPress={() => setCategoryFields({ ...categoryFields, [field.name]: option })}>
                <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
    return (
      <View key={field.name} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <TextInput style={styles.input} placeholder={`${field.label} eingeben`} placeholderTextColor={COLORS.textMuted} value={value} onChangeText={(text) => setCategoryFields({ ...categoryFields, [field.name]: text })} keyboardType={field.type === 'number' ? 'numeric' : 'default'} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.red} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Anzeige erstellen</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategorie *</Text>
          <TouchableOpacity style={styles.categoryButton} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
            <Ionicons name={selectedCategory?.icon as any || 'apps'} size={24} color={COLORS.gold} />
            <Text style={styles.categoryButtonText}>{selectedCategory?.name_de || 'Kategorie wählen'}</Text>
            <Ionicons name="chevron-down" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.categoryPicker}>
              {categories.map((category) => (
                <TouchableOpacity key={category.id} style={styles.categoryOption} onPress={() => { setSelectedCategory(category); setShowCategoryPicker(false); setCategoryFields({}); setSelectedBrand(''); }}>
                  <Ionicons name={category.icon as any} size={24} color={COLORS.gold} />
                  <Text style={styles.categoryOptionText}>{category.name_de}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grundinformationen</Text>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Titel *</Text>
            <TextInput style={styles.input} placeholder="Anzeigentitel eingeben" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} />
          </View>
          <View style={styles.fieldContainer}>
            <View style={styles.labelWithButton}>
              <Text style={styles.fieldLabel}>Beschreibung *</Text>
              <TouchableOpacity style={styles.aiButton} onPress={generateDescription} disabled={aiLoading}>
                <Ionicons name="sparkles" size={16} color={COLORS.black} />
                <Text style={styles.aiButtonText}>KI</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Detaillierte Produktbeschreibung eingeben" placeholderTextColor={COLORS.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={5} />
          </View>
          <View style={styles.fieldContainer}>
            <View style={styles.labelWithButton}>
              <Text style={styles.fieldLabel}>Preis (€) *</Text>
              <TouchableOpacity style={styles.aiButton} onPress={suggestPrice} disabled={aiLoading}>
                <Ionicons name="cash" size={16} color={COLORS.black} />
                <Text style={styles.aiButtonText}>KI</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="z.B. 20000" 
              placeholderTextColor={COLORS.textMuted} 
              value={price} 
              onChangeText={(text) => {
                // إزالة جميع الأحرف غير الرقمية
                const numericValue = text.replace(/[^0-9]/g, '');
                // إضافة الفواصل
                if (numericValue) {
                  const formatted = parseInt(numericValue).toLocaleString('de-DE');
                  setPrice(formatted);
                } else {
                  setPrice('');
                }
              }} 
              keyboardType="numeric" 
            />
            
            {/* Checkbox قابل للتفاوض */}
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setNegotiable(!negotiable)}
            >
              <View style={[styles.checkbox, negotiable && styles.checkboxChecked]}>
                {negotiable && <Ionicons name="checkmark" size={18} color={COLORS.black} />}
              </View>
              <Text style={styles.checkboxLabel}>Preis ist verhandelbar (VB)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedCategory && selectedCategory.fields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details zu {selectedCategory.name_de}</Text>
            {selectedCategory.fields.map((field) => renderCategoryField(field))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bilder * (max. 5)</Text>
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                {index === 0 && <View style={styles.mainImageBadge}><Text style={styles.mainImageText}>Hauptbild</Text></View>}
                <View style={styles.imageControls}>
                  {index > 0 && (
                    <TouchableOpacity style={styles.imageControlButton} onPress={() => moveImageUp(index)}>
                      <Ionicons name="arrow-up" size={18} color={COLORS.black} />
                    </TouchableOpacity>
                  )}
                  {index < images.length - 1 && (
                    <TouchableOpacity style={styles.imageControlButton} onPress={() => moveImageDown(index)}>
                      <Ionicons name="arrow-down" size={18} color={COLORS.black} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={24} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Ionicons name="add" size={32} color={COLORS.gold} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.black} /> : (<><Ionicons name="checkmark-circle" size={24} color={COLORS.black} /><Text style={styles.submitButtonText}>Anzeige veröffentlichen</Text></>)}
        </TouchableOpacity>
      </ScrollView>

      {aiLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.red} />
            <Text style={styles.loadingText}>KI wird verarbeitet...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  content: { padding: 16 },
  section: { backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 16, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  categoryButtonText: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  categoryPicker: { marginTop: 8, backgroundColor: COLORS.background, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  categoryOption: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  categoryOptionText: { fontSize: 16, color: COLORS.textPrimary },
  fieldContainer: { marginBottom: 16 },
  labelWithButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  aiButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  aiButtonText: { color: COLORS.black, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 120, textAlignVertical: 'top' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.gold, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.gold },
  checkboxLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  optionChip: { backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  optionChipSelected: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  optionText: { fontSize: 14, color: COLORS.textPrimary },
  optionTextSelected: { color: COLORS.black },
  imagesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageWrapper: { position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 12 },
  mainImageBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  mainImageText: { fontSize: 10, fontWeight: '700', color: COLORS.black },
  imageControls: { position: 'absolute', bottom: 4, left: 4, right: 4, flexDirection: 'row', gap: 4, justifyContent: 'center' },
  imageControlButton: { backgroundColor: COLORS.gold, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.cardBackground, borderRadius: 12 },
  addImageButton: { width: 100, height: 100, backgroundColor: COLORS.background, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.gold, borderStyle: 'dashed' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold, padding: 16, borderRadius: 12, gap: 8, marginTop: 8, marginBottom: 32 },
  submitButtonDisabled: { backgroundColor: COLORS.textMuted },
  submitButtonText: { color: COLORS.black, fontSize: 18, fontWeight: 'bold' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textPrimary },
});
