import { openDB } from "idb";
import type { Project, Preset } from "../engine/types";
// Keep the original database ID so the rebrand never hides existing projects.
const db = openDB("pixora-studio", 1, {
  upgrade(db) {
    db.createObjectStore("projects", { keyPath: "id" });
    db.createObjectStore("preferences");
  },
});
export const listProjects = async (): Promise<Project[]> =>
  (await (await db).getAll("projects")).sort((a, b) => b.updated - a.updated);
export const getProject = async (id: string): Promise<Project | undefined> =>
  (await db).get("projects", id);
export const putProject = async (p: Project) => (await db).put("projects", p);
export const deleteProject = async (id: string) =>
  (await db).delete("projects", id);
export const clearProjects = async () => (await db).clear("projects");
export const getPreference = async <T>(key: string, fallback: T): Promise<T> =>
  (await (await db).get("preferences", key)) ?? fallback;
export const setPreference = async (key: string, value: unknown) =>
  (await db).put("preferences", value, key);
export const clearPreferences = async () => (await db).clear("preferences");
export const getCustomPresets = () =>
  getPreference<Preset[]>("customPresets", []);
