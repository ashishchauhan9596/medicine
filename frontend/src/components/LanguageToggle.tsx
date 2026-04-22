import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";
import { useAppStore } from "../store/useAppStore";
import type { Lang } from "../i18n/translations";

export default function LanguageToggle() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  const pick = (l: Lang) => setLang(l);

  return (
    <View style={styles.wrap} testID="language-toggle">
      <Pressable
        testID="lang-en"
        onPress={() => pick("en")}
        style={[styles.pill, lang === "en" && styles.pillActive]}
      >
        <Text
          style={[styles.pillText, lang === "en" && styles.pillTextActive]}
        >
          EN
        </Text>
      </Pressable>
      <Pressable
        testID="lang-hi"
        onPress={() => pick("hi")}
        style={[styles.pill, lang === "hi" && styles.pillActive]}
      >
        <Text
          style={[styles.pillText, lang === "hi" && styles.pillTextActive]}
        >
          हिंदी
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 4,
  },
  pill: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    minWidth: 56,
    alignItems: "center",
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "700" },
  pillTextActive: { color: COLORS.textInverse },
});
