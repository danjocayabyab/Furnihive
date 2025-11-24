import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

export default function ProfileSignupScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing info", "Please enter your first and last name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: "buyer",
          },
        },
      });
      if (error) {
        throw error;
      }

      // Auto-login for convenience (buyer role only)
      await login(email.trim(), password);
      router.replace("/(tabs)/profile" as any);
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#422006" />
        </TouchableOpacity>
        <Text style={styles.heading}>Sign up</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.loginHeader}>
            <View style={styles.loginLogoTile}>
              <Text style={styles.loginLogoText}>F</Text>
            </View>
            <Text style={styles.loginTitle}>FurniHive</Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Create your buyer account</Text>
            <View style={styles.sectionDivider} />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { marginRight: 6 }]}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.fieldGroup, { marginLeft: 6 }]}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fefce8" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
  },
  content: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 10,
  },
  loginHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  loginLogoTile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  loginLogoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#422006",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#422006",
    marginRight: 8,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#facc6b",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  fieldGroup: {
    flex: 1,
    marginTop: 4,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#422006",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#ea580c",
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fefce8",
  },
});
