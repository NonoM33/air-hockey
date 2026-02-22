import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { COLORS } from '../src/constants/theme';
import { SocketProvider } from '../src/contexts/SocketContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SocketProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="lobby" />
          <Stack.Screen name="game" />
          <Stack.Screen name="results" />
        </Stack>
      </SocketProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
