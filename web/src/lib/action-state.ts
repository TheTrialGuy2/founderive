export type ActionState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  result?: Record<string, string>; // for actions that hand back links or a summary
};

export const IDLE: ActionState = { status: "idle" };
