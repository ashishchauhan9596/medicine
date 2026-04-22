import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";
import type { MedicalResponse } from "../store/useAppStore";
import RedFlagBanner from "./RedFlagBanner";
import DisclaimerBanner from "./DisclaimerBanner";
import Typewriter from "./Typewriter";
import { useAppStore } from "../store/useAppStore";

/**
 * Typewriter effect: summary first, then each section revealed one after the other.
 * Stages:
 *  0 summary
 *  1 uses
 *  2 dosage note
 *  3 safety tips
 *  4 side effects
 *  5 when to see doctor
 *  6 disclaimer (instant)
 */
export default function ResultCard({ data }: { data: MedicalResponse }) {
  const t = useAppStore((s) => s.t);
  const [stage, setStage] = useState(0);

  const next = () => setStage((s) => s + 1);

  // Auto-skip empty sections so we never stall.
  useEffect(() => {
    if (stage === 1 && (!data.uses || data.uses.length === 0)) next();
    else if (stage === 2 && !data.common_dosage_note) next();
    else if (stage === 3 && (!data.safety_tips || data.safety_tips.length === 0))
      next();
    else if (
      stage === 4 &&
      (!data.side_effects || data.side_effects.length === 0)
    )
      next();
    else if (
      stage === 5 &&
      (!data.when_to_see_doctor || data.when_to_see_doctor.length === 0)
    )
      next();
  }, [stage, data]);

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
      <Typewriter
        text={data.summary}
        style={styles.summary}
        speed={18}
        testID="result-summary"
        onDone={next}
      />

      {stage >= 1 && data.uses && data.uses.length > 0 ? (
        <TypedBulletList
          title={t("uses")}
          items={data.uses}
          active={stage === 1}
          onDone={next}
        />
      ) : null}

      {stage >= 2 && data.common_dosage_note ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("dosage")}</Text>
          {stage === 2 ? (
            <Typewriter
              text={data.common_dosage_note}
              style={styles.body}
              speed={12}
              onDone={next}
            />
          ) : (
            <Text style={styles.body}>{data.common_dosage_note}</Text>
          )}
        </View>
      ) : null}

      {stage >= 3 && data.safety_tips && data.safety_tips.length > 0 ? (
        <TypedBulletList
          title={t("safety")}
          items={data.safety_tips}
          active={stage === 3}
          onDone={next}
        />
      ) : null}

      {stage >= 4 && data.side_effects && data.side_effects.length > 0 ? (
        <TypedBulletList
          title={t("side_effects")}
          items={data.side_effects}
          active={stage === 4}
          onDone={next}
        />
      ) : null}

      {stage >= 5 &&
      data.when_to_see_doctor &&
      data.when_to_see_doctor.length > 0 ? (
        <TypedBulletList
          title={t("see_doctor")}
          items={data.when_to_see_doctor}
          active={stage === 5}
          onDone={next}
        />
      ) : null}

      {stage >= 6 ? (
        <DisclaimerBanner text={data.disclaimer || t("disclaimer_default")} />
      ) : null}
    </View>
  );
}

function TypedBulletList({
  title,
  items,
  active,
  onDone,
}: {
  title: string;
  items: string[];
  active: boolean;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      // Jump straight to full list when not active (e.g. past stage).
      setIdx(items.length - 1);
    }
  }, [active, items.length]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.slice(0, idx + 1).map((it, i) => {
        const isCurrent = active && i === idx;
        return (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            {isCurrent ? (
              <Typewriter
                text={it}
                style={styles.bulletText}
                speed={10}
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
