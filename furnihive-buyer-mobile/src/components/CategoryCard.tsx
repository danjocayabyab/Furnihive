import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

export type CategoryItem = {
  label: string;
  meta: string;
  image: string;
};

type Props = {
  item: CategoryItem;
  onPress?: () => void;
};

export function CategoryCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.gradient} />
        <Text numberOfLines={1} style={styles.label}>
          {item.label}
        </Text>
      </View>
      <Text style={styles.meta}>{item.meta}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#facc6b", // line-amber
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    // medium horizontal rectangle that still fits 4 across nicely
    aspectRatio: 1.4,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  label: {
    position: "absolute",
    left: 8,
    bottom: 6,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    color: "#4b5563",
    textAlign: "center",
  },
});
