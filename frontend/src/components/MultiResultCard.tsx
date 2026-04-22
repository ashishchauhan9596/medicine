import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";
import type { MultiMedicineResponse, MedicineEntry } from "../store/useAppStore";
import RedFlagBanner from "./RedFlagBanner";
import DisclaimerBanner from "./DisclaimerBanner";
import Typewriter from "./Typewriter";
import { useAppStore } from "../store/useAppStore";

type Stage = number;

export default function MultiResultCard({
  data,
}: {
  data: MultiMedicineResponse;
}) {
  const t = useAppStore((s) => s.t);
  const [stage, setStage] = useState<Stage>(0);
  const next = () => setStage((s) => s + 1);

  // Stages: 0..(N-1) = typing medicine i, N = interactions, N+1 = combined_safety, N+2 = when_to_see_doctor, N+3 = disclaimer
  const N = data.medicines.length;
  const stageInteractions = N;
  const stageCombined = N + 1;
  const stageDoctor = N + 2;
  const stageDisclaimer = N + 3;

  useEffect(() => {
    if (
      stage === stageInteractions &&
      (!data.interactions || data.interactions.length === 0)
    )
      next();
    else if (
      stage === stageCombined &&
      (!data.combined_safety || data.combined_safety.length === 0)
    )
      next();
    else if (
      stage === stageDoctor &&
      (!data.when_to_see_doctor || data.when_to_see_doctor.length === 0)
    )
      next();
  }, [stage, data]);

  return (
    <View style={styles.card} testID="multi-result-card">
      {data.red_flag ? (
        <RedFlagBanner
          title={t("red_flag_title")}
          body={data.red_flag_message || t("red_flag_body")}
        />
      ) : null}

      {data.medicines.map((m, i) => (
        <MedicineSection
          key={i}
          index={i}
          entry={m}
          active={stage === i}
          visible={stage >= i}
          onDone={next}
        />
      ))}

      {stage >= stageInteractions && data.interactions.length > 0 ? (
        <BulletList
          title={t("interactions_title")}
          items={data.interactions}
          active={stage === stageInteractions}
          onDone={next}
          highlight
        />
      ) : null}

      {stage >= stageCombined && data.combined_safety.length > 0 ? (
        <BulletList
          title={t("combined_safety_title")}
          items={data.combined_safety}
          active={stage === stageCombined}
          onDone={next}
        />
      ) : null}

      {stage >= stageDoctor && data.when_to_see_doctor.length > 0 ? (
        <BulletList
          title={t("see_doctor")}
          items={data.when_to_see_doctor}
          active={stage === stageDoctor}
          onDone={next}
        />
      ) : null}

      {stage >= stageDisclaimer ? (
        <DisclaimerBanner text={data.disclaimer || t("disclaimer_default")} />
      ) : null}
    </View>
  );
}

function MedicineSection({
  index,
  entry,
  active,
  visible,
  onDone,
}: {
  index: number;
  entry: MedicineEntry;
  active: boolean;
  visible: boolean;
  onDone: () => void;
}) {
  const t = useAppStore((s) => s.t);
  if (!visible) return null;
  return (
    <View style={styles.medSection} testID={`medicine-entry-${index}`}>
      <View style={styles.medChip}>
        <Text style={styles.medChipLabel}>
          {t("medicine_name")} {index + 1}
        </Text>
        <Text style={styles.medChipValue}>{entry.name}</Text>
      </View>

      {active ? (
        <Typewriter
          text={entry.summary}
          style={styles.summary}
          speed={16}
          onDone={onDone}
        />
      ) : (
        <Text style={styles.summary}>{entry.summary}</Text>
      )}

      {entry.uses && entry.uses.length > 0 ? (
        <View style={styles.subSection}>
          <Text style={styles.subTitle}>{t("uses")}</Text>
          {entry.uses.map((u, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{u}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {entry.dosage_note ? (
        <View style={styles.subSection}>
          <Text style={styles.subTitle}>{t("dosage")}</Text>
          <Text style={styles.body}>{entry.dosage_note}</Text>
        </View>
      ) : null}

      {entry.safety_tips && entry.safety_tips.length > 0 ? (
        <View style={styles.subSection}>
          <Text style={styles.subTitle}>{t("safety")}</Text>
          {entry.safety_tips.map((u, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{u}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BulletList({
  title,
  items,
  active,
  onDone,
  highlight,
}: {
  title: string;
  items: string[];
  active: boolean;
  onDone: () => void;
  highlight?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) setIdx(items.length - 1);
  }, [active, items.length]);

  return (
    <View style={[styles.section, highlight && styles.highlight]}>
      <Text
        style={[
          styles.sectionTitle,
          highlight && { color: COLORS.warningText },
        ]}
      >
        {title}
      </Text>
      {items.slice(0, idx + 1).map((it, i) => {
        const isCurrent = active && i === idx;
        return (
          <View key={i} style={styles.bulletRow}>
            <Text
              style={[
                styles.bulletDot,
                highlight && { color: COLORS.warningText },
              ]}
            >
              •
            </Text>
            {isCurrent ? (
              <Typewriter
                text={it}
                style={styles.bulletText}
                speed={11}
                onDone={() => {
                  if (idx < items.length - 1) setIdx(idx + 1);
                  else onDone();
                }}
              />
            ) : (
              <Text style={styles.bulletText}>{it}</Text>
            )}
          </View>
        );
      })}
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
  medSection: {
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
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
    fontSize: 11,
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
  summary: {
    fontSize: 17,
    lineHeight: 26,
    color: COLORS.textPrimary,
  },
  body: { fontSize: 15, lineHeight: 22, color: COLORS.textPrimary },
  subSection: { marginTop: SPACING.md },
  subTitle: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 6,
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
  bulletRow: { flexDirection: "row", marginBottom: 6, paddingRight: SPACING.md },
  bulletDot: {
    fontSize: 18,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  highlight: {
    backgroundColor: COLORS.warningBg,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
  },
});
