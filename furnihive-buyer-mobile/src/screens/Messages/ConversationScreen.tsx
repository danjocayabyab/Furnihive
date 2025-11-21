import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

type ChatMessage = {
  id: string | number;
  from: "me" | "seller";
  text: string;
  time: string;
};

export function ConversationScreen() {
  const params = useLocalSearchParams();
  const conversationId =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const prefill =
    typeof params.prefill === "string"
      ? params.prefill
      : Array.isArray(params.prefill)
      ? params.prefill[0]
      : "";
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState(prefill || "");
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            "id, sender_id, sender_role, text, created_at"
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error || !data) {
          if (!cancelled) {
            setMessages([]);
            setError(error?.message || "Failed to load messages");
          }
          return;
        }

        const mapped: ChatMessage[] = data.map((m: any) => ({
          id: m.id,
          from: m.sender_role === "buyer" ? "me" : "seller",
          text: m.text || "",
          time: new Date(m.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        }));

        if (!cancelled) setMessages(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load messages");
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const m = payload.new;
          if (!m) return;
          setMessages((prev) => [
            ...prev,
            {
              id: m.id,
              from: m.sender_role === "buyer" ? "me" : "seller",
              text: m.text || "",
              time: new Date(m.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              }),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const send = async () => {
    const txt = input.trim();
    if (!txt || !conversationId || !user?.id) return;

    const optimistic: ChatMessage = {
      id: Date.now(),
      from: "me",
      text: txt,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_role: "buyer",
        text: txt,
      });
    } catch {
      // best effort; keep optimistic message for now
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.from === "me";
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
          <Text style={styles.bubbleTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>Conversation</Text>
        <Text style={styles.subtle}>ID: {conversationId}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.composerRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={send}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
  },
  subtle: {
    fontSize: 12,
    color: "#6b7280",
  },
  error: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bubbleRowMe: {
    justifyContent: "flex-end",
  },
  bubbleRowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleMe: {
    backgroundColor: "#fed7aa",
  },
  bubbleOther: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#facc6b",
  },
  bubbleText: {
    fontSize: 14,
    color: "#111827",
  },
  bubbleTime: {
    marginTop: 2,
    fontSize: 10,
    color: "#6b7280",
    textAlign: "right",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    fontSize: 18,
    color: "#ffffff",
  },
});
