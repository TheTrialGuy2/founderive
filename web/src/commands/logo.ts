import { logoVersion, removeLogo, saveLogo } from "../store/logo";
import type { KindData } from "../store/schemas";
import { updateEntry } from "../store/update";

export { logoVersion };

type FounderData = KindData<"founder">;
const blankFounder = (): FounderData => ({ name: "", venture: "", setupComplete: false });

/** Saves a new logo and points founder.logo at it. Validation (type, size) happens in saveLogo; errors there propagate unchanged. */
export async function setLogo(bytes: Uint8Array): Promise<string> {
  const rel = await saveLogo(bytes);
  await updateEntry("founder", "founder.md", (existing, body) => ({ data: { ...(existing ?? blankFounder()), logo: rel }, body }));
  return rel;
}

/** Archives the current logo (never deletes) and clears founder.logo. Does nothing if there's no logo. */
export async function clearLogo(): Promise<void> {
  await removeLogo();
  await updateEntry("founder", "founder.md", (existing, body) => ({ data: { ...(existing ?? blankFounder()), logo: null }, body }));
}
