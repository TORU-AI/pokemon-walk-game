import type { OwnedPokemon, WildPokemon } from '../types';

const BASE = 'https://pokeapi.co/api/v2';

interface RawPokemon {
  id: number;
  name: string;
  sprites: { front_default: string };
  stats: { base_stat: number; stat: { name: string } }[];
  types: { type: { name: string } }[];
}

function calcMaxHp(base: number, level: number): number {
  return Math.floor(((2 * base + 31) * level) / 100) + level + 10;
}

function calcStat(base: number, level: number): number {
  return Math.floor(((2 * base + 31) * level) / 100) + 5;
}

function getBase(raw: RawPokemon, statName: string): number {
  return raw.stats.find((s) => s.stat.name === statName)?.base_stat ?? 45;
}

export async function fetchRawPokemon(idOrName: number | string): Promise<RawPokemon> {
  const res = await fetch(`${BASE}/pokemon/${idOrName}`);
  if (!res.ok) throw new Error(`Failed to fetch ${idOrName}`);
  return res.json();
}

export async function buildOwnedPokemon(idOrName: number | string, level: number): Promise<OwnedPokemon> {
  const raw = await fetchRawPokemon(idOrName);
  const baseHp = getBase(raw, 'hp');
  const baseAtk = getBase(raw, 'attack');
  const baseDef = getBase(raw, 'defense');
  const maxHp = calcMaxHp(baseHp, level);
  return {
    id: raw.id,
    name: raw.name,
    sprite: raw.sprites.front_default,
    types: raw.types.map((t) => t.type.name),
    level,
    xp: 0,
    xpToNext: level * 100,
    hp: maxHp,
    maxHp,
    attack: calcStat(baseAtk, level),
    defense: calcStat(baseDef, level),
    baseHp,
    baseAtk,
    baseDef,
  };
}

export async function buildWildPokemon(level: number): Promise<WildPokemon> {
  const id = Math.floor(Math.random() * 151) + 1;
  const raw = await fetchRawPokemon(id);
  const baseHp = getBase(raw, 'hp');
  const baseAtk = getBase(raw, 'attack');
  const baseDef = getBase(raw, 'defense');
  const maxHp = calcMaxHp(baseHp, level);
  return {
    id: raw.id,
    name: raw.name,
    sprite: raw.sprites.front_default,
    types: raw.types.map((t) => t.type.name),
    level,
    hp: maxHp,
    maxHp,
    attack: calcStat(baseAtk, level),
    defense: calcStat(baseDef, level),
  };
}

export const STARTERS = [
  { id: 1, name: 'bulbasaur' },
  { id: 4, name: 'charmander' },
  { id: 7, name: 'squirtle' },
] as const;

export const TYPE_COLORS: Record<string, string> = {
  fire: 'bg-orange-500',
  water: 'bg-blue-500',
  grass: 'bg-green-500',
  electric: 'bg-yellow-400',
  psychic: 'bg-pink-500',
  ice: 'bg-cyan-400',
  dragon: 'bg-indigo-600',
  dark: 'bg-gray-800',
  fairy: 'bg-pink-300',
  normal: 'bg-gray-400',
  fighting: 'bg-red-700',
  flying: 'bg-sky-400',
  poison: 'bg-purple-500',
  ground: 'bg-yellow-700',
  rock: 'bg-yellow-800',
  bug: 'bg-lime-500',
  ghost: 'bg-purple-700',
  steel: 'bg-slate-500',
};
