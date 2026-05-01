import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { GameState, GameAction, OwnedPokemon, BattleState } from '../types';

const SAVE_KEY = 'pokewalk_save';

const initialState: GameState = {
  screen: 'starter',
  playerName: '',
  playerLevel: 1,
  playerXp: 0,
  playerXpToNext: 100,
  party: [],
  activePokemonIndex: 0,
  wildEncounter: null,
  encounterQuestion: null,
  battle: null,
  stepCount: 0,
  stepsTillEncounter: 5,
  position: [35.6812, 139.7671],
  lastLevelUp: null,
};

function calcDamage(atk: number, def: number, correct: boolean): number {
  const base = Math.max(1, Math.floor((atk / def) * 15));
  const variance = Math.floor(Math.random() * 5);
  return correct ? base + variance : Math.max(1, Math.floor((base + variance) * 0.15));
}

function levelUpPokemon(pokemon: OwnedPokemon): OwnedPokemon {
  const newLevel = pokemon.level + 1;
  const newMaxHp = Math.floor(((2 * pokemon.baseHp + 31) * newLevel) / 100) + newLevel + 10;
  const newAtk = Math.floor(((2 * pokemon.baseAtk + 31) * newLevel) / 100) + 5;
  const newDef = Math.floor(((2 * pokemon.baseDef + 31) * newLevel) / 100) + 5;
  return {
    ...pokemon,
    level: newLevel,
    maxHp: newMaxHp,
    hp: newMaxHp,
    attack: newAtk,
    defense: newDef,
    xp: 0,
    xpToNext: newLevel * 100,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_SAVE':
      return action.state;

    case 'SELECT_STARTER': {
      return {
        ...state,
        playerName: action.name,
        party: [action.pokemon],
        screen: 'map',
      };
    }

    case 'UPDATE_POSITION':
      return { ...state, position: action.position };

    case 'WALK': {
      const next = state.stepsTillEncounter - 1;
      if (next <= 0) {
        return {
          ...state,
          stepCount: state.stepCount + 1,
          stepsTillEncounter: Math.floor(Math.random() * 5) + 4,
        };
      }
      return { ...state, stepCount: state.stepCount + 1, stepsTillEncounter: next };
    }

    case 'START_ENCOUNTER':
      return {
        ...state,
        wildEncounter: action.wild,
        encounterQuestion: action.question,
        screen: 'encounter',
      };

    case 'ENCOUNTER_ANSWER': {
      if (action.correct) {
        const activePokemon = state.party[state.activePokemonIndex];
        const wild = state.wildEncounter!;
        const battleState: BattleState = {
          wild,
          playerPokemonIndex: state.activePokemonIndex,
          playerHp: activePokemon.hp,
          wildHp: wild.maxHp,
          currentQuestion: action.nextQuestion,
          answerResult: null,
          phase: 'quiz',
          result: null,
          log: [`野生の ${wild.name.toUpperCase()} が現れた！`, '問題に答えて攻撃しよう！'],
          canCatch: false,
          turnCount: 0,
        };
        return { ...state, screen: 'battle', battle: battleState, encounterQuestion: null };
      }
      return { ...state, encounterQuestion: action.nextQuestion };
    }

    case 'PLAYER_ATTACK': {
      if (!state.battle) return state;
      const b = state.battle;
      const pokemon = state.party[b.playerPokemonIndex];
      const damage = calcDamage(pokemon.attack, b.wild.defense, action.correct);
      const newWildHp = Math.max(0, b.wildHp - damage);
      const hitMsg = action.correct
        ? `正解！ ${pokemon.name.toUpperCase()} は ${damage} のダメージを与えた！`
        : `不正解… ${pokemon.name.toUpperCase()} の攻撃は ${damage} ダメージしか入らなかった。`;

      if (newWildHp <= 0) {
        // Win: award XP
        const xpGain = b.wild.level * 30;
        let updatedParty = [...state.party];
        let p = { ...updatedParty[b.playerPokemonIndex] };
        p.hp = b.playerHp; // persist battle damage
        p.xp += xpGain;
        let playerLevel = state.playerLevel;
        let playerXp = state.playerXp + Math.floor(xpGain / 2);
        let playerXpToNext = state.playerXpToNext;
        let lastLevelUp: GameState['lastLevelUp'] = null;

        if (p.xp >= p.xpToNext) {
          p = levelUpPokemon(p);
          lastLevelUp = { pokemonName: p.name, pokemonLevel: p.level };
        }
        if (playerXp >= playerXpToNext) {
          playerLevel += 1;
          playerXp = playerXp - playerXpToNext;
          playerXpToNext = playerLevel * 100;
          lastLevelUp = { ...lastLevelUp, playerLevel };
        }

        updatedParty[b.playerPokemonIndex] = p;
        return {
          ...state,
          party: updatedParty,
          playerLevel,
          playerXp,
          playerXpToNext,
          lastLevelUp,
          battle: {
            ...b,
            wildHp: 0,
            phase: 'over',
            result: 'win',
            canCatch: true,
            answerResult: action.correct ? 'correct' : 'wrong',
            log: [...b.log, hitMsg, `野生の ${b.wild.name.toUpperCase()} は倒れた！勝利！ +${xpGain} XP`],
            currentQuestion: action.nextQuestion,
          },
        };
      }

      // Wild's turn after player attack
      const wildDamage = calcDamage(b.wild.attack, pokemon.defense, true);
      const newPlayerHp = Math.max(0, b.playerHp - wildDamage);
      const wildMsg = `野生の ${b.wild.name.toUpperCase()} の攻撃！ ${wildDamage} ダメージ！`;

      if (newPlayerHp <= 0) {
        // Faint: set HP to 1 (not 0) so player isn't stuck
        const faintedParty = [...state.party];
        faintedParty[b.playerPokemonIndex] = { ...faintedParty[b.playerPokemonIndex], hp: 1 };
        return {
          ...state,
          party: faintedParty,
          battle: {
            ...b,
            playerHp: 0,
            wildHp: newWildHp,
            phase: 'over',
            result: 'lose',
            answerResult: action.correct ? 'correct' : 'wrong',
            log: [...b.log, hitMsg, wildMsg, `${pokemon.name.toUpperCase()} は倒れた！負けた…`],
            currentQuestion: action.nextQuestion,
          },
        };
      }

      return {
        ...state,
        battle: {
          ...b,
          playerHp: newPlayerHp,
          wildHp: newWildHp,
          answerResult: action.correct ? 'correct' : 'wrong',
          phase: 'quiz',
          turnCount: b.turnCount + 1,
          log: [...b.log, hitMsg, wildMsg],
          currentQuestion: action.nextQuestion,
          canCatch: newWildHp < b.wild.maxHp * 0.3,
        },
      };
    }

    case 'CATCH_POKEMON': {
      if (!state.battle || state.battle.result !== 'win') return state;
      const wild = state.battle.wild;
      if (state.party.length >= 6) return state;
      const newPokemon: OwnedPokemon = {
        ...wild,
        xp: 0,
        xpToNext: wild.level * 100,
        baseHp: Math.floor((wild.maxHp - wild.level - 10) * 100 / (2 * wild.level)),
        baseAtk: Math.floor((wild.attack - 5) * 100 / (2 * wild.level)),
        baseDef: Math.floor((wild.defense - 5) * 100 / (2 * wild.level)),
      };
      return {
        ...state,
        party: [...state.party, newPokemon],
        battle: null,
        wildEncounter: null,
        screen: 'map',
      };
    }

    case 'FLEE':
      return {
        ...state,
        screen: 'map',
        battle: null,
        wildEncounter: null,
        encounterQuestion: null,
      };

    case 'OPEN_PARTY':
      return { ...state, screen: 'party' };

    case 'CLOSE_PARTY':
      return { ...state, screen: 'map' };

    case 'SET_ACTIVE_POKEMON':
      return { ...state, activePokemonIndex: action.index };

    case 'CLEAR_LEVEL_UP':
      return { ...state, lastLevelUp: null };

    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        return { ...init, ...s, screen: 'map', battle: null, wildEncounter: null, encounterQuestion: null, lastLevelUp: null };
      }
    } catch {}
    return init;
  });

  useEffect(() => {
    if (state.screen !== 'starter') {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }
  }, [state]);

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
