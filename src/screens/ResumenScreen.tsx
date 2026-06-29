import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PropsList } from "../navigation/AppNavigator";
import { FileAudio, Plus, ChevronDown, ChevronUp } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import LoadingModal from "../components/ui/LoadingModal";

type Props = {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  deberes: string;
  created_at: string;
};

export default function ResumenScreen() {
  const route = useRoute<RouteProp<PropsList, "Resumen">>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId } = route.params;
  const [resumenes, setResumenes] = useState<Props[]>([]);
  const [resumenId, setResumenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      leerResumenes();
    });
    return unsubscribe;
  }, [navigation]);

  async function leerResumenes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("audios")
      .select("*")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) Alert.alert("Error", error.message);
    else setResumenes(data || []);
    setLoading(false);
  }

  const toggleExpandir = (id: string) => {
    setResumenId(resumenId === id ? null : id);
  };

  const renderResumen = ({ item }: { item: Props }) => {
    const isExpanded = resumenId === item.id;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpandir(item.id)}
        >
          <View style={styles.cardTitleRow}>
            <FileAudio color="#007AFF" size={24} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp color="#666" />
          ) : (
            <ChevronDown color="#666" />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            {item.summary ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resumen</Text>
                <Markdown style={markdownStyles}>{item.summary}</Markdown>
              </View>
            ) : null}
            {item.deberes ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deberes</Text>
                <Markdown style={markdownStyles}>{item.deberes}</Markdown>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {resumenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay apuntes en esta materia.</Text>
        </View>
      ) : (
        <FlatList
          data={resumenes}
          keyExtractor={(item) => item.id}
          renderItem={renderResumen}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("Audio", { subjectId })}
      >
        <Plus color="#fff" size={30} />
      </TouchableOpacity>
      <LoadingModal visible={loading} text="Procesando..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  list: { padding: 15 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontWeight: "500",
    color: "#333",
    flexShrink: 1,
  },
  cardContent: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  section: { marginTop: 15 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 5,
  },
  textContent: { fontSize: 14, color: "#444", lineHeight: 22 },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#007AFF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15.5,
    lineHeight: 24,
    color: "#444",
  },
  heading1: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 8,
    color: "#222",
  },
  heading2: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 8,
    color: "#222",
  },
  strong: { fontWeight: "bold", color: "#222" },
  em: { fontStyle: "italic" },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 4 },
  paragraph: { marginVertical: 8 },
});
