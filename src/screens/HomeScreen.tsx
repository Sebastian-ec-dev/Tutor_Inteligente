import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PropsList } from "../navigation/AppNavigator";
import { Book, Plus, LogOut, MessageSquare } from "lucide-react-native";
import LoadingModal from "../components/ui/LoadingModal";

type Props = {
  id: string;
  name: string;
};

export default function HomeScreen() {
  const [materias, setMaterias] = useState<Props[]>([]);
  const [nuevaMateria, setNuevaMateria] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();

  useEffect(() => {
    leerMaterias();
  }, []);

  async function leerMaterias() {
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) Alert.alert("Error", error.message);
    else setMaterias(data || []);
    setLoading(false);
  }

  async function agregarMateria() {
    if (nuevaMateria.trim() == "") {
      Alert.alert("Error", "Ingrese el nombre de la materia");
      return;
    }

    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setLoading(false);

      return;
    }

    const { error } = await supabase
      .from("subjects")
      .insert([{ name: nuevaMateria, user_id: user.user.id }]);
    if (error) Alert.alert("Error", error.message);
    else {
      setNuevaMateria("");
      leerMaterias();
    }
    setLoading(false);
  }

  async function cerrarSesion() {
    setLoading(true);

    await supabase.auth.signOut();
  }

  const renderMaterias = ({ item }: { item: Props }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Resumen", {
          subjectId: item.id,
          subjectName: item.name,
        })
      }
    >
      <Book color="#007AFF" size={24} />
      <Text style={styles.cardText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          placeholder="Nueva materia..."
          value={nuevaMateria}
          onChangeText={setNuevaMateria}
        />
        <TouchableOpacity style={styles.addButton} onPress={agregarMateria}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={materias}
        keyExtractor={(item) => item.id}
        renderItem={renderMaterias}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate("Chatbot")}
        >
          <MessageSquare color="#fff" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.chatButtonText}>Hablar con IA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
          <LogOut color="#FF3B30" size={24} />
        </TouchableOpacity>
      </View>

      <LoadingModal visible={loading} text="Procesando..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 15 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardText: { fontSize: 18, marginLeft: 15, fontWeight: "500", color: "#333" },
  footer: {
    flexDirection: "row",
    padding: 15,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  chatButton: {
    flexDirection: "row",
    backgroundColor: "#34C759",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  chatButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  logoutButton: { padding: 12, backgroundColor: "#fee8e7", borderRadius: 8 },
});
