export type ActionState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export const IDLE: ActionState = { status: "idle" };
