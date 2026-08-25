/*
 * Library entry point.
 *
 * This is the surface an adapter author imports from — the interface to write
 * against, the smallest working example of one, and the conformance kit that
 * decides whether what you wrote is safe to scrub.
 *
 * ```ts
 * import { adapterContract } from 'portfolio-theater'
 * import type { AnimationAdapter, AdapterFactory } from 'portfolio-theater'
 * ```
 *
 * **`src/main.ts` must never import this file**, directly or through anything
 * it imports. The conformance kit imports 'vitest', so that path would pull the
 * whole test runner into `dist/` and into the production bundle. The
 * application entry and the library entry are separate on purpose; there is a
 * grep for it in the SD4 build log.
 */

export type {
  AnimationAdapter,
  AdapterFactory,
  AssetSpec,
} from "./adapters/types";
export type { SceneDef } from "./scenes/types";

export { placeholder, PLACEHOLDER_SCENE_CLASS } from "./adapters/placeholder";
export type {
  PlaceholderAdapter,
  PlaceholderSnapshot,
} from "./adapters/placeholder";
export { gsapTimeline, GSAP_CONTAINER_CLASS } from "./adapters/gsap-timeline";
export type {
  GsapTimeline,
  GsapTimelineAdapter,
  GsapTimelineBuilder,
  GsapTimelineContext,
  GsapTimelineSnapshot,
} from "./adapters/gsap-timeline";

export {
  checkAdapterContract,
  adapterContract,
  CONTRACT_CHECKS,
} from "./adapters/adapter-contract";
export type {
  ContractViolation,
  AdapterContractOptions,
  ObserveState,
} from "./adapters/adapter-contract";
