import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";

type Props = { title: string; body: string };

export default function RedFlagBanner({ title, body }: Props) {
  return (
    <View style={styles.wrap} testID="red-flag-banner">
      <Text style={styles.title} testID="red-flag-title">
        {title}
      </Text>
      <Text style={styles.body} testID="red-flag-body">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warningText,
  },
  title: {
    color: COLORS.warningText,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: SPACING.xs,
  },
  body: { color: COLORS.warningText, fontSize: 16, lineHeight: 24 },
});
