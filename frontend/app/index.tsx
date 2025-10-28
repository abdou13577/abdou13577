import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const router = useRouter();
  const { loading } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      // توجيه جميع المستخدمين (مسجلين وغير مسجلين) للصفحة الرئيسية
      router.replace('/(tabs)');
    }
  }, [loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#FFCE00" />
    </View>
  );
}
