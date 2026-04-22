import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";

import { COLORS, RADIUS, SPACING } from "../src/theme";
import { useAppStore } from "../src/store/useAppStore";
import { fetchHistory, clearHistory, HistoryItem } from "../src/services/api";

export default function HistoryScreen() {
  const router = useRouter();
  const t = useAppStore((s) => s.t);
  const setLastResponse = useAppStore((s) => s.setLastResponse);
  const setLastInputLabel = useAppStore((s) => s.setLastInputLabel);

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setItems(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onClear = () => {
    Alert.alert(t("clear_history"), "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("clear_history"),
        style: "destructive",
        onPress: async () => {
          await clearHistory();
          setItems([]);
        },
      },
    ]);
  };

  const openItem = (h: HistoryItem) => {
    setLastResponse(h.response);
    setLastInputLabel(
      h.query_text || h.medicine_name || h.input_type.toUpperCase(),
    );
    router.push("/result");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          testID="history-back"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={COLORS.textPrimary} strokeWidth={2.4} />
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("history")}</Text>
        <Pressable
          testID="clear-history"
          onPress={onClear}
          style={styles.clearBtn}
          hitSlop={12}
          disabled={items.length === 0}
        >
          <Trash2
            size={20}
            color={items.length === 0 ? COLORS.borderSubtle : COLORS.warningText}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty} testID="history-empty">
              <Text style={styles.emptyText}>{t("no_history")}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`history-item-${item.id}`}
            style={({ pressed }) => [
              styles.item,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => openItem(item)}
          >
            <View style={styles.itemTopRow}>
              <Text style={styles.typeTag}>
                {item.input_type.toUpperCase()}
              </Text>
              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.medicine_name || item.query_text || "—"}
            </Text>
            <Text style={styles.itemBody} numberOfLines={2}>
              {item.response.summary}
            </Text>
            {item.response.red_flag ? (
              <Text style={styles.redFlag}>⚠ {t("red_flag_title")}</Text>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.appBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    minWidth: 80,
  },
  backText: {
    marginLeft: SPACING.xs,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  clearBtn: {
    padding: SPACING.sm,
    minWidth: 80,
    alignItems: "flex-end",
  },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  empty: { alignItems: "center", padding: SPACING.xl },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  item: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  typeTag: {
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  date: { fontSize: 12, color: COLORS.textSecondary },
  itemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  redFlag: {
    marginTop: SPACING.xs,
    color: COLORS.warningText,
    fontWeight: "700",
    fontSize: 13,
  },
});
