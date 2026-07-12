import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Clock3 } from 'lucide-react-native';
import {
  normalizeTimeString,
  WEEK_DAYS,
} from '../../domain/entities/ClassSchedule';
import { useAppTheme } from '../ui/ThemeContext';

export type DayScheduleDraft = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Props = {
  value: DayScheduleDraft[];
  onChange: (value: DayScheduleDraft[]) => void;
};

export const DEFAULT_DAY_TIMES: DayScheduleDraft[] = [];

export default function MultiDayScheduleFields({ value, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function toggleDay(dayOfWeek: number) {
    const exists = value.some((item) => Number(item.dayOfWeek) === dayOfWeek);
    if (exists) {
      onChange(value.filter((item) => Number(item.dayOfWeek) !== dayOfWeek));
      return;
    }

    onChange([
      ...value,
      { dayOfWeek, startTime: '08:00', endTime: '10:00' },
    ]);
  }

  function updateDay(dayOfWeek: number, field: 'startTime' | 'endTime', next: string) {
    onChange(
      value.map((item) =>
        Number(item.dayOfWeek) === dayOfWeek ? { ...item, [field]: next } : item,
      ),
    );
  }

  const selectedSorted = [...value].sort((a, b) => {
    const aIndex = WEEK_DAYS.findIndex((day) => day.value === Number(a.dayOfWeek));
    const bIndex = WEEK_DAYS.findIndex((day) => day.value === Number(b.dayOfWeek));
    return aIndex - bIndex;
  });

  return (
    <View>
      <Text style={styles.helpText}>
        Seleccione los días de la materia. La hora y los minutos se escriben por separado para conservar siempre el formato HH:MM.
      </Text>

      <View style={styles.dayChips}>
        {WEEK_DAYS.map((day) => {
          const selected = value.some((item) => Number(item.dayOfWeek) === day.value);
          return (
            <Pressable
              key={day.value}
              style={[styles.dayChip, selected && styles.dayChipSelected]}
              onPress={() => toggleDay(day.value)}
            >
              {selected && <Check color="#fff" size={13} strokeWidth={3} />}
              <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                {day.short}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedSorted.map((item) => {
        const dayOfWeek = Number(item.dayOfWeek);
        const day = WEEK_DAYS.find((option) => option.value === dayOfWeek);
        return (
          <View key={dayOfWeek} style={styles.dayTimeCard}>
            <View style={styles.dayTimeHeader}>
              <Clock3 color={colors.purple} size={17} />
              <Text style={styles.dayTimeTitle}>{day?.label || 'Día'}</Text>
            </View>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Hora de inicio</Text>
                <FixedTimeInput
                  value={item.startTime}
                  onChange={(next) => updateDay(dayOfWeek, 'startTime', next)}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Hora de fin</Text>
                <FixedTimeInput
                  value={item.endTime}
                  onChange={(next) => updateDay(dayOfWeek, 'endTime', next)}
                />
              </View>
            </View>
          </View>
        );
      })}

      {!value.length && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Seleccione al menos un día.</Text>
        </View>
      )}
    </View>
  );
}

function FixedTimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const normalized = normalizeTimeString(value || '00:00') || '00:00';
  const [normalizedHour, normalizedMinute] = normalized.split(':');
  const [hourDraft, setHourDraft] = useState(normalizedHour);
  const [minuteDraft, setMinuteDraft] = useState(normalizedMinute);
  const [editingPart, setEditingPart] = useState<'hour' | 'minute' | null>(null);

  useEffect(() => {
    if (editingPart) return;
    setHourDraft(normalizedHour);
    setMinuteDraft(normalizedMinute);
  }, [editingPart, normalizedHour, normalizedMinute]);

  function sanitizeDraft(text: string): string {
    return text.replace(/\D/g, '').slice(0, 2);
  }

  function commitTime(nextHour = hourDraft, nextMinute = minuteDraft) {
    const parsedHour = nextHour === '' ? 0 : Number(nextHour);
    const parsedMinute = nextMinute === '' ? 0 : Number(nextMinute);
    const safeHour = Math.min(23, Math.max(0, Number.isFinite(parsedHour) ? parsedHour : 0));
    const safeMinute = Math.min(59, Math.max(0, Number.isFinite(parsedMinute) ? parsedMinute : 0));
    const finalHour = String(safeHour).padStart(2, '0');
    const finalMinute = String(safeMinute).padStart(2, '0');
    setHourDraft(finalHour);
    setMinuteDraft(finalMinute);
    onChange(`${finalHour}:${finalMinute}`);
  }

  function changeHour(text: string) {
    const next = sanitizeDraft(text);
    setHourDraft(next);
    if (next.length === 2) {
      const safe = Math.min(23, Number(next));
      const finalHour = String(safe).padStart(2, '0');
      setHourDraft(finalHour);
      onChange(`${finalHour}:${(minuteDraft || '0').padStart(2, '0')}`);
    }
  }

  function changeMinute(text: string) {
    const next = sanitizeDraft(text);
    setMinuteDraft(next);
    if (next.length === 2) {
      const safe = Math.min(59, Number(next));
      const finalMinute = String(safe).padStart(2, '0');
      setMinuteDraft(finalMinute);
      onChange(`${(hourDraft || '0').padStart(2, '0')}:${finalMinute}`);
    }
  }

  return (
    <View>
      <View style={styles.fixedTimeBox}>
        <TextInput
          style={styles.timePartInput}
          value={hourDraft}
          onFocus={() => {
            setEditingPart('hour');
            setHourDraft('');
          }}
          onChangeText={changeHour}
          onBlur={() => {
            commitTime();
            setEditingPart(null);
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="HH"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Hora en formato de 00 a 23"
        />
        <Text style={styles.timeColon}>:</Text>
        <TextInput
          style={styles.timePartInput}
          value={minuteDraft}
          onFocus={() => {
            setEditingPart('minute');
            setMinuteDraft('');
          }}
          onChangeText={changeMinute}
          onBlur={() => {
            commitTime();
            setEditingPart(null);
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Minutos en formato de 00 a 59"
        />
      </View>
      <Text style={styles.timeRangeHint}>24 horas: 00:00 a 23:59</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    helpText: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginBottom: 10 },
    dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    dayChip: {
      minWidth: 49,
      height: 37,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 9,
    },
    dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayChipText: { color: colors.text, fontSize: 11.5, fontWeight: '900' },
    dayChipTextSelected: { color: '#fff' },
    dayTimeCard: {
      marginTop: 10,
      padding: 12,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.soft,
    },
    dayTimeHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
    dayTimeTitle: { color: colors.text, fontWeight: '900', fontSize: 13 },
    timeRow: { flexDirection: 'row', gap: 9 },
    timeField: { flex: 1 },
    timeLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '800', marginBottom: 5 },
    fixedTimeBox: {
      minHeight: 45,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timePartInput: {
      width: 34,
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      textAlign: 'center',
      paddingVertical: 8,
    },
    timeColon: { color: colors.text, fontSize: 18, fontWeight: '900', marginHorizontal: 1 },
    timeRangeHint: { color: colors.muted, fontSize: 9.5, marginTop: 5, textAlign: 'center' },
    emptyBox: {
      marginTop: 10,
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: { color: colors.muted, fontSize: 11.5 },
  });
}
