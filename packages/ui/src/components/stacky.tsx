"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../cn";

/*
 * Stacky, the DsaKaro mascot: a stack of clay plates with a face on the top block.
 * The hollow ring eyes are the logo's graph nodes; the lime bulb is the stack's top pointer.
 * Shaded with gradients (no WebGL) and animated with transform/opacity only, so it stays
 * cheap and goes still under reduced motion. Its colours are fixed in both themes, like
 * the logo's lime node.
 */

export type StackyMood =
  "idle" | "accepted" | "due" | "streak" | "thinking" | "sleepy" | "celebrate";

const C = {
  ink: "#F4F4F6",
  rim: "#6E7BFF",
  arm: "#5D68F0",
  lime: "#D7FF3A",
  ember: "#FF7A45",
  amber: "#FFB938",
  violet: "#A48BFF",
};

const CX = 120;

type EyeShape = "open" | "wide" | "happy" | "think" | "closed";
type MouthShape = "smile" | "grin" | "o" | "wobble" | "flat" | "proud";
type ArmPose = "down" | "up" | "chin" | "hold";

const FACE: Record<StackyMood, { eye: EyeShape; mouth: MouthShape; arms: ArmPose }> = {
  idle: { eye: "open", mouth: "smile", arms: "down" },
  accepted: { eye: "happy", mouth: "grin", arms: "up" },
  due: { eye: "wide", mouth: "o", arms: "down" },
  streak: { eye: "happy", mouth: "proud", arms: "hold" },
  thinking: { eye: "think", mouth: "wobble", arms: "chin" },
  sleepy: { eye: "closed", mouth: "flat", arms: "down" },
  celebrate: { eye: "happy", mouth: "grin", arms: "up" },
};

/** Body motion per mood (keyframes live in the ui stylesheet). */
const MOTION: Record<StackyMood, string> = {
  idle: "stacky-float",
  accepted: "stacky-bounce",
  due: "stacky-float",
  streak: "stacky-float",
  thinking: "stacky-wobble",
  sleepy: "stacky-breathe",
  celebrate: "stacky-bounce",
};

