import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { getRandomQuestion } from '../data/questions';
import { TYPE_COLORS } from '../services/pokeapi';

function HpBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 font-pixel text-xs">{label}</span>
        <span className="text-gray-400">{current}/{max}</span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BattleScreen() {
  const { state, dispatch } = useGame();
  const battle = state.battle!;
  const question = battle.currentQuestion!;
  const playerPokemon = state.party[battle.playerPokemonIndex];
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // キーボード 1-4 / A-D で回答
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (battle.phase === 'over') {
        if (e.key === 'Enter' || e.key === ' ') dispatch({ type: 'FLEE' });
        return;
      }
      const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined) handleAnswer(idx);
      if (e.key === 'Escape') dispatch({ type: 'FLEE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleAnswer = (index: number) => {
    if (revealed || battle.phase === 'over') return;
    setSelected(index);
    setRevealed(true);
    const correct = index === question.correctIndex;
    const nextQuestion = getRandomQuestion(battle.wild.level, [question.id]);

    setTimeout(() => {
      dispatch({ type: 'PLAYER_ATTACK', correct, nextQuestion });
      setSelected(null);
      setRevealed(false);
    }, 1800);
  };

  const choiceLabels = ['A', 'B', 'C', 'D'];
  const isOver = battle.phase === 'over';

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      {/* Battle arena */}
      <div className="relative bg-gradient-to-b from-sky-900 to-gray-900 px-4 pt-4 pb-2">
        {/* Wild Pokémon */}
        <div className="flex justify-between items-start">
          <div className="w-40">
            <div className="font-pixel text-xs capitalize mb-1">{battle.wild.name}</div>
            <div className="flex gap-1 mb-2">
              {battle.wild.types.map((t) => (
                <span key={t} className={`${TYPE_COLORS[t] ?? 'bg-gray-600'} text-white text-xs px-1.5 py-0.5 rounded capitalize`}>{t}</span>
              ))}
              <span className="bg-gray-700 text-xs text-gray-300 px-1.5 py-0.5 rounded">Lv.{battle.wild.level}</span>
            </div>
            <HpBar current={battle.wildHp} max={battle.wild.maxHp} label="HP" />
          </div>
          <img
            src={battle.wild.sprite}
            alt={battle.wild.name}
            className={`w-24 h-24 object-contain ${isOver && battle.result === 'win' ? 'opacity-30' : 'animate-bounce2'}`}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Player Pokémon */}
        <div className="flex justify-between items-end mt-2">
          <img
            src={playerPokemon.sprite}
            alt={playerPokemon.name}
            className={`w-20 h-20 object-contain ${isOver && battle.result === 'lose' ? 'opacity-30 rotate-90' : ''}`}
            style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)' }}
          />
          <div className="w-44 text-right">
            <div className="font-pixel text-xs capitalize mb-1">{playerPokemon.name}</div>
            <div className="flex gap-1 justify-end mb-2">
              <span className="bg-gray-700 text-xs text-gray-300 px-1.5 py-0.5 rounded">Lv.{playerPokemon.level}</span>
            </div>
            <HpBar current={battle.playerHp} max={playerPokemon.maxHp} label="HP" />
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div className="mx-4 mt-3 bg-gray-800 border border-gray-700 rounded-xl p-3 h-14 overflow-hidden">
        {battle.log.slice(-2).map((msg, i) => (
          <p key={i} className={`text-xs ${i === battle.log.slice(-2).length - 1 ? 'text-white' : 'text-gray-500'}`}>{msg}</p>
        ))}
      </div>

      {/* Over screen */}
      {isOver ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <div className={`text-center p-6 rounded-2xl border-2 w-full ${battle.result === 'win' ? 'bg-green-900/40 border-green-500' : 'bg-red-900/40 border-red-500'}`}>
            <div className="font-pixel text-2xl mb-2">{battle.result === 'win' ? '🏆' : '💔'}</div>
            <div className={`font-pixel text-sm mb-1 ${battle.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
              {battle.result === 'win' ? 'VICTORY!' : 'DEFEAT...'}
            </div>
            {battle.result === 'win' && (
              <p className="text-xs text-gray-300">+{battle.wild.level * 30} XP gained!</p>
            )}
          </div>

          {battle.result === 'win' && battle.canCatch && state.party.length < 6 && (
            <button
              onClick={() => dispatch({ type: 'CATCH_POKEMON' })}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-pixel text-xs transition-all active:scale-95"
            >
              CATCH {battle.wild.name.toUpperCase()}!
            </button>
          )}

          <button
            onClick={() => dispatch({ type: 'FLEE' })}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-pixel text-xs transition-all active:scale-95"
          >
            {battle.result === 'win' ? 'BACK TO MAP' : 'RUN AWAY'}
          </button>
        </div>
      ) : (
        /* Quiz panel */
        <div className="flex-1 px-4 pt-3 overflow-y-auto">
          <div className="bg-gray-800/60 rounded-xl p-3 mb-3 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1 font-pixel">QUESTION</p>
            <p className="text-xs text-gray-300 mb-1 italic">{question.context}</p>
            <p className="text-sm text-white font-semibold">{question.question}</p>
          </div>

          <div className="flex flex-col gap-2">
            {question.choices.map((choice, i) => {
              let btnClass = 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600';
              if (revealed) {
                if (i === question.correctIndex) btnClass = 'bg-green-700 border-green-500 text-white';
                else if (i === selected && i !== question.correctIndex) btnClass = 'bg-red-800 border-red-600 text-white';
                else btnClass = 'bg-gray-800 border-gray-700 text-gray-500';
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={revealed}
                  className={`w-full text-left border-2 rounded-xl px-3 py-2.5 transition-all active:scale-95 ${btnClass}`}
                >
                  <span className="font-pixel text-xs mr-2 text-gray-400">{choiceLabels[i]}.</span>
                  <span className="text-sm">{choice}</span>
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className={`mt-3 rounded-xl p-3 border ${selected === question.correctIndex ? 'bg-green-900/40 border-green-600' : 'bg-red-900/40 border-red-600'}`}>
              <p className="font-pixel text-xs mb-1">{selected === question.correctIndex ? '✓ CORRECT! FULL POWER!' : '✗ WRONG! WEAK HIT!'}</p>
              <p className="text-xs text-gray-300">{question.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Flee button */}
      {!isOver && (
        <div className="px-4 py-3 border-t border-gray-700">
          <button
            onClick={() => dispatch({ type: 'FLEE' })}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-pixel text-xs transition-all active:scale-95"
          >
            FLEE
          </button>
        </div>
      )}
    </div>
  );
}
