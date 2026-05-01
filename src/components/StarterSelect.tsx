import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { STARTERS, buildOwnedPokemon } from '../services/pokeapi';

export default function StarterSelect() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<Record<number, string>>({});

  const handleSelect = async (id: number) => {
    setSelected(id);
    if (!previews[id]) {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await res.json();
      setPreviews((p) => ({ ...p, [id]: data.sprites.front_default }));
    }
  };

  const handleStart = async () => {
    if (!name.trim() || selected === null) return;
    setLoading(true);
    try {
      const pokemon = await buildOwnedPokemon(selected, 5);
      dispatch({ type: 'SELECT_STARTER', pokemon, name: name.trim() });
    } finally {
      setLoading(false);
    }
  };

  const starterNames = ['Bulbasaur', 'Charmander', 'Squirtle'];
  const starterColors = ['bg-green-700', 'bg-red-700', 'bg-blue-700'];
  const starterEmojis = ['🌿', '🔥', '💧'];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-gray-900 to-gray-800 p-6 text-white">
      <h1 className="font-pixel text-red-500 text-xl mb-1 text-center leading-loose">PokéWalk</h1>
      <h2 className="font-pixel text-yellow-400 text-xs mb-8 text-center">English Adventure</h2>

      <div className="w-full mb-6">
        <label className="block text-xs text-gray-400 mb-2 font-pixel">YOUR NAME</label>
        <input
          className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-yellow-400 transition-colors"
          placeholder="Enter your name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
        />
      </div>

      <p className="font-pixel text-xs text-gray-400 mb-4">CHOOSE YOUR PARTNER</p>

      <div className="flex gap-3 w-full mb-8">
        {STARTERS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={`flex-1 rounded-xl border-2 p-3 transition-all flex flex-col items-center gap-2 ${
              selected === s.id
                ? `${starterColors[i]} border-yellow-400 scale-105 shadow-lg shadow-yellow-400/20`
                : 'bg-gray-700 border-gray-600 hover:border-gray-400'
            }`}
          >
            {previews[s.id] ? (
              <img src={previews[s.id]} alt={s.name} className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center text-3xl">{starterEmojis[i]}</div>
            )}
            <span className="font-pixel text-xs capitalize">{starterNames[i]}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleStart}
        disabled={!name.trim() || selected === null || loading}
        className={`w-full py-4 rounded-xl font-pixel text-sm transition-all ${
          !name.trim() || selected === null || loading
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-95'
        }`}
      >
        {loading ? 'LOADING...' : "LET'S GO!"}
      </button>

      <p className="text-gray-500 text-xs mt-6 text-center leading-relaxed">
        Walk around to encounter wild Pokémon.<br />
        Answer English questions to battle!
      </p>
    </div>
  );
}
