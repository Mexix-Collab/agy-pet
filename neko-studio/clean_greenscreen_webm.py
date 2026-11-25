"""
v3 物理级透明 WebM 绿幕反混合（Exact Green-Screen Color Unmixing + Despill + Bleed）引擎。

基于多轮像素级+视觉级闭环调优：
1. 严格收紧「天然绿色实心道具保护」仅锁定真正低明度自然绿实体核（如圣诞树深绿松针、青团主体、粽叶）
   及低饱和柔绿（如淡薄荷绿对话气泡），绝不误保护头顶高亮度荧光绿雾云团。
2. 物理反混合（Exact Green-Screen Unmixing）反解半透明发光特效（满月、星芒、水流、烟花、星尘、Z 气泡）
   的真实前景 RGB 与连续平滑 Alpha：
   - 冷色光效/水流（B > R）：精确压绿还原清澈水蓝/冰蓝（消除翡翠绿/青绿油漆感）
   - 暖色光效/满月/星光（R >= B）：精确压绿还原温润暖金（消除柠檬黄绿感）
   - 纯荧光绿雾（红蓝双低 + 高绿占比）：平滑强力归零 Alpha，彻底杜绝浅白背景下的灰绿脏雾环
3. 透明区边界 RGB 外扩（Edge Bleed）：杜绝 VP9 yuva420p 2x2 色度下采样把透明区渗色回前景轮廓。
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from scipy import ndimage


FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"


def probe_video(src: Path) -> tuple[int, int, str]:
    cmd = [
        FFPROBE, "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate",
        "-of", "json", str(src),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, check=True)
    st = json.loads(r.stdout)["streams"][0]
    return int(st["width"]), int(st["height"]), str(st.get("r_frame_rate", "24/1"))


def _rgb_to_hsv_np(r: np.ndarray, g: np.ndarray, b: np.ndarray):
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    delta = mx - mn
    nz = delta > 1e-6
    safe_d = np.where(nz, delta, 1.0)

    hr = 60.0 * (((g - b) / safe_d) % 6.0)
    hg = 60.0 * (((b - r) / safe_d) + 2.0)
    hb = 60.0 * (((r - g) / safe_d) + 4.0)

    hue = np.where((mx == r) & nz, hr, np.where((mx == g) & nz, hg, np.where((mx == b) & nz, hb, 0.0)))
    sat = np.where(mx > 1e-6, delta / np.maximum(mx, 1e-6), 0.0)
    return hue, sat, mx


def clean_rgba_frame(frame_u8: np.ndarray) -> np.ndarray:
    """
    v3 物理反混合 + 精准自然绿道具保护 + 强力去青绿/黄绿偏色 + 边界 RGB Bleed。
    输入/输出: (H, W, 4) uint8 RGBA
    """
    f = frame_u8.astype(np.float32) * (1.0 / 255.0)
    r = f[..., 0]
    g = f[..., 1]
    b = f[..., 2]
    a = f[..., 3]

    orig_bg = a < 0.03
    max_rb = np.maximum(r, b)
    avg_rb = 0.5 * (r + b)
    g_diff = g - max_rb

    hue, sat, _ = _rgb_to_hsv_np(r, g, b)

    # ------------------------------------------------------------------
    # 1. 精准判定「天然绿色实心道具保护遮罩」（严格排除高亮度荧光绿雾！）
    #    - 淡薄荷绿气泡（如“是啊，吃什么”）：a >= 0.88, sat < 0.28, g_diff < 0.14
    #    - 实心深绿道具核（如圣诞树深绿松针、青团、西瓜皮、粽叶）：
    #      a >= 0.96, g <= 0.66 (<=168), g_diff <= 0.30 (<=76)
    #      荧光绿雾实测 G >= 199 (0.78) 且 g_diff >= 76 (0.30)，绝对不会命中！
    # ------------------------------------------------------------------
    soft_pastel_green = (a >= 0.88) & (sat < 0.28) & (g_diff < 0.14)

    natural_dark_green_core = (
        (a >= 0.96)
        & (hue >= 72.0) & (hue <= 165.0)
        & (g_diff >= 0.04) & (g_diff <= 0.30)
        & (g >= 0.12) & (g <= 0.66)
        & (sat >= 0.18)
    )

    natural_prop_mask = soft_pastel_green.copy()
    if np.count_nonzero(natural_dark_green_core) >= 60:
        lbl, n_c = ndimage.label(natural_dark_green_core)
        if n_c > 0:
            sz = ndimage.sum(natural_dark_green_core, lbl, index=np.arange(1, n_c + 1))
            keep = np.where(sz >= 45)[0] + 1
            if len(keep) > 0:
                valid_dark_green = np.isin(lbl, keep)
                # 只允许扩散到紧邻深绿树干/青团的“实心且非荧光幕布”的亮绿叶片（受星光照亮的树冠）
                # 严格拦截高荧光纯绿 (g > 0.82 且 g_diff > 0.34) 防止扩散进圣诞树外圈绿雾
                opaque_natural_leaf = (
                    (a >= 0.96)
                    & (hue >= 70.0) & (hue <= 165.0)
                    & (g <= 0.84)
                    & (g_diff <= 0.34)
                )
                prop_zone = ndimage.binary_propagation(
                    valid_dark_green,
                    mask=(valid_dark_green | opaque_natural_leaf),
                    structure=np.ones((3, 3), dtype=bool),
                )
                # 补填圣诞树内部极小受光高光点（<= 3px 闭运算，仅限实心区）
                prop_zone = ndimage.binary_closing(prop_zone, iterations=2) & (a >= 0.95) & (g_diff <= 0.42)
                natural_prop_mask |= prop_zone

    # ------------------------------------------------------------------
    # 2. 计算需要执行物理反混合的权重 unmix_w ∈ [0, 1]
    #    对任何偏绿的半透明区、轮廓边以及高亮绿幕污染区，快速达到 1.0 确保彻底褪绿！
    # ------------------------------------------------------------------
    near_bg_4 = ndimage.binary_dilation(orig_bg, iterations=4) & (~orig_bg)
    edge_1 = ndimage.binary_dilation(orig_bg, iterations=1) & (~orig_bg)

    # 绿幕污染区（含月亮、水流、星芒、星光云、Z气泡、头顶荧光绿雾、浓厚翡翠绿水流核心）
    chroma_polluted_strength = (
        np.clip((g - 0.45) / 0.14, 0.0, 1.0)
        * np.clip((g_diff - 0.04) / 0.09, 0.0, 1.0)
        * np.clip((sat - 0.18) / 0.14, 0.0, 1.0)
    )
    # 针对浓厚青绿水流核心（B 较高且 G 明显高于 R 逼近 B，导致翡翠绿感）：也纳入冷色去绿校正
    teal_water_polluted = (
        (b > r + 0.14)
        & (g > r + 0.22)
        & (g > 0.56 * b + 0.44 * r + 0.06)
        & (~natural_prop_mask)
    )
    chroma_polluted_strength = np.where(teal_water_polluted, 1.0, chroma_polluted_strength)
    # 半透明区只要偏绿即 100% 进入反混合
    semi_strength = (
        np.clip((0.98 - a) / 0.08, 0.0, 1.0)
        * np.clip((g_diff - 0.02) / 0.06, 0.0, 1.0)
    )
    # 轮廓边 4px 内去绿溢色
    edge_strength = (
        near_bg_4.astype(np.float32)
        * np.clip((g_diff - 0.025) / 0.08, 0.0, 1.0)
    )

    unmix_w = np.maximum(np.maximum(chroma_polluted_strength, semi_strength), edge_strength)
    # 严格保护自然绿色道具（青团、圣诞树、淡绿气泡）内部不被脱色或扣洞
    unmix_w = np.where(natural_prop_mask & (~edge_1), 0.0, unmix_w)

    # ------------------------------------------------------------------
    # 3. 物理反混合 + 强力色彩校正（消除一切青绿/翡翠绿与柠檬黄绿残留）
    # ------------------------------------------------------------------
    g_bg = 0.88

    # 用 max(R,B) 与 (R+B)/2 构造真实前景的自然绿基准：
    # - 冷色光效/水流 (B > R)：g_target = 0.56*B + 0.44*R → 彻底把翡翠绿/青绿还原为清澈水蓝/梦幻冰蓝！
    # - 暖色光效/满月/星光 (R >= B)：g_target = 0.80*R + 0.20*B → 彻底把荧光黄绿还原为温润暖金！
    cool_blend = np.clip((b - r) / 0.14, 0.0, 1.0)
    g_limit_warm = 0.80 * r + 0.20 * b
    g_limit_cool = 0.56 * b + 0.44 * r
    g_limit = g_limit_warm * (1.0 - cool_blend) + g_limit_cool * cool_blend
    spill = np.maximum(0.0, g - g_limit)

    # 估算绿幕污染比例 w_bg 与真实前景有效不透明度 alpha_fg
    w_bg = np.clip(spill / g_bg, 0.0, 1.0)
    alpha_fg = np.clip(1.0 - w_bg, 0.0, 1.0)

    # 反解真实前景颜色 C_fg
    denom = np.maximum(alpha_fg, 0.34)
    r_unmix = np.clip(r / denom, 0.0, 1.0)
    b_unmix = np.clip(b / denom, 0.0, 1.0)

    # 暖色高亮（满月/星光）和冷色高亮（水流/星芒）按真实色相重算 G 通道，杜绝绿偏
    g_unmix_warm = 0.82 * r_unmix + 0.18 * b_unmix
    g_unmix_cool = 0.58 * b_unmix + 0.42 * r_unmix
    g_unmix = g_unmix_warm * (1.0 - cool_blend) + g_unmix_cool * cool_blend
    g_unmix = np.minimum(g, np.clip(g_unmix, 0.0, 1.0))

    r_out = r * (1.0 - unmix_w) + r_unmix * unmix_w
    g_out = g * (1.0 - unmix_w) + g_unmix * unmix_w
    b_out = b * (1.0 - unmix_w) + b_unmix * unmix_w

    # ------------------------------------------------------------------
    # 4. 连续平滑 Alpha 修正：
    #    - 彻底清零“纯绿幕雾环 / 灰青脏烟”（如吃青团头周灰雾、雀跃庆祝头顶灰烟、烟花外围毒绿雾）
    #    - 优雅保留有真实色相/高光的前景特效（金月、蓝水、冰蓝星芒、暖金星尘、Z 气泡）
    # ------------------------------------------------------------------
    rb_chroma = np.abs(r - b)
    # 前景真实信号强度：高亮度红/蓝 OR 明显暖金/水蓝色相倾向
    fg_signal = np.maximum(max_rb, rb_chroma * 1.45)

    # (a) 通用纯绿雾清除门限
    pure_fog_gate = (
        np.clip((0.46 - fg_signal) / 0.22, 0.0, 1.0)
        * np.clip((w_bg - 0.36) / 0.22, 0.0, 1.0)
    )
    # (b) 低彩度灰青脏烟清除（专治吃青团头顶灰雾 & 雀跃庆祝头顶两团灰青烟雾：
    #     R/B 相近且均不高，经反混合后若不压 alpha 会在白底显灰脏；保留高亮 Z 气泡边界 max_rb>=0.52）
    gray_haze_gate = (
        np.clip((0.18 - rb_chroma) / 0.10, 0.0, 1.0)
        * np.clip((0.50 - max_rb) / 0.14, 0.0, 1.0)
        * np.clip((w_bg - 0.32) / 0.18, 0.0, 1.0)
    )
    fog_kill = np.maximum(pure_fog_gate, gray_haze_gate)

    # 对满月/星芒/水花等强前景特效，适当提实一点 alpha（pow 0.72），避免月亮在深色背景下过于半透明
    alpha_scale = np.power(np.maximum(alpha_fg, 1e-5), 0.72) * (1.0 - fog_kill)

    # 极端纯绿幕直接归零
    dead_green = (fg_signal < 0.24) & (g > 0.62) & (g_diff > 0.42)
    alpha_scale = np.where(dead_green, 0.0, alpha_scale)

    alpha_mod_w = np.where(natural_prop_mask, 0.0, unmix_w)
    new_a = a * (1.0 - alpha_mod_w + alpha_mod_w * alpha_scale)

    # 极弱透明底噪平滑归零（彻底杜绝浅白背景隐约脏雾）
    fade_floor = np.clip((new_a - 0.03) / 0.05, 0.0, 1.0)
    new_a = new_a * fade_floor
    new_a[new_a < 0.032] = 0.0

    # ------------------------------------------------------------------
    # 5. 清理极小孤立绿幕残渣（<= 24px 且原属于低前景信号强绿雾）
    # ------------------------------------------------------------------
    vis_mask = new_a >= 0.04
    lbl2, n2 = ndimage.label(vis_mask)
    if n2 > 1:
        sizes2 = ndimage.sum(vis_mask, lbl2, index=np.arange(1, n2 + 1))
        tiny_ids = np.where(sizes2 <= 24)[0] + 1
        if len(tiny_ids) > 0:
            orig_was_green = (g_diff > 0.30) & (fg_signal < 0.38)
            tiny_g = ndimage.sum(orig_was_green & vis_mask, lbl2, index=tiny_ids)
            kill_ids = tiny_ids[tiny_g >= sizes2[tiny_ids - 1] * 0.5]
            if len(kill_ids) > 0:
                new_a[np.isin(lbl2, kill_ids)] = 0.0

    # ------------------------------------------------------------------
    # 6. 透明区域边界 RGB 外扩（Edge Bleed，防 VP9 yuva420p 2x2 渗色）
    # ------------------------------------------------------------------
    final_bg = new_a < 0.032
    fg_valid = ~final_bg
    if np.any(fg_valid) and np.any(final_bg):
        near_pad = ndimage.binary_dilation(fg_valid, iterations=6) & final_bg
        if np.any(near_pad):
            _, indices = ndimage.distance_transform_edt(final_bg, return_indices=True)
            iy, ix = indices[0], indices[1]
            r_out = np.where(near_pad, r_out[iy, ix], np.where(final_bg, 0.0, r_out))
            g_out = np.where(near_pad, g_out[iy, ix], np.where(final_bg, 0.0, g_out))
            b_out = np.where(near_pad, b_out[iy, ix], np.where(final_bg, 0.0, b_out))
        else:
            r_out[final_bg] = 0.0
            g_out[final_bg] = 0.0
            b_out[final_bg] = 0.0
    elif np.all(final_bg):
        r_out.fill(0.0)
        g_out.fill(0.0)
        b_out.fill(0.0)

    out = np.empty_like(frame_u8)
    out[..., 0] = np.clip(np.round(r_out * 255.0), 0, 255).astype(np.uint8)
    out[..., 1] = np.clip(np.round(g_out * 255.0), 0, 255).astype(np.uint8)
    out[..., 2] = np.clip(np.round(b_out * 255.0), 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(np.round(new_a * 255.0), 0, 255).astype(np.uint8)
    return out


def read_exact(stream, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = stream.read(n - len(buf))
        if not chunk:
            break
        buf.extend(chunk)
    return bytes(buf)


def process_one_webm(args: tuple[str, str, int]) -> dict:
    src_s, dst_s, crf = args
    t0 = time.time()
    src = Path(src_s)
    dst = Path(dst_s)
    dst.parent.mkdir(parents=True, exist_ok=True)

    w, h, fps_str = probe_video(src)
    frame_bytes = w * h * 4

    dec = subprocess.Popen(
        [
            FFMPEG, "-hide_banner", "-loglevel", "error",
            "-c:v", "libvpx-vp9",
            "-i", str(src),
            "-f", "rawvideo", "-pix_fmt", "rgba", "-",
        ],
        stdout=subprocess.PIPE,
    )
    enc = subprocess.Popen(
        [
            FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgba",
            "-s", f"{w}x{h}", "-r", fps_str,
            "-i", "-",
            "-c:v", "libvpx-vp9",
            "-pix_fmt", "yuva420p",
            "-crf", str(crf),
            "-b:v", "0",
            "-auto-alt-ref", "0",
            "-deadline", "good",
            "-cpu-used", "3",
            str(dst),
        ],
        stdin=subprocess.PIPE,
    )

    frames = 0
    try:
        while True:
            raw = read_exact(dec.stdout, frame_bytes)
            if len(raw) < frame_bytes:
                break
            arr = np.frombuffer(raw, dtype=np.uint8).reshape((h, w, 4))
            cleaned = clean_rgba_frame(arr)
            enc.stdin.write(cleaned.tobytes())
            frames += 1
    finally:
        if dec.stdout:
            dec.stdout.close()
        if enc.stdin:
            enc.stdin.close()
        rc_dec = dec.wait()
        rc_enc = enc.wait()

    if rc_dec != 0 or rc_enc != 0:
        raise RuntimeError(f"ffmpeg failed for {src.name}: dec={rc_dec}, enc={rc_enc}")

    elapsed = round(time.time() - t0, 2)
    return {
        "name": src.name,
        "frames": frames,
        "res": f"{w}x{h}",
        "src_kb": round(src.stat().st_size / 1024, 1),
        "dst_kb": round(dst.stat().st_size / 1024, 1),
        "sec": elapsed,
    }


def main():
    if len(sys.argv) < 4:
        print("Usage: clean_greenscreen_webm.py <src_dir> <dst_dir> <file1.webm,file2.webm,... | ALL> [workers=4] [crf=28]")
        return 1

    src_dir = Path(sys.argv[1])
    dst_dir = Path(sys.argv[2])
    spec = sys.argv[3]
    workers = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    crf = int(sys.argv[5]) if len(sys.argv) > 5 else 28

    if spec.upper() == "ALL":
        files = sorted(src_dir.glob("*.webm"))
    else:
        names = [x.strip() for x in spec.split(",") if x.strip()]
        files = [src_dir / n for n in names]

    tasks = [(str(p), str(dst_dir / p.name), crf) for p in files]
    print(f"Processing {len(tasks)} webm files (workers={workers}, crf={crf})...", flush=True)
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for idx, res in enumerate(ex.map(process_one_webm, tasks), 1):
            print(
                f"[{idx}/{len(tasks)}] {res['name']} | {res['frames']}f | {res['src_kb']}KB -> {res['dst_kb']}KB | {res['sec']}s",
                flush=True,
            )
    print(f"ALL DONE in {time.time() - t0:.1f}s -> {dst_dir}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
