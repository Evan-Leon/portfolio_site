/*
 * The page's ordered scene registry. Every asset URL added here must be built
 * from import.meta.env.BASE_URL and must not start with a leading slash.
 */
import { placeholder } from "../adapters/placeholder";
import type { SceneDef } from "./types";

export const scenes: SceneDef[] = [
  { id: "lot", vh: 300, adapter: placeholder("Lot") },
];
