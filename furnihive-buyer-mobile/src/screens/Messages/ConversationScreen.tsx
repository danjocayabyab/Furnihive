import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  const router = useRouter();
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
  const [peerName, setPeerName] = useState<string | null>(null);
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [peerOnline, setPeerOnline] = useState<boolean>(false);
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
    let cancelled = false;

    async function loadPeerName() {
      try {
        const { data: convo } = await supabase
          .from("conversations")
          .select("seller_id")
          .eq("id", conversationId)
          .maybeSingle();

        const sellerId = convo?.seller_id;
        if (!sellerId || cancelled) return;

        const [{ data: sellers }, { data: stores }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, store_name, first_name, last_name, avatar_url, last_active")
            .eq("id", sellerId)
            .limit(1),
          supabase
            .from("stores")
            .select("owner_id, name")
            .eq("owner_id", sellerId)
            .limit(1),
        ]);

        if (cancelled) return;

        const seller = sellers?.[0] as any | undefined;
        const store = stores?.[0] as any | undefined;
        const name =
          store?.name ||
          seller?.store_name ||
          [seller?.first_name, seller?.last_name].filter(Boolean).join(" ") ||
          null;

        setPeerName(name);
        setPeerAvatar((seller as any)?.avatar_url || null);
        const lastActiveMs = seller?.last_active ? Date.parse(seller.last_active) : null;
        const online =
          lastActiveMs && Number.isFinite(lastActiveMs)
            ? Date.now() - lastActiveMs < 5 * 60 * 1000
            : false;
        setPeerOnline(Boolean(online));
      } catch {
        if (!cancelled) setPeerName(null);
      }
    }

    loadPeerName();
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
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#422006" />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <View style={styles.headerNameRow}>
              {peerAvatar ? (
                <Image source={{ uri: peerAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {(peerName || "S").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.heading} numberOfLines={1}>
                {peerName || "Chat"}
              </Text>
              <View style={styles.headerStatusRow}>
                <View
                  style={[
                    styles.onlineDot,
                    peerOnline ? styles.onlineDotOn : styles.onlineDotOff,
                  ]}
                />
                <Text style={styles.onlineText}>
                  {peerOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.composerRow}>
          <TouchableOpacity style={styles.attachButton} onPress={() => {}}>
            <Feather name="paperclip" size={18} color="#ea580c" />
          </TouchableOpacity>
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

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/" })}
        >
          <Feather name="home" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/explore" })}
        >
          <Feather name="shopping-bag" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/cart" })}
        >
          <Feather name="shopping-cart" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => router.push({ pathname: "/profile" })}
        >
          <Feather name="user" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fefce8",
  },
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 56,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fefce8",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#fefce8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ea580c",
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#422006",
    flexShrink: 1,
    marginRight: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: "#d1d5db",
  },
  onlineDotOn: {
    backgroundColor: "#22c55e",
  },
  onlineDotOff: {
    backgroundColor: "#d1d5db",
  },
  onlineText: {
    fontSize: 11,
    color: "#6b7280",
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
    backgroundColor: "#ffffff",
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
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    fontSize: 18,
    color: "#ffffff",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#facc6b",
    paddingVertical: 4,
    height: 56,
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});
