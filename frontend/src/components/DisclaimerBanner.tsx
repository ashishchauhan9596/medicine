import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING } from "../theme";

export default function DisclaimerBanner({ text }: { text: string }) {
  return (
    <View style={styles.wrap} testID="disclaimer-banner">
      <Text style={styles.text} testID="disclaimer-text">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.disclaimerBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
