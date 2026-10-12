"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { TODAY } from "@/config";
import type { DraftWriteup } from "@/core/agent";
import { listPrograms, seed } from "@/data/repo";
import type { Conversation, FounderBasics, HomeworkItem, Phase, ProfileAnswer, Program } from "@/data/types";
import { dana } from "@/data/fixtures/founders";

/** The homework a new discovery conversation counts toward in the storyline. */
const DISCOVERY_HOMEWORK_ID = "esc-5-a";

interface DemoState {
  conversations: Conversation[];
  programs: Program[];
  extraArtifacts: Record<string, string>;
  checkinConfirmed: boolean;
  reportedEdits: Record<string, string>;
  optIns: string[];
  profile: ProfileAnswer[];
  basics: FounderBasics;
  /** Follow-ups and mentor homework the founder has ticked off. */
  doneTasks: string[];
  /** Earlier phases the founder has reopened. Startups loop; revisiting isn't failure. */
  revisiting: Phase[];
}

interface DemoActions {
  approveConversation: (draft: DraftWriteup) => Conversation;
  markHomeworkDone: (homeworkId: string, label: string) => void;
  skipHomework: (homeworkId: string, reason: string) => void;
  toggleTask: (taskId: string) => void;
  toggleRevisit: (phase: Phase) => void;
  confirmCheckin: (edits: Record<string, string>) => void;
  toggleOptIn: (partnerId: string) => void;
  addHomework: (programId: string, sessionN: number, item: Omit<HomeworkItem, "id" | "evidenceIds">) => void;
  removeHomework: (programId: string, sessionN: number, homeworkId: string) => void;
  saveProfile: (answers: ProfileAnswer[], basics: FounderBasics) => void;
}

const DemoContext = createContext<(DemoState & DemoActions) | null>(null);

const initialState = (): DemoState => ({
  conversations: seed.conversations,
  programs: structuredClone(listPrograms()),
  extraArtifacts: {},
  checkinConfirmed: false,
  reportedEdits: {},
  optIns: [],
  profile: dana.profile,
  basics: {
    name: dana.name,
    ventureName: dana.ventureName,
    oneLiner: dana.oneLiner,
    city: dana.city,
    phase: dana.phase,
    ventureType: dana.ventureType,
  },
  doneTasks: [],
  revisiting: [],
});

const mapHomework = (programs: Program[], fn: (item: HomeworkItem) => HomeworkItem): Program[] =>
  programs.map((p) => ({
    ...p,
    sessions: p.sessions.map((s) => ({ ...s, homework: s.homework.map(fn) })),
  }));

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);

  const approveConversation = useCallback((draft: DraftWriteup) => {
    const conversation: Conversation = { ...draft, id: `conv-new-${Date.now()}`, founderId: dana.id, occurredAt: TODAY };
    setState((s) => ({
      ...s,
      conversations: [...s.conversations, conversation],
      programs:
        draft.type === "customer_discovery"
          ? mapHomework(s.programs, (h) =>
              h.id === DISCOVERY_HOMEWORK_ID && h.evidenceIds.length < h.required
                ? { ...h, evidenceIds: [...h.evidenceIds, conversation.id] }
                : h,
            )
          : s.programs,
    }));
    return conversation;
  }, []);

  const markHomeworkDone = useCallback((homeworkId: string, label: string) => {
    const artifactId = `art-new-${homeworkId}`;
    setState((s) => ({
      ...s,
      extraArtifacts: { ...s.extraArtifacts, [artifactId]: label },
      programs: mapHomework(s.programs, (h) =>
        h.id === homeworkId ? { ...h, evidenceIds: [...h.evidenceIds, artifactId].slice(0, h.required) } : h,
      ),
    }));
  }, []);

  const skipHomework = useCallback((homeworkId: string, reason: string) => {
    setState((s) => ({ ...s, programs: mapHomework(s.programs, (h) => (h.id === homeworkId ? { ...h, skippedReason: reason } : h)) }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setState((s) => ({
      ...s,
      doneTasks: s.doneTasks.includes(taskId) ? s.doneTasks.filter((t) => t !== taskId) : [...s.doneTasks, taskId],
    }));
  }, []);

  const toggleRevisit = useCallback((phase: Phase) => {
    setState((s) => ({
      ...s,
      revisiting: s.revisiting.includes(phase) ? s.revisiting.filter((p) => p !== phase) : [...s.revisiting, phase],
    }));
  }, []);

  const confirmCheckin = useCallback((edits: Record<string, string>) => {
    setState((s) => ({ ...s, checkinConfirmed: true, reportedEdits: edits }));
  }, []);

  const toggleOptIn = useCallback((partnerId: string) => {
    setState((s) => ({
      ...s,
      optIns: s.optIns.includes(partnerId) ? s.optIns.filter((id) => id !== partnerId) : [...s.optIns, partnerId],
    }));
  }, []);

  const addHomework = useCallback(
    (programId: string, sessionN: number, item: Omit<HomeworkItem, "id" | "evidenceIds">) => {
      setState((s) => ({
        ...s,
        programs: s.programs.map((p) =>
          p.id !== programId
            ? p
            : {
                ...p,
                sessions: p.sessions.map((sess) =>
                  sess.n !== sessionN
                    ? sess
                    : { ...sess, homework: [...sess.homework, { ...item, id: `hw-${Date.now()}`, evidenceIds: [] }] },
                ),
              },
        ),
      }));
    },
    [],
  );

  const removeHomework = useCallback((programId: string, sessionN: number, homeworkId: string) => {
    setState((s) => ({
      ...s,
      programs: s.programs.map((p) =>
        p.id !== programId
          ? p
          : {
              ...p,
              sessions: p.sessions.map((sess) =>
                sess.n !== sessionN ? sess : { ...sess, homework: sess.homework.filter((h) => h.id !== homeworkId) },
              ),
            },
      ),
    }));
  }, []);

  const saveProfile = useCallback((answers: ProfileAnswer[], basics: FounderBasics) => {
    setState((s) => ({ ...s, profile: answers, basics }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      approveConversation,
      markHomeworkDone,
      skipHomework,
      toggleTask,
      toggleRevisit,
      confirmCheckin,
      toggleOptIn,
      addHomework,
      removeHomework,
      saveProfile,
    }),
    [state, approveConversation, markHomeworkDone, skipHomework, toggleTask, toggleRevisit, confirmCheckin, toggleOptIn, addHomework, removeHomework, saveProfile],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
