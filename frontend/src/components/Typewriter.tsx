import React, { useEffect, useRef, useState } from "react";
import { Text, StyleProp, TextStyle } from "react-native";

type Props = {
  text: string;
  speed?: number; // ms per character
  style?: StyleProp<TextStyle>;
  startDelay?: number; // ms delay before starting
  onDone?: () => void;
  testID?: string;
};

/**
 * Renders `text` progressively, char-by-char, like a typewriter.
 * Re-starts if `text` prop changes.
 */
export default function Typewriter({
  text,
  speed = 18,
  style,
  startDelay = 0,
  onDone,
  testID,
}: Props) {
  const [shown, setShown] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShown("");
    if (!text) {
      onDone?.();
      return;
    }

    let i = 0;
    const tick = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) {
        timerRef.current = setTimeout(tick, speed);
      } else {
        onDone?.();
      }
    };
    timerRef.current = setTimeout(tick, startDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay]);

  return (
    <Text style={style} testID={testID}>
      {shown}
    </Text>
  );
}
