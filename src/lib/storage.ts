import type { DocumentStatus } from "@/lib/types";

const STORAGE_KEY = "newity-doc-checklist-v1";

export type DocOverride = {
  status?: DocumentStatus;
  notes?: string | null;
};

export type Overrides = Record<string, DocOverride>;

let availabilityCache: boolean | null = null;

function isAvailable(): boolean {
  if (availabilityCache !== null) return availabilityCache;
  try {
    if (typeof window === "undefined") return (availabilityCache = false);
    const probe = "__newity_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return (availabilityCache = true);
  } catch {
    console.warn("localStorage unavailable — edits will not persist this session.");
    return (availabilityCache = false);
  }
}

export function getOverrides(): Overrides {
  if (!isAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Overrides;
  } catch (err) {
    console.warn("Failed to parse overrides; treating as empty:", err);
    return {};
  }
}

export function setDocOverride(docId: string, partial: DocOverride): void {
  if (!isAvailable()) return;
  try {
    const current = getOverrides();
    const merged: Overrides = {
      ...current,
      [docId]: { ...current[docId], ...partial },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn("Failed to write override:", err);
  }
}

export function clearOverrides(): void {
  if (!isAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear overrides:", err);
  }
}
