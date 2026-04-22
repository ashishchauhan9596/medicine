import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { COLORS, RADIUS, SPACING } from "../src/theme";
import { useAppStore } from "../src/store/useAppStore";
import ResultCard from "../src/components/ResultCard";
import LanguageToggle from "../src/components/LanguageToggle";

export default function ResultScreen() {
  const router = useRouter();
  const t = useAppStore((s) => s.t);
  const data = useAppStore((s) => s.lastResponse);
  const inputLabel = useAppStore((s) => s.lastInputLabel);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={COLORS.textPrimary} strokeWidth={2.4} />
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <LanguageToggle />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {inputLabel ? (
          <View style={styles.queryChip} testID="query-chip">
            <Text style={styles.queryChipLabel}>
              {t("search").toUpperCase()}
            </Text>
            <Text style={styles.queryChipText} numberOfLines={3}>
              {inputLabel}
            </Text>
          </View>
        ) : null}

        {data ? (
          <ResultCard data={data} />
        ) : (
          <View style={styles.emptyCard} testID="empty-result">
            <Text style={styles.emptyText}>{t("error_empty")}</Text>
          </View>
        )}

        <Pressable
          testID="new-search-button"
          onPress={() => router.replace("/")}
          style={({ pressed }) => [
            styles.newBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.newBtnText}>{t("search")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.appBg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  queryChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  queryChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  queryChipText: { fontSize: 15, color: COLORS.textPrimary },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
  newBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  newBtnText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: "800",
  },
});
