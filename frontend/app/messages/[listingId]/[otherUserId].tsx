import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { COLORS } from '../../../constants/colors';

interface Message {
  id: string;
  from_user_id: string;
  content: string;
  created_at: string;
  message_type?: string;
  images?: string[];
  audio?: string;
}

export default function ConversationScreen() {
  const router = useRouter();
  const { listingId, otherUserId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // New states for images and audio
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000); // تحديث كل 10 ثوان (أقل ضغط)
    return () => clearInterval(interval);
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.get(`/messages/${listingId}/${otherUserId}`);
      setMessages(response.data);
      
      // Mark messages as read - only once when first opened
      if (!hasMarkedRead && response.data.length > 0) {
        try {
          await api.post(`/messages/mark-read/${listingId}/${otherUserId}`);
          setHasMarkedRead(true);
        } catch (err) {
          console.log('Could not mark as read:', err);
        }
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      if (error.response?.status === 404) {
        setMessages([]);
      }
      setLoading(false);
    }
  };

  // Pick images from gallery or camera
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى إذن الوصول للمعرض');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const images = result.assets.slice(0, 5 - selectedImages.length); // Max 5 images
        const base64Images = images.map(img => `data:image/jpeg;base64,${img.base64}`);
        setSelectedImages([...selectedImages, ...base64Images]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('خطأ', 'فشل اختيار الصور');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى إذن الوصول للكاميرا');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        if (selectedImages.length < 5) {
          setSelectedImages([...selectedImages, `data:image/jpeg;base64,${result.assets[0].base64}`]);
        } else {
          Alert.alert('تنبيه', 'يمكنك إرسال 5 صور فقط كحد أقصى');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('خطأ', 'فشل التقاط الصورة');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى إذن التسجيل الصوتي');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);

      // Auto stop after 60 seconds
      setTimeout(async () => {
        if (recording) {
          await stopRecording(recording);
        }
      }, 60000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('خطأ', 'فشل بدء التسجيل');
    }
  };

  const stopRecording = async (rec?: Audio.Recording) => {
    try {
      const recordingToStop = rec || recording;
      if (!recordingToStop) return;

      setIsRecording(false);
      await recordingToStop.stopAndUnloadAsync();
      const uri = recordingToStop.getURI();
      
      if (uri) {
        // Convert to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Send audio message immediately
          await sendAudioMessage(base64Audio);
        };
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('خطأ', 'فشل إيقاف التسجيل');
    }
  };

  const sendAudioMessage = async (audioBase64: string) => {
    setSending(true);
    try {
      await api.post('/messages', {
        to_user_id: otherUserId,
        listing_id: listingId,
        content: '🎤 رسالة صوتية',
        message_type: 'audio',
        audio: audioBase64,
      });
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('ERROR SENDING AUDIO:', error);
      Alert.alert('خطأ', 'فشل إرسال الرسالة الصوتية');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && selectedImages.length === 0) return;

    console.log('=== SENDING MESSAGE ===');
    console.log('To User ID:', otherUserId);
    console.log('Listing ID:', listingId);
    console.log('Content:', newMessage.trim());
    console.log('Images count:', selectedImages.length);

    setSending(true);
    try {
      const messageType = selectedImages.length > 0 ? 'image' : 'text';
      console.log('Making POST request to /messages');
      const response = await api.post('/messages', {
        to_user_id: otherUserId,
        listing_id: listingId,
        content: newMessage.trim() || '📷 صور',
        message_type: messageType,
        images: selectedImages,
      });
      console.log('Message sent successfully:', response.data);
      setNewMessage('');
      setSelectedImages([]);
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('ERROR SENDING MESSAGE:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      Alert.alert('خطأ', error.response?.data?.detail || error.message || 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.from_user_id === user?.id;
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
            {format(new Date(item.created_at), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nachricht</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Noch keine Nachrichten</Text>
            <Text style={styles.emptySubtext}>Schreiben Sie die erste Nachricht!</Text>
          </View>
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Image Preview */}
      {selectedImages.length > 0 && (
        <View style={styles.imagePreviewContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imagePreviewItem}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        {/* Media buttons */}
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={pickImages}
            disabled={selectedImages.length >= 5}
          >
            <Ionicons name="image" size={24} color={selectedImages.length >= 5 ? COLORS.textMuted : COLORS.gold} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={takePhoto}
            disabled={selectedImages.length >= 5}
          >
            <Ionicons name="camera" size={24} color={selectedImages.length >= 5 ? COLORS.textMuted : COLORS.gold} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mediaButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? () => stopRecording() : startRecording}
            disabled={sending}
          >
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={24} 
              color={isRecording ? COLORS.red : COLORS.gold} 
            />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="اكتب رسالة..."
          placeholderTextColor={COLORS.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() && selectedImages.length === 0 || sending) && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={(!newMessage.trim() && selectedImages.length === 0) || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.black} />
          ) : (
            <Ionicons name="send" size={24} color={COLORS.black} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.red,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: COLORS.gold,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.black,
  },
  otherMessageText: {
    color: COLORS.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: COLORS.black,
    opacity: 0.7,
  },
  otherMessageTime: {
    color: COLORS.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  imagePreviewContainer: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  mediaButtons: {
    flexDirection: 'column',
    marginRight: 8,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordingButton: {
    backgroundColor: COLORS.red,
  },
});
