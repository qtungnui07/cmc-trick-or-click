import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  BoothConfig,
  BoothStats,
  DEFAULT_BOOTH_CONFIG,
  DEFAULT_QUESTIONS,
  QuestionCard,
} from './data/defaultQuestions';
import {
  PixelCandy,
  PixelGhost,
  PixelPumpkin,
  PixelStickerBadge,
} from './components/PixelArtSprites';
import { AdminModal } from './components/AdminModal';
import { GameSession, SessionPanel } from './components/SessionPanel';
import { LiveMonitorPage } from './components/LiveMonitorPage';
import { soundFX } from './utils/sound';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'ROUND_SUMMARY';

interface RoundHistoryItem {
  card: QuestionCard;
  playerChoseScam: boolean;
  isCorrect: boolean;
  wasButtonsSwapped: boolean;
}

const STORAGE_KEYS = {
  QUESTIONS: 'cmc_fest_3110_questions_v3',
  CONFIG: 'cmc_fest_3110_config_v3',
  STATS: 'cmc_fest_3110_stats_v3',
};

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function App() {
  // Persistent Question Bank
  const [questions, setQuestions] = useState<QuestionCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_QUESTIONS;
  });

  // Persistent Booth Configuration
  const [config, setConfig] = useState<BoothConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) {
        return { ...DEFAULT_BOOTH_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_BOOTH_CONFIG;
  });

  // Persistent Booth Stats
  const [stats, setStats] = useState<BoothStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      totalPlays: 0,
      totalWins: 0,
      totalLosses: 0,
      totalCardsSwiped: 0,
      correctSwipes: 0,
    };
  });

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const playId = useMemo(() => {
    const match = window.location.pathname.match(/^\/play\/([A-Za-z0-9_-]+)$/);
    return match?.[1] || null;
  }, []);
  const adminRoute = useMemo(() => {
    const configured =
      (window as unknown as { __ADMIN_PATH__?: string }).__ADMIN_PATH__ ||
      import.meta.env.VITE_ADMIN_PATH ||
      '/admin-bb591658d3';
    return window.location.pathname === configured;
  }, []);
  const isMonitorRoute = useMemo(() => {
    const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    return p === '/monitor' || p === '/live' || p === '/bxh' || p === '/leaderboard';
  }, []);
  const [remoteSession, setRemoteSession] = useState<GameSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(playId));
  const [playerName, setPlayerName] = useState('');
  const [playerNameDraft, setPlayerNameDraft] = useState('');
  const [sessionError, setSessionError] = useState('');

  // Game State Machine
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [roundDeck, setRoundDeck] = useState<QuestionCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [lives, setLives] = useState(config.maxLives);
  const [correctCount, setCorrectCount] = useState(0);
  const [history, setHistory] = useState<RoundHistoryItem[]>([]);
  const [lastResult, setLastResult] = useState<RoundHistoryItem | null>(null);

  // Drag / Swipe Gesture State
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverStamp, setHoverStamp] = useState<'left' | 'right' | null>(null);
  const [flyOutDir, setFlyOutDir] = useState<'left' | 'right' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Calculate if buttons are swapped for current question index (to increase difficulty & avoid muscle memory)
  const isButtonsSwapped = useMemo(() => {
    const mode = config.swapButtonsMode || 'every_card';
    if (mode === 'never') return false;
    if (mode === 'every_card') return currentCardIndex % 2 === 1;
    if (mode === 'every_2') return Math.floor(currentCardIndex / 2) % 2 === 1;
    if (mode === 'every_3') return Math.floor(currentCardIndex / 3) % 2 === 1;
    if (mode === 'random') {
      // Deterministic per question index in round
      return (currentCardIndex * 7 + 3) % 5 === 0 || (currentCardIndex * 3 + 1) % 4 === 0;
    }
    return false;
  }, [config.swapButtonsMode, currentCardIndex]);

  // Alert sound when swap state changes during play
  const prevSwappedRef = useRef(isButtonsSwapped);
  useEffect(() => {
    if (gameState === 'PLAYING' && prevSwappedRef.current !== isButtonsSwapped) {
      soundFX.swapAlert();
    }
    prevSwappedRef.current = isButtonsSwapped;
  }, [gameState, isButtonsSwapped]);

  // Sync sound engine with config
  useEffect(() => {
    soundFX.enabled = config.soundEnabled;
  }, [config.soundEnabled]);

  useEffect(() => {
    if (!playId) return;
    fetch(`/api/sessions/${playId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error);
        return response.json();
      })
      .then((session: GameSession) => {
        setRemoteSession(session);
        setQuestions(session.deck);
        setConfig(session.config);
        setPlayerName(session.playerName || '');
        if (session.status === 'completed') setGameState('ROUND_SUMMARY');
      })
      .catch((error) => setSessionError(error instanceof Error ? error.message : 'Không tải được lượt chơi.'))
      .finally(() => setSessionLoading(false));
  }, [playId]);

  const handleUpdateQuestions = (newQuestions: QuestionCard[]) => {
    setQuestions(newQuestions);
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(newQuestions));
    } catch {
      // ignore
    }
  };

  const handleUpdateConfig = (newConfig: BoothConfig) => {
    setConfig(newConfig);
    soundFX.enabled = newConfig.soundEnabled;
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
    } catch {
      // ignore
    }
  };

  const handleResetStats = () => {
    const empty: BoothStats = {
      totalPlays: 0,
      totalWins: 0,
      totalLosses: 0,
      totalCardsSwiped: 0,
      correctSwipes: 0,
    };
    setStats(empty);
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(empty));
    } catch {
      // ignore
    }
  };

  // Start a new round
  const startNewRound = useCallback(() => {
    soundFX.click();
    const drawCount = Math.min(config.cardsPerRound, questions.length);
    const selectedDeck = remoteSession ? remoteSession.deck : shuffleArray(questions).slice(0, drawCount);
    setRoundDeck(selectedDeck);
    setCurrentCardIndex(0);
    setLives(config.maxLives);
    setCorrectCount(0);
    setHistory([]);
    setLastResult(null);
    setDragX(0);
    setDragY(0);
    setFlyOutDir(null);
    setHoverStamp(null);
    setGameState('PLAYING');
  }, [config.cardsPerRound, config.maxLives, questions]);

  // Finish round and record stats
  const finishRound = useCallback(
    (finalCorrect: number, finalLives: number, totalDeckLength: number) => {
      const requiredCorrect = Math.min(config.minCorrectToWin, totalDeckLength);
      const isVictory = finalLives > 0 && finalCorrect >= requiredCorrect;

      if (isVictory) {
        soundFX.winSticker();
      } else {
        soundFX.gameOver();
      }

      setStats((prev) => {
        const nextStats: BoothStats = {
          ...prev,
          totalPlays: prev.totalPlays + 1,
          totalWins: prev.totalWins + (isVictory ? 1 : 0),
          totalLosses: prev.totalLosses + (isVictory ? 0 : 1),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(nextStats));
        } catch {
          // ignore
        }
        return nextStats;
      });

      if (remoteSession) {
        fetch(`/api/sessions/${remoteSession.id}/complete`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: history.map((item) => ({ cardId: item.card.id, choseScam: item.playerChoseScam })) }),
        }).catch(() => undefined);
      }

      setGameState('ROUND_SUMMARY');
    },
    [config.minCorrectToWin, history, remoteSession]
  );

  // Process player decision based on whether chosen action is Scam or Safe
  const handleDecision = useCallback(
    (choseScam: boolean, direction: 'left' | 'right') => {
      if (gameState !== 'PLAYING' || lastResult !== null || flyOutDir !== null) return;
      const currentCard = roundDeck[currentCardIndex];
      if (!currentCard) return;

      soundFX.swipe();
      setFlyOutDir(direction);
      setHoverStamp(null);

      setTimeout(() => {
        const isCorrect = choseScam === Boolean(currentCard.isScam);
        if (isCorrect) {
          soundFX.correct();
        } else {
          soundFX.wrong();
        }

        const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
        const nextLives = isCorrect ? lives : Math.max(0, lives - 1);

        const item: RoundHistoryItem = {
          card: currentCard,
          playerChoseScam: choseScam,
          isCorrect,
          wasButtonsSwapped: isButtonsSwapped,
        };

        setCorrectCount(nextCorrect);
        setLives(nextLives);
        setHistory((prev) => [...prev, item]);
        setLastResult(item);
        setFlyOutDir(null);
        setDragX(0);
        setDragY(0);

        setStats((prev) => {
          const updated: BoothStats = {
            ...prev,
            totalCardsSwiped: prev.totalCardsSwiped + 1,
            correctSwipes: prev.correctSwipes + (isCorrect ? 1 : 0),
          };
          try {
            localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }, 170);
    },
    [correctCount, currentCardIndex, flyOutDir, gameState, isButtonsSwapped, lastResult, lives, roundDeck]
  );

  // Left action: if swapped, Left is Safe; else Left is Scam
  const handleLeftAction = useCallback(() => {
    handleDecision(!isButtonsSwapped, 'left');
  }, [handleDecision, isButtonsSwapped]);

  // Right action: if swapped, Right is Scam; else Right is Safe
  const handleRightAction = useCallback(() => {
    handleDecision(isButtonsSwapped, 'right');
  }, [handleDecision, isButtonsSwapped]);

  // Advance from explanation overlay to next card or round summary
  const handleProceedNextCard = useCallback(() => {
    if (!lastResult) return;
    soundFX.click();

    const isOutOfLives = lives <= 0;
    const isLastCard = currentCardIndex + 1 >= roundDeck.length;

    if (isOutOfLives || isLastCard) {
      finishRound(correctCount, lives, roundDeck.length);
    } else {
      setLastResult(null);
      setCurrentCardIndex((prev) => prev + 1);
    }
  }, [correctCount, currentCardIndex, finishRound, lastResult, lives, roundDeck.length]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (adminRoute && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        soundFX.click();
        setIsAdminOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsAdminOpen(false);
        return;
      }

      if (isAdminOpen) return;

      if (gameState === 'PLAYING') {
        if (!lastResult) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleLeftAction();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleRightAction();
          }
        } else {
          if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();
            handleProceedNextCard();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleLeftAction, handleProceedNextCard, handleRightAction, isAdminOpen, lastResult]);

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lastResult !== null || flyOutDir !== null) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = (e.clientY - dragStartRef.current.y) * 0.25;
    setDragX(dx);
    setDragY(dy);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;

    const SWIPE_THRESHOLD = 95;
    if (dragX <= -SWIPE_THRESHOLD) {
      handleLeftAction();
    } else if (dragX >= SWIPE_THRESHOLD) {
      handleRightAction();
    } else {
      setDragX(0);
      setDragY(0);
    }
  };

  const activeDeckSize = Math.min(config.cardsPerRound, questions.length);
  const requiredWinScore = Math.min(config.minCorrectToWin, activeDeckSize);
  const currentCard = roundDeck[currentCardIndex];
  const nextPeekCard = roundDeck[currentCardIndex + 1];

  // Stamp Opacity & Transform
  const leftStampOpacity =
    hoverStamp === 'left'
      ? 1
      : dragX < -25
      ? Math.min(1, Math.abs(dragX) / 105)
      : flyOutDir === 'left'
      ? 1
      : 0;

  const rightStampOpacity =
    hoverStamp === 'right'
      ? 1
      : dragX > 25
      ? Math.min(1, dragX / 105)
      : flyOutDir === 'right'
      ? 1
      : 0;

  const cardTransform =
    flyOutDir === 'left'
      ? 'translate3d(-440px, 24px, 0) rotate(-22deg)'
      : flyOutDir === 'right'
      ? 'translate3d(440px, 24px, 0) rotate(22deg)'
      : `translate3d(${dragX}px, ${dragY}px, 0) rotate(${(dragX * 0.055).toFixed(2)}deg)`;

  const isRoundWon =
    lives > 0 && correctCount >= Math.min(config.minCorrectToWin, roundDeck.length || activeDeckSize);

  const joinRemoteSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!remoteSession) return;
    const name = playerNameDraft.trim();
    if (!name) return setSessionError('Vui lòng nhập tên để bắt đầu.');
    try {
      const response = await fetch(`/api/sessions/${remoteSession.id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!response.ok) throw new Error((await response.json()).error);
      const session = await response.json();
      setRemoteSession(session); setPlayerName(name); setSessionError(''); startNewRound();
    } catch (error) { setSessionError(error instanceof Error ? error.message : 'Không thể bắt đầu lượt chơi.'); }
  };

  if (isMonitorRoute) {
    return <LiveMonitorPage />;
  }
  if (sessionLoading) return <div className="min-h-screen bg-pixel-grid text-white flex items-center justify-center font-pixel text-3xl">ĐANG TẢI LƯỢT CHƠI…</div>;
  if (playId && sessionError && !remoteSession) return <div className="min-h-screen bg-pixel-grid text-white flex items-center justify-center p-6 text-center"><div className="pixel-box-red bg-[#161022] p-8"><h1 className="font-pixel text-3xl text-[#F43F5E]">LINK KHÔNG HỢP LỆ</h1><p className="mt-4 text-sm">{sessionError}</p></div></div>;
  if (remoteSession && !playerName && remoteSession.status !== 'completed') return <div className="min-h-screen bg-pixel-grid text-white flex items-center justify-center p-5"><form onSubmit={joinRemoteSession} className="w-full max-w-md pixel-box bg-[#161022] p-7 space-y-5"><h1 className="font-pixel text-4xl text-[#FF6B00]">TRICK OR CLICK</h1><p className="text-sm text-slate-300">Bạn đang tham gia lượt <span className="font-mono text-[#FACC15]">{remoteSession.id}</span>. Nhập tên để bắt đầu.</p><input autoFocus maxLength={60} value={playerNameDraft} onChange={(event) => setPlayerNameDraft(event.target.value)} placeholder="Tên của bạn" className="w-full bg-[#0B0711] border-2 border-[#FF6B00] px-4 py-3 text-white" /><button className="w-full pixel-btn bg-[#FF6B00] text-[#0D0914] py-3 font-extrabold">BẮT ĐẦU CHƠI</button>{sessionError && <p className="text-xs text-[#F43F5E]">{sessionError}</p>}</form></div>;
  if (!playId && !adminRoute) return <div className="min-h-screen bg-pixel-grid text-white flex items-center justify-center p-5 text-center"><div className="pixel-box bg-[#161022] p-8 max-w-md"><h1 className="font-pixel text-4xl text-[#FF6B00]">TRICK OR CLICK</h1><p className="mt-5 text-sm text-slate-300">Hãy quét mã QR tại gian hàng để bắt đầu lượt chơi của bạn.</p></div></div>;

  return (
    <div className="min-h-screen flex flex-col bg-pixel-grid text-[#F8FAFC]">
      {/* TOP BAR CONTRACT: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-5 sm:px-8 py-3.5 bg-[#140D1F] border-b-2 border-[#3B2854]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            soundFX.click();
            setGameState('TITLE_MENU');
          }}
          className="font-pixel text-2xl sm:text-3xl text-[#FF6B00] tracking-wide whitespace-nowrap shrink-0"
        >
          CMC FEST 31/10: TRICK OR CLICK
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => {
              soundFX.click();
              setGameState('TITLE_MENU');
            }}
            className="hover:text-white hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Sảnh Sự Kiện
          </button>
          <button
            onClick={startNewRound}
            className="hover:text-[#FF6B00] hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Chơi Thử Thách
          </button>
          {adminRoute && (
            <button
              onClick={() => {
                soundFX.click();
                setIsAdminOpen(true);
              }}
              className="hover:text-[#FACC15] hover:underline transition-colors whitespace-nowrap shrink-0"
            >
              Kho Câu Hỏi ({questions.length})
            </button>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action (Gear / Admin Modal Trigger) */}
        {adminRoute && (
          <div className="flex items-center shrink-0">
            <button
              onClick={() => {
                soundFX.click();
                setIsAdminOpen(true);
              }}
              title="Mở Quản Lý Kho Câu Hỏi & Cài Đặt Booth (Phím tắt: P)"
              className="pixel-btn bg-[#251838] hover:bg-[#31204A] text-white px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0"
            >
              ⚙️ Cài đặt (P)
            </button>
          </div>
        )}
      </header>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col justify-center">
        {/* =========================================================
            STATE 1: TITLE_MENU (START SCREEN)
        ========================================================= */}
        {gameState === 'TITLE_MENU' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Column: Hero & Primary CTA */}
              <div className="lg:col-span-7 bg-[#161022] pixel-box p-6 sm:p-8 flex flex-col justify-between">
                <div className="space-y-5">
                  {/* Quiet Unboxed Metadata Line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#FF8A00] font-mono-tabular">
                    <span>Halloween 31/10</span>
                    <span aria-hidden="true">·</span>
                    <span>{config.boothName}</span>
                    <span aria-hidden="true">·</span>
                  </div>

                  <h1
                    className="font-pixel text-4xl sm:text-6xl text-white leading-[1.02]"
                    style={{ textWrap: 'balance' }}
                  >
                    THỬ THÁCH QUẸT THẺ TRICK OR CLICK
                  </h1>

                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-[62ch]">
                    Chào mừng các bạn sinh viên đến với gian hàng{' '}
                    <strong className="text-white">{config.boothName}</strong>! Vượt qua{' '}
                    <strong className="text-white">{activeDeckSize} thẻ tình huống</strong> để rinh{' '}
                    phần thưởng từ gian hàng.
                  </p>

                  {/* Rules Clean Unboxed Checklist */}
                  <div className="pt-2 border-t border-[#3B2854] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400">Số thẻ mỗi lượt</div>
                      <div className="font-mono-tabular text-base font-bold text-white mt-0.5">
                        {activeDeckSize} thẻ ngẫu nhiên
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Mạng sinh tồn</div>
                      <div className="font-mono-tabular text-base font-bold text-[#FF6B00] mt-0.5">
                        {config.maxLives} Quả Bí Ngô 🎃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Điều kiện chiến thắng</div>
                      <div className="font-mono-tabular text-base font-bold text-[#10B981] mt-0.5">
                        Đúng ≥ {requiredWinScore}/{activeDeckSize} & còn mạng
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Feature Highlight */}
                  <div className="p-3 bg-[#241334] border border-[#A855F7]/60 text-xs text-[#E9D5FF] flex items-center gap-2.5">
                    <span className="text-lg">🔀</span>
                    <span>
                      <strong>Độ khó thử thách:</strong> Hệ thống sẽ <strong>tráo đổi vị trí 2 nút Lừa đảo / An toàn vài câu một lần</strong> để thử tài phản xạ và chống bấm vẹt!
                    </span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-7 mt-6 border-t border-[#3B2854] flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={startNewRound}
                    className="pixel-btn bg-[#FF6B00] text-[#0D0914] px-6 py-3.5 text-sm sm:text-base font-extrabold whitespace-nowrap shrink-0"
                  >
                    ▶ Bắt Đầu Lượt Chơi Ngay
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Swipe Guide & Booth Telemetry */}
              <div className="lg:col-span-5 bg-[#161022] pixel-box p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-pixel text-2xl sm:text-3xl text-[#FACC15]">
                      QUY TẮC BẪY ĐẢO NÚT
                    </h2>
                    <span className="text-xs font-mono-tabular text-slate-400">
                      Chuột · Cảm ứng · Phím ←/→
                    </span>
                  </div>

                  {/* Visual Demo */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-[#1E1123] border-2 border-[#F43F5E] p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <PixelGhost size={32} />
                        <span className="font-pixel text-xl text-[#F43F5E] font-bold">
                          TRẠNG THÁI 1
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="font-pixel text-xl text-white">TRÁI: LỪA ĐẢO</div>
                        <p className="text-xs text-slate-300 mt-1">
                          Vị trí mặc định: Nút Trái là Lừa đảo (Trick 👻), Nút Phải là An toàn (Treat 🍬).
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#26153A] border-2 border-[#A855F7] p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="font-pixel text-xl text-[#A855F7] font-bold">
                          TRẠNG THÁI 2
                        </span>
                        <PixelCandy size={32} />
                      </div>
                      <div className="mt-3">
                        <div className="font-pixel text-xl text-[#FACC15]">TRÁI: AN TOÀN!</div>
                        <p className="text-xs text-slate-300 mt-1">
                          Bẫy đảo nút kích hoạt: Nút Trái chuyển thành An toàn, Nút Phải thành Lừa đảo!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pumpkin Lives Preview & Admin Quick Info */}
                <div className="pt-4 border-t border-[#3B2854] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-semibold">
                      Mạng Bí Ngô khởi đầu mỗi lượt:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: config.maxLives }).map((_, i) => (
                        <PixelPumpkin key={i} alive={true} size={26} />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular pt-2 border-t border-[#3B2854]/60">
                    <span>Kho dữ liệu: {questions.length} câu</span>
                    <span>·</span>
                    <span>Đã chơi: {stats.totalPlays} lượt</span>
                    <span>·</span>
                    <span className="text-[#10B981]">Sticker đã phát: {stats.totalWins}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {adminRoute && gameState === 'TITLE_MENU' && <SessionPanel questions={questions} config={config} />}

        {/* =========================================================
            STATE 2: PLAYING (ACTIVE CARD SWIPE ARENA)
        ========================================================= */}
        {gameState === 'PLAYING' && currentCard && (
          <div className="max-w-xl mx-auto w-full space-y-4">
            {/* Unobtrusive Top HUD */}
            <div className="bg-[#161022] pixel-box px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              {/* Progress & Score */}
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-mono-tabular">
                <span className="font-bold text-white">
                  Thẻ {currentCardIndex + 1}/{roundDeck.length}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-[#10B981] font-bold">
                  Đúng: {correctCount}/{requiredWinScore}
                </span>
              </div>

              {/* Pumpkin Lives Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: config.maxLives }).map((_, idx) => (
                    <PixelPumpkin key={idx} alive={idx < lives} size={26} />
                  ))}
                </div>
                <span className="text-xs font-mono-tabular text-slate-300">
                  Mạng: {lives}/{config.maxLives}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleUpdateConfig({ ...config, soundEnabled: !config.soundEnabled })
                  }
                  className="px-2.5 py-1 text-xs font-mono-tabular bg-[#231834] border border-[#3B2854] text-slate-200 hover:text-white whitespace-nowrap"
                >
                  {config.soundEnabled ? '🔊 Bật' : '🔇 Tắt'}
                </button>
                <button
                  onClick={() => {
                    soundFX.click();
                    setGameState('TITLE_MENU');
                  }}
                  className="px-2.5 py-1 text-xs bg-[#231834] border border-[#3B2854] text-slate-300 hover:text-white whitespace-nowrap"
                >
                  Thoát
                </button>
              </div>
            </div>

            {/* BUTTON SWAP NOTIFICATION / WARNING BANNER */}
            <div
              className={`p-2.5 text-center text-xs font-bold transition-all ${
                isButtonsSwapped
                  ? 'bg-[#2E1442] border-2 border-[#A855F7] text-[#FDE047] animate-swap-glitch'
                  : 'bg-[#150F22] border border-[#3B2854] text-slate-400'
              }`}
            >
              {isButtonsSwapped ? (
                <div className="flex items-center justify-center gap-2 font-mono-tabular">
                  <span>⚠️</span>
                  <span>BẪY ĐẢO NÚT: [TRÁI = AN TOÀN 🍬] · [PHẢI = LỪA ĐẢO 👻]</span>
                  <span>⚠️</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 font-mono-tabular">
                  <span>Vị trí tiêu chuẩn: [TRÁI = LỪA ĐẢO 👻] · [PHẢI = AN TOÀN 🍬]</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-[#161022] border border-[#3B2854] overflow-hidden">
              <div
                className="h-full bg-[#FF6B00] transition-transform duration-200 origin-left"
                style={{
                  transform: `scaleX(${(currentCardIndex + (lastResult ? 1 : 0)) / roundDeck.length})`,
                }}
              />
            </div>

            {/* CARD DECK STAGE */}
            <div className="relative min-h-[370px] sm:min-h-[390px] flex items-center justify-center">
              {!lastResult && nextPeekCard && (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-4 top-3 bottom-0 bg-[#1B132A] border-2 border-[#3B2854] opacity-50 pointer-events-none transform scale-[0.96] translate-y-2"
                />
              )}

              {/* ACTIVE SWIPEABLE CARD */}
              {!lastResult && (
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    transform: cardTransform,
                    transition: isDragging
                      ? 'none'
                      : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                    touchAction: 'none',
                  }}
                  className={`relative w-full bg-[#211734] pixel-box p-6 sm:p-7 select-none ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                >
                  {/* LEFT STAMP (Matches Left Action: if swapped -> AN TOÀN; else -> LỪA ĐẢO) */}
                  <div
                    style={{ opacity: leftStampOpacity }}
                    className={`pointer-events-none absolute top-5 right-5 z-20 border-4 bg-[#0D0914]/95 px-3.5 py-1 transform rotate-12 transition-opacity duration-75 ${
                      isButtonsSwapped
                        ? 'border-[#10B981] text-[#10B981]'
                        : 'border-[#F43F5E] text-[#F43F5E]'
                    }`}
                  >
                    <span className="font-pixel text-3xl sm:text-4xl font-extrabold tracking-wider">
                      {isButtonsSwapped ? 'AN TOÀN! 🍬' : 'LỪA ĐẢO! 👻'}
                    </span>
                  </div>

                  {/* RIGHT STAMP (Matches Right Action: if swapped -> LỪA ĐẢO; else -> AN TOÀN) */}
                  <div
                    style={{ opacity: rightStampOpacity }}
                    className={`pointer-events-none absolute top-5 left-5 z-20 border-4 bg-[#0D0914]/95 px-3.5 py-1 transform -rotate-12 transition-opacity duration-75 ${
                      isButtonsSwapped
                        ? 'border-[#F43F5E] text-[#F43F5E]'
                        : 'border-[#10B981] text-[#10B981]'
                    }`}
                  >
                    <span className="font-pixel text-3xl sm:text-4xl font-extrabold tracking-wider">
                      {isButtonsSwapped ? 'LỪA ĐẢO! 👻' : 'AN TOÀN! 🍬'}
                    </span>
                  </div>

                  {/* Card Metadata */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular mb-4">
                    <span>{currentCard.category}</span>
                    <span>
                      Mã #{currentCard.id} · Kéo trái/phải theo nút bên dưới
                    </span>
                  </div>

                  {/* Sender / Source Header */}
                  <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-[#3B2854]">
                    <div className="w-14 h-14 bg-[#140D1F] border-2 border-[#FF6B00] flex items-center justify-center text-3xl shrink-0">
                      {currentCard.icon || '🎃'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400 font-mono-tabular">
                        Người gửi / Nguồn phát sinh
                      </div>
                      <div className="text-base sm:text-lg font-bold text-[#FF8A00] truncate">
                        {currentCard.sender}
                      </div>
                    </div>
                  </div>

                  {/* Scenario Content */}
                  <div className="min-h-[135px] flex items-center">
                    <p className="text-base sm:text-lg text-white leading-relaxed font-medium">
                      “{currentCard.content}”
                    </p>
                  </div>

                  {/* Bottom Direction Hint */}
                  <div className="mt-6 pt-3 border-t border-[#3B2854]/60 flex items-center justify-between text-xs font-mono-tabular">
                    <span className={isButtonsSwapped ? 'text-[#10B981]' : 'text-[#F43F5E]'}>
                      ← Quẹt trái: {isButtonsSwapped ? 'AN TOÀN' : 'LỪA ĐẢO'}
                    </span>
                    <span className={isButtonsSwapped ? 'text-[#F43F5E]' : 'text-[#10B981]'}>
                      Quẹt phải: {isButtonsSwapped ? 'LỪA ĐẢO' : 'AN TOÀN'} →
                    </span>
                  </div>
                </div>
              )}

              {/* EXPLANATION FEEDBACK PANEL */}
              {lastResult && (
                <div
                  className={`w-full bg-[#191229] p-6 sm:p-7 space-y-5 ${
                    lastResult.isCorrect ? 'pixel-box-green' : 'pixel-box-red'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#3B2854]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">
                        {lastResult.isCorrect ? '✅' : '💥'}
                      </span>
                      <h3
                        className={`font-pixel text-3xl sm:text-4xl leading-none ${
                          lastResult.isCorrect ? 'text-[#10B981]' : 'text-[#F43F5E]'
                        }`}
                      >
                        {lastResult.isCorrect
                          ? 'CHÍNH XÁC! (+1 CÂU ĐÚNG)'
                          : 'BỊ LỪA RỒI! (-1 BÍ NGÔ 🎃)'}
                      </h3>
                    </div>

                    <span className="text-xs font-mono-tabular text-slate-300">
                      Đáp án gốc:{' '}
                      <strong
                        className={
                          lastResult.card.isScam ? 'text-[#F43F5E]' : 'text-[#10B981]'
                        }
                      >
                        {lastResult.card.isScam ? 'LỪA ĐẢO (TRICK 👻)' : 'AN TOÀN (TREAT 🍬)'}
                      </strong>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-mono-tabular">
                      {lastResult.card.icon} {lastResult.card.sender} · {lastResult.card.category}
                      {lastResult.wasButtonsSwapped && (
                        <span className="ml-2 text-[#FACC15]"> (Câu này vị trí nút đã bị tráo!)</span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-white leading-relaxed bg-[#110B1B] p-4 border border-[#3B2854]">
                      💡 <strong>Giải thích:</strong> {lastResult.card.explanation}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleProceedNextCard}
                      className="w-full pixel-btn bg-[#FF6B00] text-[#0D0914] py-3.5 px-5 text-sm sm:text-base font-extrabold whitespace-nowrap"
                    >
                      {lives <= 0
                        ? '💀 Hết Mạng Bí Ngô — Xem Kết Quả Lượt Chơi →'
                        : currentCardIndex + 1 >= roundDeck.length
                        ? '🏁 Hoàn Thành Lượt Chơi — Xem Kết Quả Săn Sticker →'
                        : 'Thẻ Tiếp Theo (Phím Space / Enter) →'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DYNAMIC SWAPPABLE ACTION BUTTONS */}
            {!lastResult && (
              <div className="grid grid-cols-2 gap-4">
                {/* Left Button */}
                {isButtonsSwapped ? (
                  // SWAPPED LEFT = AN TOÀN
                  <button
                    type="button"
                    onMouseEnter={() => setHoverStamp('left')}
                    onMouseLeave={() => setHoverStamp(null)}
                    onClick={handleLeftAction}
                    className="pixel-btn bg-[#10B981] hover:bg-[#34D399] text-[#052E16] py-3.5 px-4 flex items-center justify-center gap-2 font-extrabold text-xs sm:text-sm whitespace-nowrap"
                  >
                    <PixelCandy size={20} />
                    <span>👈 AN TOÀN (TREAT)</span>
                  </button>
                ) : (
                  // DEFAULT LEFT = LỪA ĐẢO
                  <button
                    type="button"
                    onMouseEnter={() => setHoverStamp('left')}
                    onMouseLeave={() => setHoverStamp(null)}
                    onClick={handleLeftAction}
                    className="pixel-btn bg-[#E11D48] hover:bg-[#F43F5E] text-white py-3.5 px-4 flex items-center justify-center gap-2 font-extrabold text-xs sm:text-sm whitespace-nowrap"
                  >
                    <PixelGhost size={20} />
                    <span>👈 LỪA ĐẢO (TRICK)</span>
                  </button>
                )}

                {/* Right Button */}
                {isButtonsSwapped ? (
                  // SWAPPED RIGHT = LỪA ĐẢO
                  <button
                    type="button"
                    onMouseEnter={() => setHoverStamp('right')}
                    onMouseLeave={() => setHoverStamp(null)}
                    onClick={handleRightAction}
                    className="pixel-btn bg-[#E11D48] hover:bg-[#F43F5E] text-white py-3.5 px-4 flex items-center justify-center gap-2 font-extrabold text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span>LỪA ĐẢO (TRICK) 👉</span>
                    <PixelGhost size={20} />
                  </button>
                ) : (
                  // DEFAULT RIGHT = AN TOÀN
                  <button
                    type="button"
                    onMouseEnter={() => setHoverStamp('right')}
                    onMouseLeave={() => setHoverStamp(null)}
                    onClick={handleRightAction}
                    className="pixel-btn bg-[#10B981] hover:bg-[#34D399] text-[#052E16] py-3.5 px-4 flex items-center justify-center gap-2 font-extrabold text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span>AN TOÀN (TREAT) 👉</span>
                    <PixelCandy size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            STATE 3: ROUND_SUMMARY (WIN STICKER OR LOSE RETRY)
        ========================================================= */}
        {gameState === 'ROUND_SUMMARY' && (
          <div className="max-w-3xl mx-auto w-full bg-[#161022] pixel-box p-6 sm:p-8 space-y-6">
            {/* Top Outcome Banner */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-[#3B2854]">
              <div className="shrink-0">
                {isRoundWon ? (
                  <PixelStickerBadge size={108} />
                ) : (
                  <div className="w-24 h-24 bg-[#22142B] border-2 border-[#F43F5E] flex items-center justify-center text-5xl">
                    👻
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="text-xs font-mono-tabular text-slate-400">
                  {config.boothName}
                </div>
                <h2
                  className={`font-pixel text-4xl sm:text-5xl leading-none ${
                    isRoundWon ? 'text-[#10B981]' : 'text-[#F43F5E]'
                  }`}
                >
                  {isRoundWon
                    ? 'CHIẾN THẮNG! ĐỦ ĐIỀU KIỆN NHẬN STICKER!'
                    : 'CHƯA ĐẠT YÊU CẦU! THỬ LẠI LƯỢT MỚI NHÉ!'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {isRoundWon
                    ? `Xuất sắc! Bạn đã trả lời đúng ${correctCount}/${roundDeck.length} tình huống và bảo toàn được ${lives}/${config.maxLives} Quả Bí Ngô ngay cả khi các nút bị tráo đổi vị trí.`
                    : lives <= 0
                    ? `Bạn đã mất hết cả ${config.maxLives} mạng Quả Bí Ngô 🎃 (Đúng ${correctCount}/${roundDeck.length} câu). Đừng nản chí, bấm Chơi Lại để phục thù ngay!`
                    : `Bạn còn ${lives} mạng Bí Ngô nhưng chỉ đạt ${correctCount}/${roundDeck.length} câu đúng (Yêu cầu tối thiểu ${requiredWinScore}/${roundDeck.length} câu). Hãy thử lại nhé!`}
                </p>
              </div>
            </div>

            {/* Sticker Verification Box */}
            {isRoundWon && (
              <div className="bg-[#0F241F] border-2 border-[#10B981] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono-tabular text-[#A7F3D0]">MÃ XÁC NHẬN PHẦN THƯỞNG TẠI BOOTH</div>
                  <div className="font-pixel text-3xl sm:text-4xl text-[#FACC15] tracking-wider mt-0.5">
                    ★ {config.stickerCode} ★
                  </div>
                </div>
              </div>
            )}

            {/* Round Cards Review List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-400">
                <span>Tổng kết các thẻ đã quẹt trong lượt này ({history.length} thẻ)</span>
                <span>
                  Đúng: {correctCount} · Sai: {history.length - correctCount}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {history.map((item, i) => (
                  <div
                    key={`${item.card.id}-${i}`}
                    className="p-3 bg-[#120C1C] border border-[#3B2854] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-mono-tabular text-slate-400">
                        <span className="text-white font-bold">
                          {item.isCorrect ? '✅ Đúng' : '❌ Sai'}
                        </span>
                        <span> · </span>
                        <span>{item.card.sender}</span>
                        <span> · </span>
                        <span
                          className={
                            item.card.isScam ? 'text-[#F43F5E]' : 'text-[#10B981]'
                          }
                        >
                          {item.card.isScam ? 'Lừa đảo (Trick)' : 'An toàn (Treat)'}
                        </span>
                        {item.wasButtonsSwapped && (
                          <span className="text-[#FACC15] font-semibold"> [Đã đổi nút]</span>
                        )}
                      </div>
                      <p className="text-slate-200">{item.card.content}</p>
                      <p className="text-slate-400 italic">💡 {item.card.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={startNewRound}
                  className="pixel-btn bg-[#FF6B00] text-[#0D0914] px-6 py-3 text-sm font-extrabold whitespace-nowrap"
                >
                  🔄 Chơi Lại / Lượt Cho Sinh Viên Tiếp Theo
                </button>
                <button
                  onClick={() => {
                    soundFX.click();
                    setGameState('TITLE_MENU');
                  }}
                  className="pixel-btn bg-[#231834] text-white px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap"
                >
                  Về Sảnh Chính
                </button>
              </div>

              {adminRoute && (
                <button
                  onClick={() => {
                    soundFX.click();
                    setIsAdminOpen(true);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline whitespace-nowrap"
                >
                  ⚙️ Mở Cài Đặt Booth (P)
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* QUIET FOOTER */}
      <footer className="px-5 sm:px-8 py-4 border-t border-[#3B2854]/60 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div className="font-mono-tabular">
          CMC FEST 31/10 · Trick Or Click Booth Challenge{adminRoute ? ' · Phím tắt quản trị: [P]' : ''}
        </div>
        {adminRoute && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                soundFX.click();
                setIsAdminOpen(true);
              }}
              className="hover:text-[#FF6B00] underline whitespace-nowrap"
            >
              Quản lý kho câu hỏi & cài đặt
            </button>
          </div>
        )}
      </footer>

      {/* ADMIN & QUESTION IMPORT MODAL */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        questions={questions}
        onUpdateQuestions={handleUpdateQuestions}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        stats={stats}
        onResetStats={handleResetStats}
      />

    </div>
  );
}
