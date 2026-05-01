export interface OwnedPokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
}

export interface WildPokemon {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface Question {
  id: string;
  context: string;
  contextJa?: string;
  question: string;
  choices: [string, string, string, string];
  choicesJa?: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  explanationJa?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface BattleState {
  wild: WildPokemon;
  playerPokemonIndex: number;
  playerHp: number;
  wildHp: number;
  currentQuestion: Question | null;
  answerResult: 'correct' | 'wrong' | null;
  phase: 'quiz' | 'resolving' | 'wild_turn' | 'over';
  result: 'win' | 'lose' | 'flee' | null;
  log: string[];
  canCatch: boolean;
  turnCount: number;
}

export type GameScreen = 'starter' | 'map' | 'encounter' | 'battle' | 'party';

export interface GameState {
  screen: GameScreen;
  playerName: string;
  playerLevel: number;
  playerXp: number;
  playerXpToNext: number;
  party: OwnedPokemon[];
  activePokemonIndex: number;
  wildEncounter: WildPokemon | null;
  encounterQuestion: Question | null;
  battle: BattleState | null;
  stepCount: number;
  stepsTillEncounter: number;
  position: [number, number];
  lastLevelUp: { playerLevel?: number; pokemonName?: string; pokemonLevel?: number } | null;
}

export type GameAction =
  | { type: 'SELECT_STARTER'; pokemon: OwnedPokemon; name: string }
  | { type: 'WALK' }
  | { type: 'UPDATE_POSITION'; position: [number, number] }
  | { type: 'START_ENCOUNTER'; wild: WildPokemon; question: Question }
  | { type: 'ENCOUNTER_ANSWER'; correct: boolean; nextQuestion: Question }
  | { type: 'START_BATTLE' }
  | { type: 'SET_BATTLE_QUESTION'; question: Question }
  | { type: 'PLAYER_ATTACK'; correct: boolean; nextQuestion: Question | null }
  | { type: 'WILD_ATTACK_DONE' }
  | { type: 'FLEE' }
  | { type: 'CATCH_POKEMON' }
  | { type: 'OPEN_PARTY' }
  | { type: 'CLOSE_PARTY' }
  | { type: 'SET_ACTIVE_POKEMON'; index: number }
  | { type: 'CLEAR_LEVEL_UP' }
  | { type: 'LOAD_SAVE'; state: GameState };
