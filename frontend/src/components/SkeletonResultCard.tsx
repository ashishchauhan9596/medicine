import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";
import SkeletonBlock from "./SkeletonBlock";
import { useAppStore } from "../store/useAppStore";

export default function SkeletonResultCard() {
  const t = useAppStore((s) => s.t);
  return (
    <View style={styles.card} testID="skeleton-result-card">
      <Text style={styles.preparing}>{t("preparing")}</Text>
      <SkeletonBlock width={120} height={18} radius={6} style={styles.tag} />
      <Text style={styles.sectionTitle}>{t("summary")}</Text>
      <SkeletonBlock height={14} radius={6} style={styles.line} />
      <SkeletonBlock width="92%" height={14} radius={6} style={styles.line} />
      <SkeletonBlock width="75%" height={14} radius={6} style={styles.line} />

      <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
        {t("uses")}
      </Text>
      <SkeletonBlock width="80%" height={12} radius={6} style={styles.line} />
      <SkeletonBlock width="72%" height={12} radius={6} style={styles.line} />
      <SkeletonBlock width="68%" height={12} radius={6} style={styles.line} />

      <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
        {t("safety")}
      </Text>
      <SkeletonBlock width="88%" height={12} radius={6} style={styles.line} />
      <SkeletonBlock width="64%" height={12} radius={6} style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.lg,
  },
  preparing: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  tag: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  line: { marginBottom: SPACING.sm },
});
