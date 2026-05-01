import { useRef, useEffect } from 'react';

const TILE = 48;
const WALK_SPEED = 4; // px per frame

type TileType = 'grass' | 'tall_grass' | 'tree' | 'path' | 'water' | 'flower' | 'rock';

function hash(x: number, y: number): number {
  let h = (x * 1664525 + y * 1013904223) | 0;
  h = (h ^ (h >>> 16)) * (-2048144789) | 0;
  h = (h ^ (h >>> 13)) * (-1028477387) | 0;
  return Math.abs(h ^ (h >>> 16)) % 100;
}

function getTile(wx: number, wy: number): TileType {
  if (wy % 12 === 0 || wx % 16 === 0) return 'path';
  const n = hash(wx, wy);
  if (n < 4) return 'water';
  if (n < 18) return 'tree';
  if (n < 34) return 'tall_grass';
  if (n < 37) return 'flower';
  if (n < 39) return 'rock';
  return 'grass';
}

function drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number, t: number, wx: number, wy: number) {
  const s = TILE;

  // Base
  const baseColors: Record<TileType, string> = {
    grass: '#4ade80', tall_grass: '#16a34a', tree: '#14532d',
    path: '#d97706', water: '#3b82f6', flower: '#4ade80', rock: '#4ade80',
  };
  ctx.fillStyle = baseColors[type];
  ctx.fillRect(x, y, s, s);

  // Grid line
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(x, y, s, 1);
  ctx.fillRect(x, y, 1, s);

  switch (type) {
    case 'grass': {
      const h = hash(wx, wy);
      if (h > 72) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x + 5 + (h % 28), y + 6 + ((h * 7) % 26), 2, 7);
        ctx.fillRect(x + 22 + (h % 18), y + 14 + ((h * 3) % 22), 2, 5);
      }
      break;
    }
    case 'tall_grass': {
      const sway = Math.sin(t * 0.04 + wx * 0.3 + wy * 0.2) * 2.5;
      ctx.fillStyle = '#15803d';
      for (const bx of [5, 13, 21, 29, 37]) {
        const bh = 12 + (hash(wx * 3 + bx, wy) % 12);
        ctx.fillRect(x + bx + sway * 0.5, y + s - bh, 3, bh);
      }
      ctx.fillStyle = '#22c55e';
      for (const bx of [9, 25, 37]) {
        ctx.fillRect(x + bx + sway, y + s - 20, 2, 16);
      }
      break;
    }
    case 'tree': {
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(x + s / 2 - 5, y + s / 2 - 6, s / 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(x + s / 2 - 8, y + s / 2 - 9, s / 6, 0, Math.PI * 2);
      ctx.fill();
      // Dark shadow at bottom
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y + s - 8, s, 8);
      break;
    }
    case 'path': {
      ctx.fillStyle = '#b45309';
      for (let i = 0; i < 10; i++) {
        const h3 = hash(wx * 11 + i, wy * 7 + i);
        ctx.fillRect(x + 2 + (h3 % (s - 4)), y + 2 + ((h3 * 7) % (s - 4)), 2, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + s - 3, y, 3, s);
      ctx.fillRect(x, y + s - 3, s, 3);
      break;
    }
    case 'water': {
      const w1 = Math.sin(t * 0.025 + wx * 0.18) * 2;
      const w2 = Math.sin(t * 0.025 + wx * 0.18 + 2) * 2;
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(x + 3, y + 9 + w1, s - 6, 4);
      ctx.fillRect(x + 3, y + 22 + w2, s - 6, 4);
      ctx.fillRect(x + 3, y + 35 + w1, s - 6, 4);
      ctx.fillStyle = '#bfdbfe';
      ctx.fillRect(x + s / 2 + Math.sin(t * 0.1) * 5, y + s / 2 - 2, 4, 4);
      // Shoreline shimmer
      ctx.fillStyle = 'rgba(191,219,254,0.3)';
      ctx.fillRect(x, y, s, 3);
      break;
    }
    case 'flower': {
      const colors = ['#fbbf24', '#f9a8d4', '#c084fc', '#fb923c', '#34d399'];
      const h4 = hash(wx, wy);
      for (let i = 0; i < 3; i++) {
        const h5 = hash(wx * 5 + i, wy * 3 + i);
        const fx = x + 5 + (h5 % (s - 10));
        const fy = y + 5 + ((h5 * 3) % (s - 10));
        ctx.fillStyle = colors[(h4 + i) % colors.length];
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'rock': {
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.ellipse(x + s / 2, y + s / 2 + 2, s / 3, s / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath();
      ctx.arc(x + s / 2 - 7, y + s / 2 - 4, s / 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + s / 2 + 2, y + s / 2 + 10, s / 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

interface Props {
  playerSprite: string;
  stepCount: number;
  encountering: boolean;
}

export default function GameMap({ playerSprite, stepCount, encountering }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef({ x: 50, y: 50 });
  const walkAnimRef = useRef(0);
  const walkDirRef = useRef({ dx: 0, dy: -1 });
  const tRef = useRef(0);
  const prevStepRef = useRef(stepCount);
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const encounteringRef = useRef(encountering);
  encounteringRef.current = encountering;

  useEffect(() => {
    if (!playerSprite) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = playerSprite;
    img.onload = () => { playerImgRef.current = img; };
  }, [playerSprite]);

  useEffect(() => {
    if (stepCount === prevStepRef.current) return;
    prevStepRef.current = stepCount;
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: -1 }, { dx: 0, dy: -1 },
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    walkDirRef.current = dir;
    worldRef.current.x += dir.dx;
    worldRef.current.y += dir.dy;
    walkAnimRef.current = TILE;
  }, [stepCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let frameId: number;

    const draw = () => {
      tRef.current++;
      const t = tRef.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;

      if (walkAnimRef.current > 0) {
        walkAnimRef.current = Math.max(0, walkAnimRef.current - WALK_SPEED);
      }
      const animProg = walkAnimRef.current / TILE;
      const camX = worldRef.current.x + animProg * (-walkDirRef.current.dx);
      const camY = worldRef.current.y + animProg * (-walkDirRef.current.dy);

      const startTX = Math.floor(camX - W / (2 * TILE)) - 1;
      const startTY = Math.floor(camY - H / (2 * TILE)) - 1;
      const endTX = startTX + Math.ceil(W / TILE) + 3;
      const endTY = startTY + Math.ceil(H / TILE) + 3;

      for (let ty = startTY; ty <= endTY; ty++) {
        for (let tx = startTX; tx <= endTX; tx++) {
          const tile = getTile(tx, ty);
          const sx = (tx - camX) * TILE + W / 2;
          const sy = (ty - camY) * TILE + H / 2;
          drawTile(ctx, tile, sx, sy, t, tx, ty);
        }
      }

      // Player shadow
      const cx = W / 2;
      const cy = H / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + TILE / 2 - 2, TILE / 2.8, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Player bounce
      const bounce = walkAnimRef.current > 0 ? Math.sin((1 - animProg) * Math.PI) * 7 : 0;

      if (playerImgRef.current) {
        ctx.drawImage(playerImgRef.current, cx - TILE / 2, cy - TILE / 2 - bounce, TILE, TILE);
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, cy - bounce, TILE / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Encounter "!" flash
      if (encounteringRef.current && Math.sin(t * 0.25) > 0) {
        ctx.font = `bold ${Math.round(TILE * 0.65)}px monospace`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('!', cx + TILE * 0.6, cy - TILE * 0.4 - bounce);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('!', cx + TILE * 0.6, cy - TILE * 0.4 - bounce);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-green-600">
      <canvas ref={canvasRef} className="block" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
