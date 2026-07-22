#!/usr/bin/env python3
"""Synthesize a headlights-on flash.png from normal.png (carsized front view).

Effect learned from 296 real normal/flash pairs: white halo on each headlight,
light cone widening down to the ground, elliptical ground pool. Screen-blended,
alpha untouched.
"""
import numpy as np
from PIL import Image

XPRIOR_L, XPRIOR_R, YPRIOR = 0.145, 0.851, 0.53
R_REL = 0.083  # halo radius / car bbox width
TINT = np.array([1.0, 0.975, 0.92])  # warm white


def box_mean(a, k):
    pad = k // 2
    ap = np.pad(a, pad + 1, mode="edge").astype(np.float64)
    c = ap.cumsum(0).cumsum(1)
    s = c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    return (s / (k * k))[: a.shape[0], : a.shape[1]]


def detect_headlights(a):
    """a: HxWx4 float array. Returns (Lx, Rx, y, r, bbox)."""
    alpha = a[:, :, 3]
    ys, xs = np.nonzero(alpha > 10)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    rgb = a[:, :, :3]
    gray = rgb.mean(axis=2)
    sat = (rgb.max(axis=2) - rgb.min(axis=2)) / (rgb.max(axis=2) + 1e-3)
    contrast = box_mean(np.abs(gray - box_mean(gray, 9)), 15)
    bright = box_mean(gray, 7)
    score = contrast * (1 - 0.7 * sat) * (0.35 + 0.65 * bright / 255.0)
    score[alpha < 100] = 0

    found = {}
    for side, xprior in (("L", XPRIOR_L), ("R", XPRIOR_R)):
        cx0, cy0 = x0 + xprior * bw, y0 + YPRIOR * bh
        xw, yw = 0.075 * bw, 0.13 * bh
        yA, yB = int(max(cy0 - yw, 0)), int(min(cy0 + yw, score.shape[0]))
        xA, xB = int(max(cx0 - xw, 0)), int(min(cx0 + xw, score.shape[1]))
        sub = score[yA:yB, xA:xB]
        if sub.size == 0 or not (sub > 0).any():
            found[side] = (cx0, cy0)
            continue
        thr = np.percentile(sub[sub > 0], 92)
        yy, xx = np.nonzero(sub >= thr)
        wts = sub[yy, xx]
        found[side] = ((xx * wts).sum() / wts.sum() + xA,
                       (yy * wts).sum() / wts.sum() + yA)

    # symmetrize + clamp to prior
    cxm = (x0 + x1) / 2
    off = (abs(found["L"][0] - cxm) + abs(found["R"][0] - cxm)) / 2
    off = np.clip(off, (0.5 - XPRIOR_L - 0.05) * bw, (0.5 - XPRIOR_L + 0.05) * bw)
    y = (found["L"][1] + found["R"][1]) / 2
    y = np.clip(y, y0 + (YPRIOR - 0.10) * bh, y0 + (YPRIOR + 0.10) * bh)
    return cxm - off, cxm + off, y, R_REL * bw, (x0, x1, y0, y1)


def render_glow(shape, Lx, Rx, y, r, bbox):
    h, w = shape
    x0, x1, y0, y1 = bbox
    Y, X = np.mgrid[0:h, 0:w].astype(np.float64)
    glow = np.zeros((h, w))
    for cx in (Lx, Rx):
        # halo
        d = np.hypot(X - cx, Y - y)
        glow += 240 * np.exp(-((d / (1.15 * r)) ** 2))
        # beam cone: from just below halo to bottom of car bbox
        ytop, ybot = y + 0.2 * r, y1
        span = max(ybot - ytop, 1)
        t = np.clip((Y - ytop) / span, 0, 1)          # 0 at lamp, 1 at ground
        half_w = r * (0.55 + 1.8 * t)                  # widening cone
        lateral = np.abs(X - cx) / half_w              # 0 center, 1 edge
        in_beam = (Y >= ytop) & (lateral < 1)
        beam = np.zeros((h, w))
        prof = (1 - lateral ** 2).clip(0, 1)           # soft edges
        fade = 68 * (1 - 0.35 * t)                     # dims toward ground
        beam[in_beam] = (prof * fade)[in_beam]
        # streaks: 3 brighter rays inside the cone
        for sx in (-0.55, 0.0, 0.55):
            ray = np.abs((X - cx) / half_w - sx)
            beam[in_beam] += (26 * np.exp(-((ray / 0.13) ** 2)) * (1 - 0.3 * t))[in_beam]
        glow += beam
        # ground pool
        pool_y = y1 - 0.3 * r
        dp = np.hypot((X - cx) / (2.6 * r), (Y - pool_y) / (0.6 * r))
        glow += 60 * np.exp(-(dp ** 2))
    return glow.clip(0, 255)


def synthesize(normal_path, out_path):
    img = Image.open(normal_path).convert("RGBA")
    a = np.asarray(img, np.float64)
    Lx, Rx, y, r, bbox = detect_headlights(a)
    glow = render_glow(a.shape[:2], Lx, Rx, y, r, bbox)
    alpha_w = (a[:, :, 3] / 255.0)[..., None]
    g = glow[..., None] * TINT[None, None, :] * alpha_w
    rgb = a[:, :, :3]
    out = 255 - (255 - rgb) * (255 - g) / 255.0          # screen blend
    res = a.copy()
    res[:, :, :3] = out.clip(0, 255)
    Image.fromarray(res.astype(np.uint8)).save(out_path)
    return Lx, Rx, y, r


if __name__ == "__main__":
    import sys
    src, dst = sys.argv[1], sys.argv[2]
    print(synthesize(src, dst))
