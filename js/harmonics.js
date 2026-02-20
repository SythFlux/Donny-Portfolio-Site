/* ═══════════════════════════════════════════════════════════════════
   harmonics.js — Real spherical harmonics (degree 0-3)
   12 basis functions with correct normalisation constants.
   ═══════════════════════════════════════════════════════════════════ */

/** Array of Y_l^m(θ, φ) functions for l = 0 … 3 */
export const Y = [
  /*  Y_0^0  */ ()     => 0.2820947917,
  /*  Y_1^-1 */ (t,p)  => 0.4886025119 * Math.sin(t) * Math.sin(p),
  /*  Y_1^0  */ (t)    => 0.4886025119 * Math.cos(t),
  /*  Y_1^1  */ (t,p)  => 0.4886025119 * Math.sin(t) * Math.cos(p),
  /*  Y_2^-2 */ (t,p)  => 0.5462742153 * Math.sin(t)**2 * Math.sin(2*p),
  /*  Y_2^-1 */ (t,p)  => 0.5462742153 * Math.sin(t)*Math.cos(t) * Math.sin(p),
  /*  Y_2^0  */ (t)    => 0.3153915653 * (3*Math.cos(t)**2 - 1),
  /*  Y_2^1  */ (t,p)  => 0.5462742153 * Math.sin(t)*Math.cos(t) * Math.cos(p),
  /*  Y_2^2  */ (t,p)  => 0.5462742153 * Math.sin(t)**2 * Math.cos(2*p),
  /*  Y_3^-1 */ (t,p)  => 0.4570457995 * Math.sin(t)*(5*Math.cos(t)**2-1)*Math.sin(p),
  /*  Y_3^0  */ (t)    => 0.3731763326 * (5*Math.cos(t)**3 - 3*Math.cos(t)),
  /*  Y_3^1  */ (t,p)  => 0.4570457995 * Math.sin(t)*(5*Math.cos(t)**2-1)*Math.cos(p),
];

const N_COEFFS = Y.length;

/**
 * Evaluate radial displacement from SH coefficients.
 * r(θ,φ) = Σ c_i · Y_i(θ,φ)
 */
export function shDeform(theta, phi, coeffs) {
  let r = 0;
  for (let i = 0; i < N_COEFFS; i++) r += coeffs[i] * Y[i](theta, phi);
  return r;
}

/**
 * Generate a random set of 12 SH coefficients.
 * @param {number} base  DC coefficient (overall size)
 * @param {number} amp   Amplitude for higher-order terms
 */
export function randomCoeffs(base, amp) {
  const c = new Float64Array(N_COEFFS);
  c[0] = base;
  for (let i = 1;  i < 4;  i++) c[i] = (Math.random() - 0.5) * amp * 0.45;
  for (let i = 4;  i < 9;  i++) c[i] = (Math.random() - 0.5) * amp * 0.60;
  for (let i = 9;  i < 12; i++) c[i] = (Math.random() - 0.5) * amp * 0.35;
  return c;
}
