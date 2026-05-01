import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { getRandomQuestion } from '../data/questions';
import { TYPE_COLORS } from '../services/pokeapi';

export default function EncounterScreen() {
  const { state, dispatch } = useGame();
  const wild = state.wildEncounter!;
  const question = state.encounterQuestion!;
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined) handleAnswer(idx);
      if (e.key === 'Escape') dispatch({ type: 'FLEE' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleAnswer = (index: number) => {
    if (revealed) return;
    setSelected(index);
    setRevealed(true);

    const correct = index === question.correctIndex;
    const nextQuestion = getRandomQuestion(wild.level, [question.id]);

    setTimeout(() => {
      dispatch({ type: 'ENCOUNTER_ANSWER', correct, nextQuestion });
      if (!correct) {
        setSelected(null);
        setRevealed(false);
      }
    }, 1800);
  };

  const choiceLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Wild Pokémon display */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center pt-8 pb-6 px-6">
        <img
          src={wild.sprite}
          alt={wild.name}
          className="w-32 h-32 object-contain animate-bounce2"
          style={{ imageRendering: 'pixelated' }}
        />
        <h2 className="font-pixel text-xl capitalize mt-2 text-white">{wild.name}</h2>
        <div className="flex gap-2 mt-2">
          {wild.types.map((t) => (
            <span key={t} className={`${TYPE_COLORS[t] ?? 'bg-gray-600'} text-white text-xs px-2 py-0.5 rounded-full capitalize font-semibold`}>
              {t}
            </span>
          ))}
          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full font-semibold">
            Lv.{wild.level}
          </span>
        </div>
      </div>

      {/* Message box */}
      <div className="mx-4 -mt-2 bg-gray-800 border-2 border-gray-600 rounded-xl p-4 mb-4">
        <p className="text-xs text-yellow-400 mb-1 font-pixel">野生の {wild.name.toUpperCase()} が話しかけてきた！</p>
        <p className="text-xs text-gray-500 mb-2">Wild {wild.name.toUpperCase()} speaks to you!</p>
        <p className="text-sm text-gray-200 italic">"{question.context}"</p>
        {question.contextJa && (
          <p className="text-xs text-gray-400 mt-1">【{question.contextJa}】</p>
        )}
      </div>

      {/* Quiz */}
      <div className="flex-1 px-4 overflow-y-auto">
        <p className="font-pixel text-xs text-yellow-400 mb-1">{question.question}</p>

        <div className="flex flex-col gap-2">
          {question.choices.map((choice, i) => {
            let btnClass = 'bg-gray-700 border-gray-600 text-white';
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
                className={`w-full text-left border-2 rounded-xl px-4 py-3 transition-all active:scale-95 ${btnClass}`}
              >
                <span className="font-pixel text-xs mr-2 text-gray-400">{choiceLabels[i]}.</span>
                <span className="text-sm">{choice}</span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className={`mt-4 rounded-xl p-3 border ${selected === question.correctIndex ? 'bg-green-900/40 border-green-600' : 'bg-red-900/40 border-red-600'}`}>
            <p className="font-pixel text-xs mb-1">
              {selected === question.correctIndex ? '✓ 正解！ CORRECT!' : '✗ 不正解！ WRONG!'}
            </p>
            <p className="text-xs text-gray-300 mb-1">{question.explanation}</p>
            {question.explanationJa && (
              <p className="text-xs text-gray-400">📘 {question.explanationJa}</p>
            )}
            {selected !== question.correctIndex && (
              <p className="text-xs text-yellow-600 mt-1">もう一度挑戦しよう！ Try again...</p>
            )}
          </div>
        )}
      </div>

      {/* Flee */}
      <div className="px-4 py-4 border-t border-gray-700">
        <button
          onClick={() => dispatch({ type: 'FLEE' })}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-pixel text-xs transition-all active:scale-95"
        >
          にげる / RUN AWAY
        </button>
      </div>
    </div>
  );
}
