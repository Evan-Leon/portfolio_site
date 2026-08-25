/*
 * The page's ordered scene registry. Every asset URL added here must be built
 * from import.meta.env.BASE_URL and must not start with a leading slash — with
 * one recorded exception: the lot's posters and project links are the
 * portfolio *site's* own files, one level above the theater, and are declared
 * site-absolutely in `src/projects.ts`. See that file's header.
 */
import { lotScene } from "../lot/lot-scene";
import { VH_PER_SCREEN } from "../lot/geometry";
import { projects } from "../projects";
import type { SceneDef } from "./types";

export const scenes: SceneDef[] = [
  {
    id: "lot",
    /* One viewport for the pin itself, then a band of scrolling per screen. */
    vh: 100 + VH_PER_SCREEN * projects.length,
    adapter: lotScene(projects),
  },
];
