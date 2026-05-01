import { useEffect, useState, lazy, Suspense } from 'react';
import { useGame } from './context/GameContext';
import StarterSelect from './components/StarterSelect';
import MapView from './components/MapView';
import EncounterScreen from './components/EncounterScreen';
import BattleScreen from './components/BattleScreen';
import PartyScreen from './components/PartyScreen';

const FirstPersonView = lazy(() => import('./components/FirstPersonView'));

// タッチデバイス判定 (スマホ・タブレット = true, PC = false)
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function useOrientation() {
  const [landscape, setLandscape] = useState(false);
  useEffect(() => {
    if (!isTouchDevice()) return; // PC では横向き判定しない
    const check = () => setLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return landscape;
}

export default function App() {
  const { state } = useGame();
  const landscape = useOrientation();
  const isTouch = isTouchDevice();

  const show3D = landscape && isTouch && state.screen !== 'starter';

  return (
    // PC: 画面中央にスマホ風フレーム / スマホ: フルスクリーン
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
      <div
        className={`
          relative overflow-hidden bg-gray-900
          ${isTouch
            ? 'w-screen h-screen'                        // スマホ: フルスクリーン
            : 'w-[430px] h-[860px] rounded-[40px] border-[6px] border-gray-700 shadow-2xl shadow-black/60'
          }
        `}
        style={{ touchAction: isTouch ? 'none' : 'auto' }}
      >
        {/* PC用: 上部にゲームタイトルバー */}
        {!isTouch && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center justify-center z-50 rounded-t-[34px] border-b border-gray-700">
            <span className="font-pixel text-yellow-400 text-xs">PokéWalk English 英語冒険</span>
          </div>
        )}

        {/* コンテンツエリア (PCではタイトルバー分を下げる) */}
        <div className={`absolute inset-0 ${!isTouch ? 'top-8' : ''}`}>
          {state.screen === 'starter' && <StarterSelect />}

          {/* 3Dビュー (スマホ横向きのみ) */}
          {show3D && (
            <div className={`absolute inset-0 ${state.screen === 'map' ? 'block' : 'hidden'}`}>
              <Suspense fallback={
                <div className="flex items-center justify-center w-full h-full bg-gray-900">
                  <div className="text-white font-pixel text-xs animate-pulse">LOADING 3D...</div>
                </div>
              }>
                <FirstPersonView />
              </Suspense>
            </div>
          )}

          {/* 2Dマップ (PCは常時 / スマホ縦向き) */}
          {!show3D && state.screen === 'map' && <MapView />}

          {state.screen === 'encounter' && <EncounterScreen />}
          {state.screen === 'battle'    && <BattleScreen />}
          {state.screen === 'party'     && <PartyScreen />}

          {/* スマホ縦向き中の横向きヒント */}
          {isTouch && !landscape && state.screen === 'map' && (
            <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-black/40 backdrop-blur rounded-full px-3 py-1 text-gray-400 text-xs whitespace-nowrap">
                📱 横向きで3Dモード / Rotate for 3D
              </div>
            </div>
          )}

          {/* PC用: キーボードショートカットヒント (マップ画面) */}
          {!isTouch && state.screen === 'map' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-black/50 backdrop-blur rounded-full px-3 py-1 text-gray-500 text-xs whitespace-nowrap">
                Space / Enter: 歩く &nbsp;|&nbsp; P: 手持ち
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
