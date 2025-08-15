import { useAuth } from "@/context/authContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "./../global.css";

export default function StartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Redirect based on authentication status
    if (typeof isAuthenticated !== 'undefined') {
      if (isAuthenticated) {
        router.replace('/(app)/home');
      } else {
        router.replace('/signIn');
      }
    }
  }, [isAuthenticated, router]);

  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="gray" />
    </View>
  );
}