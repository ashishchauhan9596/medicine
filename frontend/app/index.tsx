import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Camera,
  Mic,
  Send,
  Image as ImageIcon,
  X,
  Leaf,
} from "lucide-react-native";

import { COLORS, RADIUS, SPACING } from "../src/theme";
import { useAppStore } from "../src/store/useAppStore";
import LanguageToggle from "../src/components/LanguageToggle";
import RecordingPulse from "../src/components/RecordingPulse";
import {
  identifyMedicineImage,
  medicalQuery,
  transcribeAudio,
} from "../src/services/api";

type Busy =
  | { kind: "idle" }
  | { kind: "image" }
  | { kind: "text" }
  | { kind: "transcribing" };

export default function HomeScreen() {
  const router = useRouter();
  const t = useAppStore((s) => s.t);
  const lang = useAppStore((s) => s.lang);
  const setLastResponse = useAppStore((s) => s.setLastResponse);
  const setLastInputLabel = useAppStore((s) => s.setLastInputLabel);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState<Busy>({ kind: "idle" });
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribed, setTranscribed] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isBusy = busy.kind !== "idle" || isRecording;

  // --- Helpers ---
  const handleError = (e: unknown) => {
    console.warn("[Pahadi]", e);
    Alert.alert(t("error_generic"), String(e));
  };

  const navigateToResult = (label: string, resp: any) => {
    setLastResponse(resp);
    setLastInputLabel(label);
    router.push("/result");
  };

  // --- Text flow ---
  const onAskText = async (overrideText?: string) => {
    const q = (overrideText ?? text).trim();
    if (!q) {
      Alert.alert(t("error_empty"));
      return;
    }
    Keyboard.dismiss();
    setBusy({ kind: "text" });
    try {
      const resp = await medicalQuery(q, lang);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      navigateToResult(q, resp);
      setText("");
      setTranscribed(null);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  // --- Image flow ---
  const pickImage = async (fromCamera: boolean) => {
    setShowImageModal(false);
    try {
      let perm;
      if (fromCamera) {
        perm = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!perm.granted) {
        Alert.alert(t("permission_denied"));
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert(t("error_generic"));
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      setBusy({ kind: "image" });
      const mime =
        asset.mimeType ||
        (asset.uri?.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
      const resp = await identifyMedicineImage(asset.base64, mime, lang);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      navigateToResult(t("image_input"), resp);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  // --- Voice flow ---
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("permission_denied"));
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await rec.startAsync();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      handleError(e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setBusy({ kind: "transcribing" });
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error("No recording file");

      // Fetch as blob → base64
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onloadend = () => {
          const r = reader.result as string;
          resolve(r.split(",")[1] || r);
        };
        reader.readAsDataURL(blob);
      });

      const mime =
        Platform.OS === "ios" ? "audio/m4a" : "audio/m4a";
      const tr = await transcribeAudio(base64, mime);
      const cleaned = (tr.text || "").trim();
      if (!cleaned) {
        Alert.alert(t("error_generic"));
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      setTranscribed(cleaned);
      setText(cleaned);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.logoBubble}>
                  <Leaf size={22} color={COLORS.primary} strokeWidth={2.4} />
                </View>
                <View style={styles.brandTextWrap}>
                  <Text
                    style={styles.brand}
                    testID="app-title"
                    numberOfLines={1}
                  >
                    {t("app_name")}
                  </Text>
                  <Text style={styles.tagline} numberOfLines={1}>
                    {t("tagline")}
                  </Text>
                </View>
              </View>
              <LanguageToggle />
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>{t("empty_state_title")}</Text>
              <Text style={styles.heroBody}>{t("empty_state_body")}</Text>
            </View>

            {/* Big buttons */}
            <View style={styles.bigRow}>
              <Pressable
                testID="camera-input-button"
                style={({ pressed }) => [
                  styles.bigBtn,
                  pressed && styles.pressed,
                ]}
                disabled={isBusy}
                onPress={() => setShowImageModal(true)}
              >
                <View style={styles.bigIconWrap}>
                  <Camera size={34} color={COLORS.textInverse} strokeWidth={2.2} />
                </View>
                <Text style={styles.bigBtnText}>{t("camera_btn")}</Text>
                <Text style={styles.bigBtnHint}>{t("camera_hint")}</Text>
              </Pressable>

              <Pressable
                testID="voice-input-button"
                style={({ pressed }) => [
                  styles.bigBtn,
                  styles.bigBtnSecondary,
                  pressed && styles.pressed,
                ]}
                disabled={busy.kind === "image" || busy.kind === "text"}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View
                  style={[
                    styles.bigIconWrap,
                    isRecording && { backgroundColor: COLORS.warningText },
                  ]}
                >
                  {isRecording ? (
                    <X size={34} color={COLORS.textInverse} strokeWidth={2.4} />
                  ) : (
                    <Mic size={34} color={COLORS.textInverse} strokeWidth={2.2} />
                  )}
                </View>
                <Text style={styles.bigBtnText}>
                  {isRecording ? t("stop_recording") : t("voice_btn")}
                </Text>
                <Text style={styles.bigBtnHint}>
                  {isRecording ? t("recording") : t("voice_hint")}
                </Text>
              </Pressable>
            </View>

            {isRecording ? (
              <View style={styles.pulseWrap}>
                <RecordingPulse size={80} />
                <Text style={styles.pulseLabel}>{t("recording")}</Text>
              </View>
            ) : null}

            {/* Text input */}
            <View style={styles.inputBlock}>
              {transcribed ? (
                <Text style={styles.editHint} testID="edit-transcription-hint">
                  {t("edit_transcription")}
                </Text>
              ) : null}
              <View style={styles.inputRow}>
                <TextInput
                  testID="text-input"
                  placeholder={t("text_placeholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  multiline
                  editable={!isBusy || busy.kind === "transcribing"}
                  returnKeyType="search"
                  onSubmitEditing={() => onAskText()}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
                <Pressable
                  testID="ask-button"
                  onPress={() => onAskText()}
                  disabled={isBusy || !text.trim()}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    (isBusy || !text.trim()) && styles.sendBtnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Send size={22} color={COLORS.textInverse} strokeWidth={2.4} />
                </Pressable>
              </View>
            </View>

            {/* Loading */}
            {busy.kind !== "idle" ? (
              <View style={styles.loadingCard} testID="loading-card">
                <Text style={styles.loadingText}>{t("loading")}</Text>
              </View>
            ) : null}

          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Image picker modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.modalSheet}>
            <Pressable
              testID="take-photo-option"
              style={styles.modalOption}
              onPress={() => pickImage(true)}
            >
              <Camera size={22} color={COLORS.primary} strokeWidth={2.4} />
              <Text style={styles.modalOptionText}>{t("take_photo")}</Text>
            </Pressable>
            <View style={styles.modalDivider} />
            <Pressable
              testID="pick-gallery-option"
              style={styles.modalOption}
              onPress={() => pickImage(false)}
            >
              <ImageIcon size={22} color={COLORS.primary} strokeWidth={2.4} />
              <Text style={styles.modalOptionText}>
                {t("pick_from_gallery")}
              </Text>
            </Pressable>
            <View style={styles.modalDivider} />
            <Pressable
              testID="cancel-image-option"
              style={styles.modalOption}
              onPress={() => setShowImageModal(false)}
            >
              <X size={22} color={COLORS.textSecondary} strokeWidth={2.4} />
              <Text
                style={[styles.modalOptionText, { color: COLORS.textSecondary }]}
              >
                {t("cancel")}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.appBg },
  flex: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.sm,
  },
  brandTextWrap: { flex: 1, minWidth: 0 },
  logoBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  brand: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary },
  tagline: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  heroCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  heroBody: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },

  bigRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  bigBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    minHeight: 140,
    justifyContent: "space-between",
    marginRight: SPACING.sm,
  },
  bigBtnSecondary: { backgroundColor: COLORS.accent, marginRight: 0 },
  bigIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  bigBtnText: {
    color: COLORS.textInverse,
    fontSize: 18,
    fontWeight: "800",
  },
  bigBtnHint: {
    color: COLORS.textInverse,
    opacity: 0.85,
    fontSize: 13,
    marginTop: 2,
  },
  pressed: { opacity: 0.85 },

  pulseWrap: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  pulseLabel: {
    marginTop: SPACING.sm,
    color: COLORS.primary,
    fontWeight: "700",
  },

  inputBlock: { marginTop: SPACING.md, marginBottom: SPACING.md },
  editHint: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 140,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  sendBtn: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: COLORS.borderSubtle },

  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 15 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalOptionText: {
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginLeft: SPACING.md,
  },
  modalDivider: { height: 1, backgroundColor: COLORS.borderSubtle },
});
