import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/src/context/AuthContext";

export default function EditAddressRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [label, setLabel] = useState("Home Address");
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postal, setPostal] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id || !id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: err } = await supabase
          .from("addresses")
          .select("label,name,line1,city,province,postal_code,is_default")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (err || !data) {
          if (!cancelled) setError(err?.message || "Address not found.");
          return;
        }
        if (!cancelled) {
          setLabel((data.label as string | null) || "Home Address");
          setName((data.name as string | null) || "");
          setLine1((data.line1 as string | null) || "");
          setCity((data.city as string | null) || "");
          setProvince((data.province as string | null) || "");
          setPostal((data.postal_code as string | null) || "");
          setMakeDefault(!!data.is_default);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Edit Address</Text>
        <Text style={styles.text}>Please log in to manage your addresses.</Text>
      </View>
    );
  }

  const canSave = line1.trim().length > 0 && city.trim().length > 0 && province.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving || !id) return;
    setSaving(true);
    setError("");
    try {
      if (makeDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .is("deleted_at", null);
      }

      const { error: updateErr } = await supabase
        .from("addresses")
        .update({
          label: label.trim() || "Home Address",
          name: name.trim() || null,
          line1: line1.trim(),
          city: city.trim(),
          province: province.trim(),
          postal_code: postal.trim() || null,
          is_default: makeDefault,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateErr) {
        setError(updateErr.message || "Failed to save address.");
        setSaving(false);
        return;
      }

      router.back();
    } catch (e: any) {
      setError(e?.message || "Something went wrong while saving.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || saving) return;
    setSaving(true);
    setError("");
    try {
      const { error: delErr } = await supabase
        .from("addresses")
        .update({ deleted_at: new Date().toISOString(), is_default: false })
        .eq("id", id)
        .eq("user_id", user.id);
      if (delErr) {
        setError(delErr.message || "Failed to delete address.");
        setSaving(false);
        return;
      }
      router.back();
    } catch (e: any) {
      setError(e?.message || "Something went wrong while deleting.");
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Edit Address</Text>
      {loading && (
        <View style={styles.row}>
          <ActivityIndicator color="#ea580c" />
          <Text style={styles.text}>Loading address...</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>Label</Text>
        <TextInput
          style={styles.input}
          placeholder="Home / Work / Other"
          value={label}
          onChangeText={setLabel}
        />
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name (optional)"
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Street / line 1</Text>
        <TextInput
          style={styles.input}
          placeholder="Street, building, etc."
          value={line1}
          onChangeText={setLine1}
        />
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="City / Municipality"
          value={city}
          onChangeText={setCity}
        />
        <Text style={styles.label}>Province</Text>
        <TextInput
          style={styles.input}
          placeholder="Province"
          value={province}
          onChangeText={setProvince}
        />
        <Text style={styles.label}>Postal Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Postal code (optional)"
          value={postal}
          onChangeText={setPostal}
          keyboardType="number-pad"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Set as default</Text>
          <Switch
            value={makeDefault}
            onValueChange={setMakeDefault}
            thumbColor={makeDefault ? "#ea580c" : undefined}
          />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        disabled={!canSave || saving}
        onPress={handleSave}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={saving}
      >
        <Text style={styles.deleteText}>Delete Address</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefce8",
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#422006",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    color: "#4b5563",
  },
  error: {
    fontSize: 12,
    color: "#b91c1c",
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#facc6b",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
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
  switchRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 13,
    color: "#4b5563",
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ea580c",
  },
  saveButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  deleteButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b91c1c",
  },
});