function Plate({ y, dx = 0, id }: { y: number; dx?: number; id: string }) {
  const w = 156;
  const h = 18;
  const x = CX - w / 2 + dx;
  return (
    <g>
      {/* thickness under the plate */}
      <rect x={x + 2} y={y + 9} width={w - 4} height={h} rx={h / 2} fill={`url(#${id}-side)`} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        fill={`url(#${id}-plate)`}
        stroke={C.rim}
        strokeOpacity={0.6}
        strokeWidth={1.6}
      />
      <path
        d={`M${x + 16} ${y + 5} H${x + w * 0.56}`}
        stroke="#fff"
        strokeOpacity={0.24}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function Eyes({ shape }: { shape: EyeShape }) {
  const xs = [CX - 24, CX + 24];
  const y = 108;
  const stroke = { stroke: C.ink, strokeWidth: 5.5, strokeLinecap: "round" as const, fill: "none" };
  const ring = (x: number, r = 11) => (
    <g key={x}>
      <circle cx={x} cy={y} r={r - 2.5} fill="#0B0B12" />
      <circle cx={x} cy={y} r={r} {...stroke} />
      <circle cx={x + 3} cy={y - 3} r={2.8} fill={C.ink} />
    </g>
  );
  switch (shape) {
    case "open":
      return <>{xs.map((x) => ring(x))}</>;
    case "wide":
      return <>{xs.map((x) => ring(x, 13.5))}</>;
    case "happy":
      return (
        <>
          {xs.map((x) => (
            <path
              key={x}
              d={`M${x - 11} ${y + 4} Q${x} ${y - 10} ${x + 11} ${y + 4}`}
              {...stroke}
            />
          ))}
        </>
      );
    case "closed":
      return (
        <>
          {xs.map((x) => (
            <path key={x} d={`M${x - 11} ${y} Q${x} ${y + 9} ${x + 11} ${y}`} {...stroke} />
          ))}
        </>
      );
    case "think":
      return (
        <>
          {ring(xs[0]!)}
          <path d={`M${xs[1]! - 11} ${y + 1} L${xs[1]! + 11} ${y - 2}`} {...stroke} />
        </>
      );
  }
}

function Mouth({ shape }: { shape: MouthShape }) {
  const y = 133;
  const stroke = { stroke: C.ink, strokeWidth: 5, strokeLinecap: "round" as const, fill: "none" };
  switch (shape) {
    case "smile":
      return <path d={`M${CX - 13} ${y - 3} Q${CX} ${y + 9} ${CX + 13} ${y - 3}`} {...stroke} />;
    case "grin":
      return (
        <g>
          <path d={`M${CX - 16} ${y - 6} Q${CX} ${y + 15} ${CX + 16} ${y - 6} Z`} fill="#0B0B12" />
          <path
            d={`M${CX - 16} ${y - 6} Q${CX} ${y + 15} ${CX + 16} ${y - 6} Z`}
            fill="none"
            stroke={C.ink}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path d={`M${CX - 8} ${y + 4} Q${CX} ${y + 1} ${CX + 8} ${y + 4}`} fill="#FF8AA0" />
        </g>
      );
    case "o":
      return (
        <ellipse cx={CX} cy={y} rx={6.5} ry={8} fill="#0B0B12" stroke={C.ink} strokeWidth={4.5} />
      );
    case "wobble":
      return <path d={`M${CX - 14} ${y} q4.7 -5 9.3 0 t9.3 0 t9.3 0`} {...stroke} />;
    case "flat":
      return <path d={`M${CX - 7} ${y} H${CX + 7}`} {...stroke} />;
    case "proud":
      return (
        <path d={`M${CX - 12} ${y - 2} Q${CX + 2} ${y + 9} ${CX + 14} ${y - 5}`} {...stroke} />
      );
  }
}

const ARM_PATHS: Record<ArmPose, [string, string]> = {
  down: ["M54 120 Q36 128 38 146", "M186 120 Q204 128 202 146"],
  up: ["M54 112 Q34 98 36 74", "M186 112 Q206 98 204 74"],
  chin: ["M54 120 Q36 128 38 146", "M186 124 Q172 150 148 142"],
  hold: ["M54 120 Q36 128 38 146", "M186 114 Q206 100 200 74"],
};

/** Arms sit behind the head, except the chin-resting hand, which is drawn in `front`. */
function Arms({ pose, id, front = false }: { pose: ArmPose; id: string; front?: boolean }) {
  const [left, right] = ARM_PATHS[pose];
  const paths = pose === "chin" ? (front ? [right] : [left]) : front ? [] : [left, right];
  return (
    <g>
      {paths.map((d) => {
        const end = d.split(" ").slice(-2);
        return (
          <g key={d}>
            <path d={d} fill="none" stroke={C.arm} strokeWidth={9} strokeLinecap="round" />
            <path
              d={d}
              fill="none"
              stroke="#fff"
              strokeOpacity={0.28}
              strokeWidth={3}
              strokeLinecap="round"
              transform="translate(-1.5 -1.5)"
            />
            <circle cx={Number(end[0])} cy={Number(end[1])} r={7} fill={`url(#${id}-hand)`} />
          </g>
        );
      })}
    </g>
  );
}

function Pointer({ id, mood }: { id: string; mood: StackyMood }) {
  const dim = mood === "sleepy";
  return (
    <g opacity={dim ? 0.35 : 1}>
      <circle
        cx={CX}
        cy={42}
        r={mood === "due" ? 30 : 22}
        fill={`url(#${id}-glow)`}
        className={mood === "due" ? "stacky-pulse" : undefined}
      />
      <path d={`M${CX} 54 V76`} stroke="#A8CC1F" strokeWidth={5} strokeLinecap="round" />
      <path d={`M${CX - 1.2} 55 V74`} stroke={C.lime} strokeWidth={2} strokeLinecap="round" />
      <circle cx={CX} cy={42} r={11} fill={`url(#${id}-bulb)`} />
      <circle cx={CX - 4} cy={38} r={3} fill="#fff" opacity={0.85} />
    </g>
  );
}

function Flame({ id }: { id: string }) {
  return (
    <g transform="translate(200 52)">
      <g className="stacky-flame">
        <path
          d="M0 -32 C15 -15 19 -4 15 9 C12 18 4 23 0 23 C-4 23 -12 18 -15 9 C-19 -4 -9 -13 -4 -23 C-2 -13 2 -11 0 -32 Z"
          fill={`url(#${id}-flame)`}
        />
        <path
          d="M0 -9 C6 0 8 5 6 11 C4 15 2 17 0 17 C-2 17 -5 15 -6 11 C-8 5 -3 1 0 -9 Z"
          fill={C.amber}
        />
      </g>
    </g>
  );
}

function Sparkle({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="stacky-twinkle"
        style={{ animationDelay: `${delay}s`, fill: "var(--violet, #A48BFF)" }}
        d="M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4 Z"
      />
    </g>
  );
}

function Extras({ mood, id }: { mood: StackyMood; id: string }) {
  switch (mood) {
    case "accepted":
      return (
        <>
          <Sparkle x={34} y={52} s={1.1} />
          <Sparkle x={208} y={44} s={0.9} delay={0.6} />
          <Sparkle x={218} y={160} s={0.7} delay={1.1} />
          <Sparkle x={22} y={178} s={0.6} delay={0.3} />
        </>
      );
    case "due":
      return (
        <path
          className="stacky-pulse"
          d="M82 26 L71 17 M158 26 L169 17 M78 46 L64 46 M162 46 L176 46"
          stroke={C.lime}
          strokeWidth={4}
          strokeLinecap="round"
        />
      );
    case "streak":
      return <Flame id={id} />;
    case "thinking":
      return (
        <>
          <path
            d="M206 60 C206 60 197 73 197 79 C197 84 201 88 206 88 C211 88 215 84 215 79 C215 73 206 60 206 60 Z"
            fill={C.rim}
            opacity={0.85}
          />
          <circle cx={203} cy={76} r={2.4} fill="#fff" opacity={0.7} />
        </>
      );
    case "sleepy":
      return (
        <g style={{ fill: "var(--ink-3, #686876)" }} fontFamily="Georgia, serif" fontStyle="italic">
          <text x={160} y={58} fontSize={22} opacity={0.55} className="stacky-z">
            z
          </text>
          <text
            x={178}
            y={38}
            fontSize={30}
            opacity={0.4}
            className="stacky-z"
            style={{ animationDelay: "1.2s" }}
          >
            z
          </text>
        </g>
      );
    case "celebrate":
      return (
        <>
          <g className="stacky-drop">
            <g transform="rotate(-9 168 14)">
              <rect x={116} y={14} width={104} height={16} rx={8} fill="#11121A" />
              <rect
                x={116}
                y={6}
                width={104}
                height={16}
                rx={8}
                fill={`url(#${id}-plate)`}
                stroke={C.lime}
                strokeWidth={2}
              />
            </g>
          </g>
          {(
            [
              [30, 44, C.rim, 20],
              [210, 104, C.lime, -25],
              [18, 104, C.ember, 35],
              [214, 176, C.violet, 10],
              [36, 196, C.lime, -15],
              [196, 214, C.rim, 30],
            ] as const
          ).map(([x, y, fill, r], i) => (
            <rect
              key={i}
              className="stacky-twinkle"
              style={{ animationDelay: `${i * 0.25}s` }}
              x={x}
              y={y}
              width={10}
              height={6}
              rx={1.5}
              fill={fill}
              transform={`rotate(${r} ${x} ${y})`}
            />
          ))}
        </>
      );
    default:
      return null;
  }
}

export function Stacky({
  mood = "idle",
  size = 120,
  animate = true,
  label,
  className,
}: {
  mood?: StackyMood;
  /** Rendered width in px; height follows the 240 × 260 artboard. */
  size?: number;
  animate?: boolean;
  /** Accessible name. Without one, Stacky is decorative and hidden from screen readers. */
  label?: string;
  className?: string;
}) {
  const id = `stacky-${useId().replace(/[^\w-]/g, "")}`;
  const face = FACE[mood];
  const tilted = mood === "thinking";
  const a11y: { role?: string; "aria-label"?: string; "aria-hidden"?: true } = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true };

  return (
    <svg
      viewBox="0 0 240 260"
      width={size}
      height={(size * 260) / 240}
      className={cn("stacky shrink-0 overflow-visible", !animate && "stacky-still", className)}
      {...a11y}
    >
      <defs>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34364F" />
          <stop offset="1" stopColor="#1C1D2B" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0C0C14" />
          <stop offset="1" stopColor="#1A1B2E" />
        </linearGradient>
        <radialGradient id={`${id}-head`} cx="0.36" cy="0.26" r="0.85">
          <stop offset="0" stopColor="#35375A" />
          <stop offset="0.55" stopColor="#1E1F30" />
          <stop offset="1" stopColor="#14141E" />
        </radialGradient>
        <radialGradient id={`${id}-bulb`} cx="0.34" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#F6FFC8" />
          <stop offset="0.45" stopColor={C.lime} />
          <stop offset="1" stopColor="#8EB000" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={C.lime} stopOpacity="0.55" />
          <stop offset="1" stopColor={C.lime} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-hand`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#9AA3FF" />
          <stop offset="1" stopColor="#4A54D8" />
        </radialGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF5A2E" />
          <stop offset="1" stopColor={C.ember} />
        </linearGradient>
      </defs>

      <ellipse cx={CX} cy={246} rx={86} ry={10} fill={`url(#${id}-shadow)`} />

      <g className={MOTION[mood]}>
        <g className={tilted ? "stacky-tilt" : undefined}>
          <Plate y={204} dx={-4} id={id} />
          <Plate y={178} dx={4} id={id} />
          <Plate y={152} dx={-2} id={id} />

          <Arms pose={face.arms} id={id} />

          {/* head: depth, clay face, gloss */}
          <rect x={52} y={80} width={136} height={76} rx={28} fill="#0B0B12" />
          <rect
            x={52}
            y={72}
            width={136}
            height={76}
            rx={28}
            fill={`url(#${id}-head)`}
            stroke={C.rim}
            strokeWidth={2.6}
          />
          <ellipse
            cx={92}
            cy={84}
            rx={28}
            ry={6.5}
            fill="#fff"
            opacity={0.14}
            transform="rotate(-6 92 84)"
          />
          {mood !== "sleepy" && (
            <>
              <ellipse cx={78} cy={127} rx={8} ry={4.5} fill={C.rim} opacity={0.5} />
              <ellipse cx={162} cy={127} rx={8} ry={4.5} fill={C.rim} opacity={0.5} />
            </>
          )}
          <Eyes shape={face.eye} />
          <Mouth shape={face.mouth} />
          <Arms pose={face.arms} id={id} front />
          <Pointer id={id} mood={mood} />
        </g>
        <Extras mood={mood} id={id} />
      </g>
    </svg>
  );
}

/** Stacky with a caption below, for styleguide-style showcases. */
export function StackyCard({ mood, children }: { mood: StackyMood; children?: ReactNode }) {
  return (
    <figure className="surface-inset flex flex-col items-center gap-2 rounded-[16px] p-4">
      <Stacky mood={mood} size={120} />
      {children && <figcaption className="text-center text-12 text-ink-3">{children}</figcaption>}
    </figure>
  );
}
