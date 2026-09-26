export const MARBLE_SPACING = 26;
const JOIN = MARBLE_SPACING * 1.35;
const PULL_SPEED = 360;

export type MarbleBall = { color: number; s: number };

export function sortChain(balls: MarbleBall[]) {
  balls.sort((a, b) => b.s - a.s);
}

export function segmentsOf(balls: MarbleBall[]): MarbleBall[][] {
  sortChain(balls);
  const groups: MarbleBall[][] = [];
  for (const ball of balls) {
    const group = groups[groups.length - 1];
    const tail = group?.[group.length - 1];
    if (!group || !tail || tail.s - ball.s > JOIN) groups.push([ball]);
    else group.push(ball);
  }
  return groups;
}

function packForward(group: MarbleBall[], dt: number) {
  for (let i = 1; i < group.length; i += 1) {
    const desired = group[i - 1]!.s - MARBLE_SPACING;
    const ball = group[i]!;
    if (ball.s > desired) ball.s = desired;
    else ball.s += Math.min(desired - ball.s, 220 * dt);
  }
}

/** Front segment rolls back toward the hole-side gap. Rear segments keep the slow forward speed. */
export function stepChain(balls: MarbleBall[], dt: number, forwardSpeed: number): boolean {
  const groups = segmentsOf(balls);
  const front = groups[0];
  if (!front) return false;
  if (groups.length === 1) {
    front[0]!.s += forwardSpeed * dt;
    packForward(front, dt);
    return false;
  }
  const behind = groups[1]!;
  const tail = front[front.length - 1]!;
  const stop = behind[0]!.s + MARBLE_SPACING;
  const gap = tail.s - stop;
  if (gap > 0) {
    const step = Math.min(gap, PULL_SPEED * dt);
    for (const ball of front) ball.s -= step;
  }
  for (let index = 1; index < groups.length; index += 1) {
    const group = groups[index]!;
    group[0]!.s += forwardSpeed * dt;
    packForward(group, dt);
  }
  return gap > 0.5;
}

export function pushApart(balls: MarbleBall[]) {
  sortChain(balls);
  for (let i = 1; i < balls.length; i += 1) {
    const limit = balls[i - 1]!.s - MARBLE_SPACING;
    if (balls[i]!.s > limit) balls[i]!.s = limit;
  }
}

export function clearTouching(balls: MarbleBall[]) {
  sortChain(balls);
  const drop = new Set<MarbleBall>();
  let index = 0;
  while (index < balls.length) {
    let end = index + 1;
    while (
      end < balls.length &&
      balls[end]!.color === balls[index]!.color &&
      balls[end - 1]!.s - balls[end]!.s <= JOIN
    ) {
      end += 1;
    }
    if (end - index >= 3) {
      for (let k = index; k < end; k += 1) drop.add(balls[k]!);
    }
    index = end;
  }
  if (!drop.size) return 0;
  const next = balls.filter((ball) => !drop.has(ball));
  balls.splice(0, balls.length, ...next);
  return drop.size;
}

type Tone = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
};

function audioCtor() {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

export function createMarbleSfx() {
  let context: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let dangerAt = 0;

  const getContext = () => {
    const Ctor = audioCtor();
    if (!Ctor) return null;
    if (!context) context = new Ctor();
    return context;
  };

  const noiseBuffer = (ctx: AudioContext) => {
    if (noise) return noise;
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    noise = buffer;
    return buffer;
  };

  const tone = (ctx: AudioContext, spec: Tone) => {
    const start = ctx.currentTime + (spec.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type ?? "sine";
    osc.frequency.setValueAtTime(spec.frequency, start);
    if (spec.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.slideTo), start + spec.duration);
    const peak = spec.gain ?? 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + spec.duration + 0.02);
  };

  const burst = (ctx: AudioContext, frequency: number, duration: number, peak: number) => {
    const start = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(start);
    src.stop(start + duration + 0.02);
  };

  const play = (run: (ctx: AudioContext) => void) => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      run(ctx);
    } catch {
      /* sound is optional */
    }
  };

  return {
    unlock() {
      try {
        const ctx = getContext();
        if (ctx && ctx.state === "suspended") void ctx.resume();
      } catch {
        /* sound is optional */
      }
    },
    shoot() {
      play((ctx) => {
        burst(ctx, 520, 0.09, 0.05);
        tone(ctx, { frequency: 220, slideTo: 480, duration: 0.09, type: "sine", gain: 0.05 });
      });
    },
    insert() {
      play((ctx) => {
        tone(ctx, { frequency: 980, duration: 0.04, type: "triangle", gain: 0.07 });
      });
    },
    pop(step: number) {
      const lift = Math.min(6, Math.max(1, step));
      const frequency = 360 + lift * 80;
      play((ctx) => {
        burst(ctx, frequency, 0.14, 0.07 + lift * 0.012);
        tone(ctx, { frequency, duration: 0.12, type: "sine", gain: 0.06 + lift * 0.01 });
        if (lift > 1) {
          tone(ctx, { frequency: frequency * 1.5, duration: 0.1, type: "triangle", gain: 0.04 + lift * 0.008 });
        }
      });
    },
    whoosh() {
      play((ctx) => {
        const start = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1400, start);
        filter.frequency.exponentialRampToValueAtTime(280, start + 0.16);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(start);
        src.stop(start + 0.18);
      });
    },
    danger(now: number) {
      if (now - dangerAt < 720) return;
      dangerAt = now;
      play((ctx) => {
        tone(ctx, { frequency: 196, duration: 0.16, type: "sine", gain: 0.035 });
      });
    },
    win() {
      play((ctx) => {
        tone(ctx, { frequency: 523, duration: 0.12, gain: 0.06 });
        tone(ctx, { frequency: 659, duration: 0.12, gain: 0.06, delay: 0.09 });
        tone(ctx, { frequency: 784, duration: 0.18, gain: 0.07, delay: 0.18 });
      });
    },
    lose() {
      play((ctx) => {
        tone(ctx, { frequency: 392, slideTo: 180, duration: 0.28, type: "triangle", gain: 0.05 });
      });
    },
  };
}
