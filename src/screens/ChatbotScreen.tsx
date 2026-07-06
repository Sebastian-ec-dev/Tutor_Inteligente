import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Send, Paperclip } from 'lucide-react-native';
import MessageBubble from '../utils/MessageBubble';
import { COLORS } from '../components/ui/Colors';
import TypingIndicator from '../utils/burbujaEscribiendo';
import { Subject } from '../domain/entities/Subject';
import { ConversationMessage } from '../domain/entities/ConversationMessage';
import { ClassContentType } from '../domain/entities/ClassContentType';
import { askTutorUseCase, listSubjectsUseCase } from '../application/container';
import { supabase } from '../infrastructure/supabase/supabaseClient';

type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

export default function ChatbotScreen() {
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '¡Hola! Soy tu tutor de IA. Selecciona una materia para buscar información exacta en tus apuntes.',
      sender: 'bot',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const [materia, setMateria] = useState<Subject[]>([]);
  const [materiaId, setMateriaId] = useState<string>('');
  const [contentType, setContentType] = useState<ClassContentType>('general');

  useEffect(() => {
    leerMaterias();
  }, []);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    if (!materiaId) return;
    setMessages([
      {
        id: '1',
        text: '¡Listo! Pregúntame lo que necesites sobre esta materia. El sistema usará RAG, filtro de privacidad y router de IA.',
        sender: 'bot',
      },
    ]);
  }, [materiaId]);

  async function leerMaterias() {
    try {
      const data = await listSubjectsUseCase.execute();
      setMateria(data);
      if (data.length > 0) {
        setMateriaId(data[0].id);
      }
    } catch (error) {
      console.error('Error cargando materias:', error);
    }
  }


  async function adjuntarArchivo() {
    if (!materiaId) {
      Alert.alert('Selecciona una materia', 'Primero selecciona una materia para asociar el archivo al chat.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'audio/*', 'application/pdf', 'text/*', 'application/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('No estás autenticado');

      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const safeName = (asset.name || 'archivo').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const storagePath = `${materiaId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(storagePath, decode(base64), {
          contentType: asset.mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      await supabase.from('session_files').insert({
        subject_id: materiaId,
        uploaded_by: userId,
        file_name: asset.name || safeName,
        file_type: (asset.mimeType || '').startsWith('image/')
          ? 'image'
          : (asset.mimeType || '').startsWith('audio/')
            ? 'audio'
            : (asset.mimeType || '').includes('pdf')
              ? 'pdf'
              : 'document',
        storage_path: storagePath,
        mime_type: asset.mimeType || null,
        size_bytes: asset.size || null,
      });

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: `Adjunté el archivo: ${asset.name || safeName}`, sender: 'user' },
        {
          id: (Date.now() + 1).toString(),
          text: 'Archivo guardado en Supabase Storage. Puedes usarlo como material de apoyo para esta materia.',
          sender: 'bot',
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error al adjuntar', error.message || String(error));
    }
  }

  async function enviarMensaje() {
    if (!inputText.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
    };

    const history: ConversationMessage[] = messages.map((message) => ({
      id: message.id,
      text: message.text,
      sender: message.sender,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const botResponseText = await askTutorUseCase.execute({
        question: userMessage.text,
        subjectId: materiaId,
        history,
        contentType,
      });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponseText || 'Lo siento, no pude generar una respuesta.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: 'Hubo un error al procesar tu pregunta.',
          sender: 'bot',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Materia:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={materiaId}
            onValueChange={(itemValue) => setMateriaId(itemValue)}
            style={styles.picker}
            dropdownIconColor={COLORS.primary}
          >
            {materia.length === 0 && (
              <Picker.Item
                label="No hay materias disponibles"
                value=""
                color="#999"
              />
            )}
            {materia.map((sub) => (
              <Picker.Item key={sub.id} label={sub.name} value={sub.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.pickerContainerSecondary}>
        <Text style={styles.pickerLabel}>Ruta IA:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={contentType}
            onValueChange={(value) => setContentType(value)}
            style={styles.picker}
            dropdownIconColor={COLORS.primary}
          >
            <Picker.Item label="General · Google Gemini Flash · mejor para respuestas rápidas" value="general" />
            <Picker.Item label="Teoría · Google Gemini Flash · mejor para conceptos y resúmenes" value="theory" />
            <Picker.Item label="Matemática · OpenAI GPT-4.1 Light · mejor para razonamiento paso a paso" value="math" />
            <Picker.Item label="Imágenes · OpenAI GPT-4.1 Light · mejor para lectura visual" value="image" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <View
          style={[
            styles.inputContainer,
            inputFocused && styles.inputContainerFocused,
          ]}
        >
          <TouchableOpacity
            style={styles.attachButton}
            onPress={adjuntarArchivo}
            disabled={!materiaId || loading}
          >
            <Paperclip color={materiaId ? COLORS.primary : '#94A3B8'} size={21} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={
              !materiaId
                ? 'Selecciona una materia primero...'
                : 'Escribe tu pregunta aquí...'
            }
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            multiline
            maxLength={600}
            placeholderTextColor={COLORS.placeholder}
            editable={!!materiaId}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (loading || !inputText.trim() || !materiaId) &&
                styles.sendButtonDisabled,
            ]}
            onPress={enviarMensaje}
            disabled={loading || !inputText.trim() || !materiaId}
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send color="#fff" size={22} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
        {inputText.length > 500 && (
          <Text style={styles.charCount}>{inputText.length}/600</Text>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const next = messages[index + 1];
          const isLastInGroup = !next || next.sender !== item.sender;
          return <MessageBubble item={item} isLastInGroup={isLastInGroup} />;
        }}
        ListFooterComponent={loading ? <TypingIndicator /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerContainerSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: 10,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 100,
    color: COLORS.text,
  },

  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: COLORS.inputBg,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingLeft: 4,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 16,
    maxHeight: 130,
    minHeight: 52,
    color: COLORS.text,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 6,
  },

  sendButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.placeholder,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
  },

  list: {
    padding: 15,
    paddingTop: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
});
