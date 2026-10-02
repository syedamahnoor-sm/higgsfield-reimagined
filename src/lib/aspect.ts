import { ASPECT_RATIOS } from "@/lib/constants";
import type { AspectRatio } from "@/lib/types";

export function aspectValue(aspect: AspectRatio) {
  const ratio = ASPECT_RATIOS.find((r) => r.id === aspect) ?? ASPECT_RATIOS[0];
  return ratio.w / ratio.h;
}

/** Closest supported aspect ratio, compared in log space so 2:1 and 1:2 are equally far from 1:1. */
export function closestAspect(width: number, height: number): AspectRatio {
  const target = Math.log(width / height);
  let best = ASPECT_RATIOS[0];
  for (const r of ASPECT_RATIOS) {
    if (Math.abs(Math.log(r.w / r.h) - target) < Math.abs(Math.log(best.w / best.h) - target)) best = r;
  }
  return best.id;
}

/** Centered crop of a source image to a target aspect ratio. */
export function centerCrop(srcWidth: number, srcHeight: number, aspect: number) {
  let sw = srcWidth;
  let sh = srcHeight;
  if (srcWidth / srcHeight > aspect) sw = srcHeight * aspect;
  else sh = srcWidth / aspect;
  return { sx: (srcWidth - sw) / 2, sy: (srcHeight - sh) / 2, sw, sh };
}

/**
 * Picks the column count that makes `count` tiles of a given aspect as large as
 * possible inside a box. Only column counts that divide evenly are considered,
 * so grids never have a ragged last row.
 */
export function fitGrid(boxWidth: number, boxHeight: number, count: number, aspect: number, gap: number) {
  let best = { cols: 1, rows: count, width: 0, height: 0 };
  for (let cols = 1; cols <= count; cols++) {
    if (count % cols !== 0) continue;
    const rows = count / cols;
    const width = Math.min((boxWidth - gap * (cols - 1)) / cols, ((boxHeight - gap * (rows - 1)) / rows) * aspect);
    if (width > best.width) best = { cols, rows, width, height: width / aspect };
  }
  return { ...best, width: Math.max(0, Math.floor(best.width)), height: Math.max(0, Math.floor(best.height)) };
}
