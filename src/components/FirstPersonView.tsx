import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { buildWildPokemon } from '../services/pokeapi';
import { getRandomQuestion } from '../data/questions';

// ── World generation (same hash logic as GameMap) ─────────────────────────────
function hash(x: number, y: number): number {
  let h = (x * 1664525 + y * 1013904223) | 0;
  h = (h ^ (h >>> 16)) * (-2048144789) | 0;
  h = (h ^ (h >>> 13)) * (-1028477387) | 0;
  return Math.abs(h ^ (h >>> 16)) % 100;
}

type TileType = 'grass' | 'tall_grass' | 'tree' | 'path' | 'water' | 'flower' | 'rock';

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

// ── Geometry / Material cache (shared across rebuilds) ────────────────────────
const GEO = {
  ground: new THREE.PlaneGeometry(1, 1),
  trunkBox: new THREE.BoxGeometry(0.7, 4, 0.7),
  leaf1: new THREE.BoxGeometry(2.6, 1.1, 2.6),
  leaf2: new THREE.BoxGeometry(2.0, 1.0, 2.0),
  leaf3: new THREE.BoxGeometry(1.4, 1.4, 1.4),
  rock1: new THREE.BoxGeometry(0.9, 0.7, 0.9),
  rock2: new THREE.BoxGeometry(0.5, 0.4, 0.5),
  water: new THREE.BoxGeometry(1, 0.35, 1),
  tallGrass: new THREE.PlaneGeometry(0.9, 0.75),
  flower: new THREE.BoxGeometry(0.22, 0.28, 0.22),
  cloud: new THREE.BoxGeometry(1, 0.5, 1),
};

const MAT = {
  grass:     new THREE.MeshLambertMaterial({ color: 0x4ade80 }),
  path:      new THREE.MeshLambertMaterial({ color: 0xd97706 }),
  trunk:     new THREE.MeshLambertMaterial({ color: 0x6b3a2a }),
  leaf1:     new THREE.MeshLambertMaterial({ color: 0x166534 }),
  leaf2:     new THREE.MeshLambertMaterial({ color: 0x15803d }),
  leaf3:     new THREE.MeshLambertMaterial({ color: 0x14532d }),
  rock:      new THREE.MeshLambertMaterial({ color: 0x9ca3af }),
  rockLight: new THREE.MeshLambertMaterial({ color: 0xd1d5db }),
  water:     new THREE.MeshLambertMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.82 }),
  tallGrass: new THREE.MeshLambertMaterial({ color: 0x16a34a, side: THREE.DoubleSide }),
  cloud:     new THREE.MeshLambertMaterial({ color: 0xffffff }),
  flowerColors: [
    new THREE.MeshLambertMaterial({ color: 0xfbbf24 }),
    new THREE.MeshLambertMaterial({ color: 0xf9a8d4 }),
    new THREE.MeshLambertMaterial({ color: 0xc084fc }),
    new THREE.MeshLambertMaterial({ color: 0x34d399 }),
    new THREE.MeshLambertMaterial({ color: 0xfb923c }),
  ],
};

function disposeGroup(g: THREE.Group) {
  g.traverse(obj => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
      if (!Object.values(GEO).includes(obj.geometry as never)) obj.geometry.dispose();
    }
  });
  g.clear();
}

