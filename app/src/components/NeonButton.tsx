import React from 'react';
import {
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function NeonButton({
  title,
  onPress,
  color = COLORS.cyan,
  disabled = false,
  size = 'medium',
  style,
}: NeonButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const sizeStyles: Record<string, { button: ViewStyle; text: TextStyle }> = {
    small: {
      button: { paddingHorizontal: 16, paddingVertical: 8 },
      text: { fontSize: 14 },
    },
    medium: {
      button: { paddingHorizontal: 32, paddingVertical: 16 },
      text: { fontSize: 18 },
    },
    large: {
      button: { paddingHorizontal: 48, paddingVertical: 20 },
      text: { fontSize: 24 },
    },
  };

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        sizeStyles[size].button,
        {
          borderColor: color,
          shadowColor: color,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          sizeStyles[size].text,
          {
            color: color,
            textShadowColor: color,
          },
        ]}
      >
        {title}
      </Text>
    </AnimatedTouchable>
  );
}

interface NeonInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  color?: string;
  style?: ViewStyle;
}

export function NeonInput({
  value,
  onChangeText,
  placeholder = '',
  color = COLORS.cyan,
  style,
}: NeonInputProps) {
  return (
    <View
      style={[
        styles.inputContainer,
        {
          borderColor: color,
          shadowColor: color,
        },
        style,
      ]}
    >
      <TextInput
        style={[styles.input, { color, minHeight: 40 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDim}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={15}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 5,
  },
  text: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 2,
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  input: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
