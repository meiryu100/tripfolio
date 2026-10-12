import { geoNaturalEarth1Raw, geoProjection } from "d3-geo";

/**
 * The world map's projection: Natural Earth, with the contiguous US straightened.
 *
 * Natural Earth bends meridians more the further they are from the map's center,
 * so the US (around 100°W) came out tilted. Around the US we blend each point's x
 * toward a constant-width grid (vertical meridians, like the USA-only map); the
 * blend fades out smoothly over ~15°, so borders with Canada and Mexico still
 * line up and the rest of the world is untouched.
 */

const RAD = Math.PI / 180;

/** 1 inside [min, max], easing to 0 over `fade` degrees outside it. */
function band(value: number, min: number, max: number, fade: number) {
  const distance = value < min ? min - value : value > max ? value - max : 0;
  const t = Math.max(0, 1 - distance / fade);
  return t * t * (3 - 2 * t);
}

// Natural Earth's horizontal scale at the US's middle latitude: the straightened grid uses it everywhere.
const US_X_SCALE = geoNaturalEarth1Raw(1, 38 * RAD)[0];

function straightenedNaturalEarthRaw(lambda: number, phi: number): [number, number] {
  const [x, y] = geoNaturalEarth1Raw(lambda, phi);
  const weight = band(lambda / RAD, -126, -66, 18) * band(phi / RAD, 24, 50, 12);
  return [x + weight * (lambda * US_X_SCALE - x), y];
}

export function worldProjection() {
  return geoProjection(straightenedNaturalEarthRaw);
}