function buildWorldAround(group: THREE.Group, cx: number, cz: number) {
  disposeGroup(group);

  const R = 22;
  const ox = Math.floor(cx);
  const oz = Math.floor(cz);

  const trees: [number, number][] = [];
  const rocks: [number, number][] = [];
  const waters: [number, number][] = [];
  const paths: [number, number][] = [];
  const tallGrasses: [number, number][] = [];
  const flowers: [number, number][] = [];

  for (let tz = oz - R; tz <= oz + R; tz++) {
    for (let tx = ox - R; tx <= ox + R; tx++) {
      switch (getTile(tx, tz)) {
        case 'tree': trees.push([tx, tz]); break;
        case 'rock': rocks.push([tx, tz]); break;
        case 'water': waters.push([tx, tz]); break;
        case 'path': paths.push([tx, tz]); break;
        case 'tall_grass': tallGrasses.push([tx, tz]); break;
        case 'flower': flowers.push([tx, tz]); break;
      }
    }
  }

  const dummy = new THREE.Object3D();

  // Ground base
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2 + 4, R * 2 + 4),
    MAT.grass
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(ox, 0, oz);
  group.add(groundMesh);

  // Paths (plane overlays)
  if (paths.length > 0) {
    const im = new THREE.InstancedMesh(GEO.ground, MAT.path, paths.length);
    paths.forEach(([tx, tz], i) => {
      dummy.position.set(tx + 0.5, 0.01, tz + 0.5);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }

  // Trees — trunk + 3 leaf layers
  if (trees.length > 0) {
    const makeSlab = (geo: THREE.BoxGeometry, mat: THREE.MeshLambertMaterial, yOff: number) => {
      const im = new THREE.InstancedMesh(geo, mat, trees.length);
      trees.forEach(([tx, tz], i) => {
        dummy.position.set(tx + 0.5, yOff, tz + 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      group.add(im);
    };
    makeSlab(GEO.trunkBox, MAT.trunk, 2.0);
    makeSlab(GEO.leaf1, MAT.leaf1, 3.6);
    makeSlab(GEO.leaf2, MAT.leaf2, 4.7);
    makeSlab(GEO.leaf3, MAT.leaf3, 5.6);
  }

  // Rocks
  if (rocks.length > 0) {
    const im1 = new THREE.InstancedMesh(GEO.rock1, MAT.rock, rocks.length);
    const im2 = new THREE.InstancedMesh(GEO.rock2, MAT.rockLight, rocks.length);
    rocks.forEach(([tx, tz], i) => {
      dummy.position.set(tx + 0.5, 0.35, tz + 0.5);
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      im1.setMatrixAt(i, dummy.matrix);
      dummy.position.set(tx + 0.4, 0.85, tz + 0.55);
      dummy.updateMatrix();
      im2.setMatrixAt(i, dummy.matrix);
    });
    im1.instanceMatrix.needsUpdate = true;
    im2.instanceMatrix.needsUpdate = true;
    group.add(im1); group.add(im2);
  }

  // Water
  if (waters.length > 0) {
    const im = new THREE.InstancedMesh(GEO.water, MAT.water, waters.length);
    waters.forEach(([tx, tz], i) => {
      dummy.position.set(tx + 0.5, -0.08, tz + 0.5);
      dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }

  // Tall grass (two perpendicular planes)
  if (tallGrasses.length > 0) {
    for (const rot of [0, Math.PI / 2]) {
      const im = new THREE.InstancedMesh(GEO.tallGrass, MAT.tallGrass, tallGrasses.length);
      tallGrasses.forEach(([tx, tz], i) => {
        dummy.position.set(tx + 0.5, 0.37, tz + 0.5);
        dummy.rotation.set(0, rot, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      group.add(im);
    }
  }

  // Flowers (individual — few of them)
  flowers.forEach(([tx, tz]) => {
    const h = hash(tx, tz);
    for (let i = 0; i < 3; i++) {
      const offset = ((hash(tx * 3 + i, tz * 5 + i) % 60) / 100) - 0.3;
      const f = new THREE.Mesh(GEO.flower, MAT.flowerColors[(h + i) % MAT.flowerColors.length]);
      f.position.set(tx + 0.5 + offset, 0.14, tz + 0.5 - offset * 0.7);
      group.add(f);
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
interface JoyState { active: boolean; bx: number; by: number; dx: number; dy: number }
const neutralJoy: JoyState = { active: false, bx: 0, by: 0, dx: 0, dy: 0 };

export default function FirstPersonView() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useGame();

  // Three.js refs
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const worldGrpRef  = useRef<THREE.Group | null>(null);
  const spriteRef    = useRef<THREE.Sprite | null>(null);
  const frameRef     = useRef(0);

  // Player state refs (used inside animation loop)
  const posRef        = useRef({ x: 0, z: 0 });
  const angleRef      = useRef(0);
  const bobRef        = useRef(0);
  const walkDistRef   = useRef(0);
  const builtAtRef    = useRef({ x: -999, z: -999 });

  // Encounter state refs
  const encounteringRef    = useRef(false);
  const localStepsRef      = useRef(0);
  const nextEncounterRef   = useRef(5);

  // Input refs
  const joyRef        = useRef<JoyState>(neutralJoy);
  const actionRef     = useRef(false);
  const actionTimeRef = useRef(0);

  // UI state (minimal re-renders)
  const [joyUI, setJoyUI]     = useState<JoyState>(neutralJoy);
  const [actionUI, setActionUI] = useState(false);

  const activePokemon = state.party[state.activePokemonIndex];

  // Keep state in ref for animation loop access
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Pokemon sprite texture ───────────────────────────────────────────────
  useEffect(() => {
    if (!activePokemon?.sprite || !spriteRef.current) return;
    new THREE.TextureLoader().load(activePokemon.sprite, tex => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      const mat = spriteRef.current!.material as THREE.SpriteMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
    });
  }, [activePokemon?.sprite]);

  // ── Encounter trigger ────────────────────────────────────────────────────
  const triggerEncounter = useCallback(async () => {
    if (encounteringRef.current) return;
    encounteringRef.current = true;
    try {
      const cur = stateRef.current;
      const active = cur.party[cur.activePokemonIndex];
      const level = Math.max(1, (active?.level ?? 5) + Math.floor(Math.random() * 7) - 3);
      const wild = await buildWildPokemon(level);
      const question = getRandomQuestion(level);
      dispatch({ type: 'START_ENCOUNTER', wild, question });
    } catch {
      encounteringRef.current = false;
    }
  }, [dispatch]);

  // ── Three.js init ────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 18, 42);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(6, 12, 4);
    scene.add(sun);

    // Camera
    const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 50);
    camera.position.set(0, 1.6, 0);
    scene.add(camera);
    cameraRef.current = camera;

    // Held Pokémon sprite (bottom-right corner in camera space)
    const spriteMat = new THREE.SpriteMaterial({ transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.42, 0.42, 1);
    sprite.position.set(0.36, -0.36, -0.65);
    camera.add(sprite);
    spriteRef.current = sprite;

    // Load initial sprite if already available
    if (activePokemon?.sprite) {
      new THREE.TextureLoader().load(activePokemon.sprite, tex => {
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
        spriteMat.map = tex; spriteMat.needsUpdate = true;
      });
    }

    // Clouds
    for (let c = 0; c < 8; c++) {
      const cg = new THREE.Group();
      for (let b = 0; b < 4; b++) {
        const cb = new THREE.Mesh(
          new THREE.BoxGeometry(3 + b * 1.2, 0.8, 1.4 + b * 0.4), MAT.cloud
        );
        cb.position.set(b * 1.4 - 3, b * 0.25, 0);
        cg.add(cb);
      }
      const angle = (c / 8) * Math.PI * 2;
      cg.position.set(Math.cos(angle) * 30, 18 + (c % 3) * 3, Math.sin(angle) * 30);
      scene.add(cg);
    }

    // World group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGrpRef.current = worldGroup;
    buildWorldAround(worldGroup, 0, 0);
    builtAtRef.current = { x: 0, z: 0 };

    // ── Animation loop ──────────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const joy = joyRef.current;

      if (joy.active) {
        // Forward/backward + turn
        const forward = -joy.dy * 0.09;
        const turn    =  joy.dx * 0.035;
        angleRef.current += turn;

        const prevX = posRef.current.x;
        const prevZ = posRef.current.z;
        posRef.current.x += Math.sin(angleRef.current) * forward;
        posRef.current.z += Math.cos(angleRef.current) * forward;

        const dist = Math.sqrt(
          (posRef.current.x - prevX) ** 2 + (posRef.current.z - prevZ) ** 2
        );
        if (dist > 0.005) {
          walkDistRef.current += dist;
          bobRef.current += dist * 9;

          // Step counting
          const newSteps = Math.floor(walkDistRef.current / 1.8);
          if (newSteps > localStepsRef.current) {
            localStepsRef.current = newSteps;
            dispatch({ type: 'WALK' });
            nextEncounterRef.current -= 1;
            if (nextEncounterRef.current <= 0 && !encounteringRef.current) {
              nextEncounterRef.current = Math.floor(Math.random() * 5) + 4;
              triggerEncounter();
            }
          }
        }
      }

      // Camera position + walk bob
      const bobY = joy.active && Math.abs(joy.dy) > 0.08
        ? Math.sin(bobRef.current) * 0.045 : 0;
      camera.position.set(posRef.current.x, 1.6 + bobY, posRef.current.z);
      camera.rotation.set(0, angleRef.current, 0, 'YXZ');

      // Action button: raise sprite
      if (actionRef.current) {
        actionTimeRef.current += 0.12;
        sprite.position.y = -0.36 + Math.abs(Math.sin(actionTimeRef.current)) * 0.28;
        sprite.scale.setScalar(0.42 + Math.abs(Math.sin(actionTimeRef.current)) * 0.1);
      } else {
        actionTimeRef.current = Math.max(0, actionTimeRef.current - 0.15);
        sprite.position.y = -0.36 + Math.abs(Math.sin(actionTimeRef.current)) * 0.1;
        sprite.scale.setScalar(0.42);
      }

      // Rebuild world if player moved far enough
      const builtAt = builtAtRef.current;
      if (Math.abs(posRef.current.x - builtAt.x) > 9 ||
          Math.abs(posRef.current.z - builtAt.z) > 9) {
        buildWorldAround(worldGroup, posRef.current.x, posRef.current.z);
        builtAtRef.current = { x: posRef.current.x, z: posRef.current.z };
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nW = mount.clientWidth, nH = mount.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      disposeGroup(worldGroup);
      scene.clear();
    };
  }, []); // run once

  // ── Touch controls (passive:false required for preventDefault) ────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.52) {
          const j: JoyState = { active: true, bx: t.clientX, by: t.clientY, dx: 0, dy: 0 };
          joyRef.current = j;
          setJoyUI(j);
        } else {
          actionRef.current = true;
          setActionUI(true);
        }
      }
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.52 && joyRef.current.active) {
          const rdx = (t.clientX - joyRef.current.bx) / 55;
          const rdy = (t.clientY - joyRef.current.by) / 55;
          const len = Math.sqrt(rdx * rdx + rdy * rdy);
          const s = Math.min(1, len) / Math.max(0.001, len);
          const nx = rdx * s, ny = rdy * s;
          joyRef.current = { ...joyRef.current, dx: nx, dy: ny };
          setJoyUI(j => j ? { ...j, dx: nx, dy: ny } : j);
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < window.innerWidth * 0.52) {
          joyRef.current = neutralJoy;
          setJoyUI(neutralJoy);
        } else {
          actionRef.current = false;
          setActionUI(false);
        }
      }
    };

    const opts = { passive: false } as AddEventListenerOptions;
    el.addEventListener('touchstart', onStart, opts);
    el.addEventListener('touchmove', onMove, opts);
    el.addEventListener('touchend', onEnd, opts);
    el.addEventListener('touchcancel', onEnd, opts);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div ref={mountRef} className="relative w-full h-full bg-sky-400 overflow-hidden select-none">
      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-6 h-6">
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/70 -translate-x-1/2" />
          <div className="absolute top-1/2 left-0 h-0.5 w-full bg-white/70 -translate-y-1/2" />
        </div>
      </div>

      {/* Left joystick indicator */}
      {joyUI.active && (
        <div
          className="absolute pointer-events-none"
          style={{ left: joyUI.bx - 48, top: joyUI.by - 48 }}
        >
          <div className="w-24 h-24 rounded-full border-2 border-white/30 bg-white/10" />
          <div
            className="absolute w-11 h-11 rounded-full bg-white/40 border-2 border-white/70 shadow-lg"
            style={{
              left: 48 + joyUI.dx * 28 - 22,
              top:  48 + joyUI.dy * 28 - 22,
            }}
          />
        </div>
      )}

      {/* Right action button (always visible) */}
      <div
        className={`absolute right-8 bottom-12 w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-75 pointer-events-none ${
          actionUI
            ? 'bg-red-500/80 border-red-200 scale-90 shadow-red-400/50 shadow-lg'
            : 'bg-red-500/35 border-red-300/60'
        }`}
      >
        <span className="text-white text-2xl drop-shadow">⚡</span>
      </div>
      <div className="absolute right-10 bottom-2 text-white/50 text-xs pointer-events-none">ACTION</div>

      {/* Left zone hint (shown briefly) */}
      <div className="absolute left-8 bottom-12 w-16 h-16 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center pointer-events-none">
        <span className="text-white/40 text-lg">🕹️</span>
      </div>
      <div className="absolute left-10 bottom-2 text-white/50 text-xs pointer-events-none">MOVE</div>

      {/* Party HUD - top left */}
      {activePokemon && (
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 pointer-events-none border border-white/10">
          <div className="text-white font-pixel text-xs capitalize">{activePokemon.name}</div>
          <div className="text-gray-300 text-xs mt-0.5">Lv.{activePokemon.level}</div>
          <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(activePokemon.hp / activePokemon.maxHp) * 100}%` }}
            />
          </div>
          <div className="text-gray-400 text-xs mt-0.5">{activePokemon.hp}/{activePokemon.maxHp} HP</div>
        </div>
      )}

      {/* Step counter - top right */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 pointer-events-none text-right border border-white/10">
        <div className="text-yellow-400 font-pixel text-xs">{state.playerName}</div>
        <div className="text-gray-300 text-xs mt-0.5">👣 {state.stepCount}</div>
      </div>

      {/* Level up notification */}
      {state.lastLevelUp && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-yellow-900/80 border border-yellow-400 rounded-xl px-6 py-3 text-center pointer-events-none animate-bounce">
          <div className="font-pixel text-yellow-300 text-xs">
            {state.lastLevelUp.pokemonName
              ? `${state.lastLevelUp.pokemonName.toUpperCase()} Lv.${state.lastLevelUp.pokemonLevel}!`
              : `TRAINER Lv.${state.lastLevelUp.playerLevel}!`}
          </div>
        </div>
      )}
    </div>
  );
}
