/** Surface scene units are kilometers; the observer's eye is the origin. */

/**
 * Lookout height rather than standing height: satellite imagery is ~5 m/px,
 * so from 1.7 m the ground is a blur. 40 m reads like a viewpoint while
 * changing sky geometry by well under an arcsecond.
 */
export const EYE_HEIGHT_KM = 0.04

export const SUN_DISC_DIST_KM = 1e7
export const PLANET_POINT_DIST_KM = 1.5e7
export const GROUND_RADIUS_KM = 1e7

/** Backdrop sits this far below the eye — under the deepest exaggerated relief
 *  (~3 km) so it never occludes canyon floors, only fills cracks/the far edge. */
export const BACKDROP_DEPTH_KM = 9
