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
import { ArrowLeft, AlertTriangle } from "lucide-react-native";

import { COLORS, RADIUS, SPACING } from "../src/theme";
import { useAppStore } from "../src/store/useAppStore";
import ResultCard from "../src/components/ResultCard";
import MultiResultCard from "../src/components/MultiResultCard";
import SkeletonResultCard from "../src/components/SkeletonResultCard";
import LanguageToggle from "../src/components/LanguageToggle";

export default function ResultScreen() {
  const router = useRouter();
  const t = useAppStore((s) => s.t);
  const single = useAppStore((s) => s.lastResponse);
  const multi = useAppStore((s) => s.lastMultiResponse);
  const isLoading = useAppStore((s) => s.isLoadingResponse);
  const loadError = useAppStore((s) => s.loadError);
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
              {t("your_query").toUpperCase()}
            </Text>
            <Text style={styles.queryChipText} numberOfLines={3}>
              {inputLabel}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <SkeletonResultCard />
        ) : loadError ? (
          <View style={styles.errorCard} testID="error-card">
            <AlertTriangle
              size={28}
              color={COLORS.warningText}
              strokeWidth={2.2}
            />
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              testID="back-from-error"
              onPress={() => router.replace("/")}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>{t("back")}</Text>
            </Pressable>
          </View>
        ) : multi ? (
          <MultiResultCard data={multi} />
        ) : single ? (
          <ResultCard data={single} />
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
          <Text style={styles.newBtnText}>{t("new_search")}</Text>
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
  errorCard: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.warningText,
    fontSize: 15,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.warningText,
    borderRadius: RADIUS.sm,
  },
  retryBtnText: { color: COLORS.textInverse, fontWeight: "700" },
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
