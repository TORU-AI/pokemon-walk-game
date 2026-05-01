import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { buildWildPokemon } from '../services/pokeapi';
import { getRandomQuestion } from '../data/questions';
import type { WildPokemon } from '../types';
import GameMap from './GameMap';

function HpBar({ current, max, className = '' }: { current: number; max: number; className?: string }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className={`h-2 bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MapView() {
  const { state, dispatch } = useGame();
  const [encountering, setEncountering] = useState(false);
  const [wildPreview, setWildPreview] = useState<WildPokemon | null>(null);
  const activePokemon = state.party[state.activePokemonIndex];

  const handleWalk = useCallback(async () => {
    if (encountering) return;
    dispatch({ type: 'WALK' });

    const nextSteps = state.stepsTillEncounter - 1;
    if (nextSteps <= 0) {
      setEncountering(true);
      try {
        const wildLevel = Math.max(1, activePokemon.level + Math.floor(Math.random() * 7) - 3);
        const wild = await buildWildPokemon(wildLevel);
        setWildPreview(wild);
        const question = getRandomQuestion(wildLevel);
        setTimeout(() => {
          dispatch({ type: 'START_ENCOUNTER', wild, question });
          setEncountering(false);
          setWildPreview(null);
        }, 1500);
      } catch {
        setEncountering(false);
      }
    }
  }, [encountering, state.stepsTillEncounter, activePokemon, dispatch]);

  // PC キーボードサポート
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleWalk(); }
      if (e.key === 'p' || e.key === 'P') dispatch({ type: 'OPEN_PARTY' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleWalk, dispatch]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/95 backdrop-blur border-b border-gray-700 z-10">
        <div>
          <div className="font-pixel text-yellow-400 text-xs">{state.playerName}</div>
          <div className="text-gray-400 text-xs mt-0.5">Lv.{state.playerLevel} Trainer</div>
          <div className="w-24 mt-1">
            <div className="text-xs text-gray-500 mb-0.5">XP {state.playerXp}/{state.playerXpToNext}</div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(100, (state.playerXp / state.playerXpToNext) * 100)}%` }}
              />
            </div>
          </div>
        </div>
        {activePokemon && (
          <div className="bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <img
              src={activePokemon.sprite}
              alt={activePokemon.name}
              className="w-10 h-10 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            <div>
              <div className="font-pixel text-xs capitalize">{activePokemon.name}</div>
              <div className="text-gray-400 text-xs">Lv.{activePokemon.level}</div>
              <HpBar current={activePokemon.hp} max={activePokemon.maxHp} className="w-20 mt-1" />
              <div className="text-xs text-gray-500">{activePokemon.hp}/{activePokemon.maxHp}</div>
            </div>
          </div>
        )}
      </div>

      {/* Game Map */}
      <div className="flex-1 relative overflow-hidden">
        <GameMap
          playerSprite={activePokemon?.sprite ?? ''}
          stepCount={state.stepCount}
          encountering={encountering}
        />

        {/* Steps overlay */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-gray-900/80 backdrop-blur rounded-full px-4 py-1.5 border border-gray-700">
          <span className="font-pixel text-xs text-gray-300">
            👣 {state.stepCount} steps &nbsp;|&nbsp; next: {state.stepsTillEncounter}
          </span>
        </div>

        {/* Wild encounter flash */}
        {encountering && wildPreview && (
          <div className="absolute inset-0 z-20 bg-black/75 flex flex-col items-center justify-center">
            <div className="text-yellow-400 font-pixel text-sm mb-4 animate-bounce">Wild Pokémon!</div>
            <img
              src={wildPreview.sprite}
              alt={wildPreview.name}
              className="w-32 h-32 object-contain animate-bounce"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="font-pixel text-white text-xs mt-4 capitalize">{wildPreview.name}</div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-gray-900/95 backdrop-blur border-t border-gray-700 px-4 py-4">
        <div className="flex gap-3">
          <button
            onClick={handleWalk}
            disabled={encountering}
            className={`flex-1 py-4 rounded-xl font-pixel text-sm transition-all ${
              encountering
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-95'
            }`}
          >
            {encountering ? 'SEARCHING...' : '👣 WALK'}
          </button>
          <button
            onClick={() => dispatch({ type: 'OPEN_PARTY' })}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-4 rounded-xl font-pixel text-xs transition-all active:scale-95"
          >
            PARTY
          </button>
        </div>

        {state.lastLevelUp && (
          <div className="mt-3 bg-yellow-900/50 border border-yellow-500 rounded-xl p-3 text-center animate-pulse">
            <div className="font-pixel text-yellow-400 text-xs">
              {state.lastLevelUp.playerLevel && `★ TRAINER Lv.${state.lastLevelUp.playerLevel}! `}
              {state.lastLevelUp.pokemonName && `${state.lastLevelUp.pokemonName.toUpperCase()} Lv.${state.lastLevelUp.pokemonLevel}!`}
            </div>
            <button
              onClick={() => dispatch({ type: 'CLEAR_LEVEL_UP' })}
              className="text-gray-400 text-xs mt-1 underline"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
