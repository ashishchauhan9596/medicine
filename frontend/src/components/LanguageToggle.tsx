import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Languages } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { COLORS, RADIUS, SPACING } from "../theme";
import { useAppStore } from "../store/useAppStore";

export default function LanguageToggle() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    setLang(lang === "en" ? "hi" : "en");
  };

  return (
    <Pressable
      testID="language-toggle"
      onPress={toggle}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Languages size={20} color={COLORS.primary} strokeWidth={2.4} />
      <View style={styles.labelWrap}>
        <Text
          testID={lang === "en" ? "lang-en" : "lang-hi"}
          style={styles.label}
        >
          {lang === "en" ? "EN" : "हिं"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  labelWrap: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
