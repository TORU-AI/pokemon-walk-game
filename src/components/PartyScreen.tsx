import { useGame } from '../context/GameContext';
import { TYPE_COLORS } from '../services/pokeapi';

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PartyScreen() {
  const { state, dispatch } = useGame();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <h2 className="font-pixel text-sm text-yellow-400">MY PARTY</h2>
        <button
          onClick={() => dispatch({ type: 'CLOSE_PARTY' })}
          className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg font-pixel text-xs transition-all"
        >
          CLOSE
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {state.party.length === 0 && (
          <p className="text-gray-500 text-center font-pixel text-xs mt-12">No Pokémon yet!</p>
        )}
        {state.party.map((pokemon, i) => (
          <button
            key={`${pokemon.id}-${i}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_POKEMON', index: i })}
            className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
              i === state.activePokemonIndex
                ? 'bg-gray-700 border-yellow-400 shadow-lg shadow-yellow-400/10'
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={pokemon.sprite}
                alt={pokemon.name}
                className="w-16 h-16 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-pixel text-sm capitalize">{pokemon.name}</span>
                  {i === state.activePokemonIndex && (
                    <span className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                  )}
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {pokemon.types.map((t) => (
                    <span key={t} className={`${TYPE_COLORS[t] ?? 'bg-gray-600'} text-white text-xs px-2 py-0.5 rounded-full capitalize`}>{t}</span>
                  ))}
                  <span className="bg-gray-600 text-white text-xs px-2 py-0.5 rounded-full">Lv.{pokemon.level}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>HP</span>
                    <span>{pokemon.hp}/{pokemon.maxHp}</span>
                  </div>
                  <HpBar current={pokemon.hp} max={pokemon.maxHp} />
                </div>
                <div className="mt-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>XP</span>
                    <span>{pokemon.xp}/{pokemon.xpToNext}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (pokemon.xp / pokemon.xpToNext) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>ATK: {pokemon.attack}</span>
                  <span>DEF: {pokemon.defense}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-700 text-center">
        <p className="text-gray-500 text-xs font-pixel">{state.party.length}/6 Pokémon</p>
      </div>
    </div>
  );
}
