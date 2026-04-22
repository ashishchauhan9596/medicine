import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";
import type { MedicalResponse } from "../store/useAppStore";
import RedFlagBanner from "./RedFlagBanner";
import DisclaimerBanner from "./DisclaimerBanner";
import { useAppStore } from "../store/useAppStore";

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ResultCard({ data }: { data: MedicalResponse }) {
  const t = useAppStore((s) => s.t);

  return (
    <View style={styles.card} testID="result-card">
      {data.red_flag ? (
        <RedFlagBanner
          title={t("red_flag_title")}
          body={data.red_flag_message || t("red_flag_body")}
        />
      ) : null}

      {data.medicine_name ? (
        <View style={styles.medChip} testID="medicine-name-chip">
          <Text style={styles.medChipLabel}>{t("medicine_name")}</Text>
          <Text style={styles.medChipValue}>{data.medicine_name}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t("summary")}</Text>
      <Text style={styles.summary} testID="result-summary">
        {data.summary}
      </Text>

      <Section title={t("uses")} items={data.uses} />

      {data.common_dosage_note ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("dosage")}</Text>
          <Text style={styles.body}>{data.common_dosage_note}</Text>
        </View>
      ) : null}

      <Section title={t("safety")} items={data.safety_tips} />
      <Section title={t("side_effects")} items={data.side_effects} />
      <Section title={t("see_doctor")} items={data.when_to_see_doctor} />

      <DisclaimerBanner text={data.disclaimer || t("disclaimer_default")} />
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
  medChip: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    alignSelf: "flex-start",
  },
  medChipLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  medChipValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 2,
  },
  section: { marginTop: SPACING.md },
  sectionTitle: {
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  summary: {
    fontSize: 18,
    lineHeight: 28,
    color: COLORS.textPrimary,
  },
  body: { fontSize: 16, lineHeight: 24, color: COLORS.textPrimary },
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingRight: SPACING.md },
  bulletDot: {
    fontSize: 18,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
});
