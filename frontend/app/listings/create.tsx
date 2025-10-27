import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';

interface Category {
  id: string;
  name_ar: string;
  icon: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    options?: string[];
  }>;
}

export default function CreateListingScreen() {
  const router = useRouter();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryFields, setCategoryFields] = useState<Record<string, any>>({});
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  
  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

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
      Alert.alert('خطأ', 'نحتاج إلى إذن للوصول إلى المعرض');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(
        (asset) => `data:image/jpeg;base64,${asset.base64}`
      );
      setImages([...images, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        // For video, we'll store the URI temporarily
        // In production, you'd upload to a server
        Alert.alert('تم', 'تم تحديد الفيديو بنجاح');
        setVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const generateDescription = async () => {
    if (!title || !selectedCategory) {
      Alert.alert('خطأ', 'يرجى إدخال العنوان واختيار الفئة أولاً');
      return;
    }

    setAiLoading(true);
    try {
      const response = await api.post('/ai/generate-description', {
        title,
        category: selectedCategory.name_ar,
        category_fields: categoryFields,
      });
      setDescription(response.data.description);
      Alert.alert('تم!', 'تم توليد الوصف بنجاح');
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل توليد الوصف');
    } finally {
      setAiLoading(false);
    }
  };

  const suggestPrice = async () => {
    if (!title || !selectedCategory) {
      Alert.alert('خطأ', 'يرجى إدخال العنوان واختيار الفئة أولاً');
      return;
    }

    setAiLoading(true);
    try {
      const response = await api.post('/ai/suggest-price', {
        title,
        category: selectedCategory.name_ar,
        condition: categoryFields.condition,
        category_fields: categoryFields,
      });
      Alert.alert('اقتراح السعر', response.data.suggested_price);
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل اقتراح السعر');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !price || !selectedCategory) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (images.length === 0) {
      Alert.alert('خطأ', 'يرجى إضافة صورة واحدة على الأقل');
      return;
    }

    setLoading(true);
    try {
      await api.post('/listings', {
        title,
        description,
        price: parseFloat(price),
        category: selectedCategory.id,
        images,
        video,
        category_fields: categoryFields,
      });

      Alert.alert('نجح!', 'تم إنشاء الإعلان بنجاح', [
        {
          text: 'موافق',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('خطأ', error.response?.data?.detail || 'فشل إنشاء الإعلان');
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
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  value === option && styles.optionChipSelected,
                ]}
                onPress={() =>
                  setCategoryFields({ ...categoryFields, [field.name]: option })
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    value === option && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View key={field.name} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <TextInput
          style={styles.input}
          placeholder={`أدخل ${field.label}`}
          value={value}
          onChangeText={(text) =>
            setCategoryFields({ ...categoryFields, [field.name]: text })
          }
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إنشاء إعلان</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الفئة *</Text>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Ionicons
              name={selectedCategory?.icon as any || 'apps'}
              size={24}
              color="#007AFF"
            />
            <Text style={styles.categoryButtonText}>
              {selectedCategory?.name_ar || 'اختر الفئة'}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#8E8E93" />
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={styles.categoryPicker}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryOption}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryPicker(false);
                    setCategoryFields({});
                  }}
                >
                  <Ionicons name={category.icon as any} size={24} color="#007AFF" />
                  <Text style={styles.categoryOptionText}>{category.name_ar}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>العنوان *</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل عنوان الإعلان"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.labelWithButton}>
              <Text style={styles.fieldLabel}>الوصف *</Text>
              <TouchableOpacity
                style={styles.aiButton}
                onPress={generateDescription}
                disabled={aiLoading}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.aiButtonText}>AI</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="أدخل وصف تفصيلي للمنتج"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
            />
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.labelWithButton}>
              <Text style={styles.fieldLabel}>السعر (دولار) *</Text>
              <TouchableOpacity
                style={styles.aiButton}
                onPress={suggestPrice}
                disabled={aiLoading}
              >
                <Ionicons name="cash" size={16} color="#FFFFFF" />
                <Text style={styles.aiButtonText}>AI</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="أدخل السعر"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Category-specific fields */}
        {selectedCategory && selectedCategory.fields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تفاصيل {selectedCategory.name_ar}</Text>
            {selectedCategory.fields.map((field) => renderCategoryField(field))}
          </View>
        )}

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الصور * (حد أقصى 5)</Text>
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Ionicons name="add" size={32} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Video */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>فيديو (اختياري)</Text>
          <TouchableOpacity style={styles.videoButton} onPress={pickVideo}>
            <Ionicons
              name={video ? 'checkmark-circle' : 'videocam'}
              size={24}
              color={video ? '#34C759' : '#007AFF'}
            />
            <Text style={styles.videoButtonText}>
              {video ? 'تم اختيار الفيديو' : 'إضافة فيديو'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>نشر الإعلان</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {aiLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>جاري معالجة الذكاء الاصطناعي...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  categoryButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  categoryPicker: {
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  labelWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  optionChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  optionChipSelected: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  videoButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#A8E6A3',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
  },
});
