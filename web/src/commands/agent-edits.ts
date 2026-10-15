import { updateEntry } from "../store/update";

export type AgentEditKind = "canvasBlock" | "conversation";

/** The founder keeps or reverts an agent's edit without changing the record's confirmed/imported state. */
export async function reviewAgentEdit(kind: AgentEditKind, path: string, choice: "keep" | "revert"): Promise<void> {
  if (kind === "canvasBlock") {
    await updateEntry("canvasBlock", path, (data, body) => {
      if (!data?.agentEdit) throw new Error("That agent edit is no longer waiting. Reload the page.");
      const { agentEdit, ...rest } = data;
      if (choice === "keep") {
        const history = data.text === agentEdit.previous || data.history.some((item) => item.date === agentEdit.date && item.text === agentEdit.previous)
          ? data.history
          : [...data.history, { date: agentEdit.date, text: agentEdit.previous }];
        return { data: { ...rest, history }, body };
      }
      const history = data.text === agentEdit.previous ? data.history : [...data.history, { date: agentEdit.date, text: data.text }];
      return { data: { ...rest, text: agentEdit.previous, updated: agentEdit.date, history }, body };
    });
    return;
  }
  await updateEntry("conversation", path, (data, body) => {
    if (!data?.agentEdit) throw new Error("That agent edit is no longer waiting. Reload the page.");
    const { agentEdit, ...rest } = data;
    const previousEdits = Array.isArray(rest.extensions?.agentEditHistory) ? rest.extensions.agentEditHistory : [];
    if (choice === "keep") {
      return {
        data: { ...rest, extensions: { ...rest.extensions, agentEditHistory: [...previousEdits, { date: agentEdit.date, summary: agentEdit.summary, text: agentEdit.previous }] } },
        body,
      };
    }
    return {
      data: { ...rest, extensions: { ...rest.extensions, agentEditHistory: [...previousEdits, { date: agentEdit.date, summary: agentEdit.summary, text: body.trim() }] } },
      body: agentEdit.previous.trim() ? `${agentEdit.previous.trim()}\n` : "",
    };
  });
}
