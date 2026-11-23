import React, { useEffect, useState, useMemo } from 'react';
import type { GameSession } from './SessionPanel';

interface LeaderboardEntry {
  id: string;
  playerName: string;
  correct: number;
  total: number;
  durationMs: number | null;
  completedAt: string | null;
  minCorrectToWin: number;
  isWinner: boolean;
}

export function LiveMonitorPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string>('');
  const [pulse, setPulse] = useState(false);

  const fetchLiveSessions = async () => {
    try {
      const res = await fetch('/api/public-sessions', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GameSession[] = await res.json();
      setSessions(data);
      setLastUpdated(new Date());
      setError('');
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    } catch (err) {
      setError('Mất kết nối với máy chủ... Đang thử lại...');
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    const timer = window.setInterval(fetchLiveSessions, 3000);
    return () => window.clearInterval(timer);
  }, []);

  // Bảng xếp hạng: Chỉ những người ĐÃ HOÀN THÀNH (status === 'completed')
  // Sắp xếp:
  // 1. Số câu đúng nhiều nhất (correct giảm dần)
  // 2. Thời gian hoàn thành nhanh nhất (durationMs tăng dần)
  // 3. Hoàn thành sớm hơn (completedAt cũ hơn)
  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'completed' && s.playerName && s.correct !== null)
      .map((s) => {
        const total = s.deck?.length || s.config?.cardsPerRound || 10;
        const correct = s.correct ?? 0;
        const minWin = s.config?.minCorrectToWin ?? 7;
        return {
          id: s.id,
          playerName: s.playerName || 'Ẩn danh',
          correct,
          total,
          durationMs: s.durationMs,
          completedAt: s.completedAt,
          minCorrectToWin: minWin,
          isWinner: correct >= minWin,
        };
      })
      .sort((a, b) => {
        if (b.correct !== a.correct) return b.correct - a.correct;
        const timeA = a.durationMs ?? 99999999;
        const timeB = b.durationMs ?? 99999999;
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
      });
  }, [sessions]);

  // Danh sách người tham gia (Những người tham gia gần đây, bao gồm cả Đang chơi và Hoàn thành)
  const participants = useMemo(() => {
    return sessions
      .filter((s) => s.playerName)
      .sort((a, b) => {
        const dateA = new Date(a.startedAt || a.createdAt).getTime();
        const dateB = new Date(b.startedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [sessions]);

  // Lượt mới tạo gần nhất đang CHỜ người quét (status === 'waiting')
  // Khi admin bấm "Tạo QR lượt mới", mã sẽ lập tức xuất hiện tại đây.
  // Khi 1 người đã quét và nhập tên, lượt chuyển sang 'playing' -> QR tự động biến mất để không ai quét trùng!
  const activeWaitingSession = useMemo(() => {
    return sessions.find((s) => s.status === 'waiting') || null;
  }, [sessions]);

  const activePlayingCount = useMemo(() => {
    return sessions.filter((s) => s.status === 'playing').length;
  }, [sessions]);

  const formatDuration = (ms: number | null) => {
    if (ms === null || ms === undefined) return '--';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return '--';
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 5) return 'vừa xong';
      if (diff < 60) return `${diff}s trước`;
      const m = Math.floor(diff / 60);
      if (m < 60) return `${m}p trước`;
      return `${Math.floor(m / 60)}h trước`;
    } catch {
      return '--';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 border-b border-orange-500/30 px-6 py-3 flex items-center justify-between shadow-2xl backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/20 animate-pulse">
            🎃
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-yellow-400 drop-shadow">
              CMC TRICK OR CLICK · LIVE DASHBOARD
            </h1>
            <p className="text-xs text-orange-200/70 font-mono flex items-center gap-2">
              <span>MÀN HÌNH PHỤ BOOTH HỘI THẢO &amp; SỰ KIỆN</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">CHU KỲ CẬP NHẬT: 3S</span>
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-6">
          {error ? (
            <div className="text-xs bg-red-950/80 border border-red-500/50 text-red-300 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-bounce">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              {error}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-xs font-mono">
              <span className={`w-3 h-3 rounded-full transition-all duration-300 ${pulse ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-500/50' : 'bg-emerald-500'}`} />
              <span className="text-slate-300">TRỰC TIẾP (LIVE)</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300 font-bold">{activePlayingCount} ĐANG THI ĐẤU</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{lastUpdated.toLocaleTimeString('vi-VN')}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Split Body: 2 Phần Ngang (Trái: Bảng xếp hạng, Phải: Những người tham gia) */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1920px] w-full mx-auto">
        {/* Phần 1: BẢNG XẾP HẠNG (Col 7 / 12) */}
        <section className="lg:col-span-7 flex flex-col bg-slate-900/60 border border-orange-500/20 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h2 className="text-xl font-extrabold tracking-wide text-amber-400 uppercase">
                  Bảng Xếp Hạng Cao Thủ
                </h2>
                <p className="text-xs text-slate-400">
                  Tự động cập nhật sau mỗi 3s · Chỉ hiển thị người chơi đã hoàn thành bài thi
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
                {leaderboard.length} Lượt hoàn thành
              </span>
            </div>
          </div>

          {/* Leaderboard Table / Cards */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[calc(100vh-210px)]">
            {leaderboard.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono gap-3">
                <span className="text-4xl animate-bounce">👻</span>
                <p>Chưa có lượt chơi nào hoàn thành...</p>
                <p className="text-xs text-slate-600">Bảng xếp hạng sẽ tự động cập nhật ngay khi người chơi nộp bài!</p>
              </div>
            ) : (
              leaderboard.map((item, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                const rankBadgeClass = isTop1
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                  : isTop2
                  ? 'bg-gradient-to-r from-slate-300 to-slate-100 text-slate-900 font-bold ring-2 ring-slate-300'
                  : isTop3
                  ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white font-bold ring-2 ring-amber-600'
                  : 'bg-slate-800 text-slate-400 font-mono font-semibold';

                const cardBorderClass = isTop1
                  ? 'border-amber-400/50 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 shadow-amber-500/10'
                  : isTop2
                  ? 'border-slate-400/30 bg-slate-900/80'
                  : isTop3
                  ? 'border-amber-700/30 bg-slate-900/80'
                  : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70';

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${cardBorderClass}`}
                  >
                    {/* Rank & Name */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${rankBadgeClass}`}>
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-100 truncate">
                            {item.playerName}
                          </span>
                          {item.isWinner && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/40 uppercase">
                              🎁 Nhận Sticker
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                          <span>Mã: {item.id}</span>
                          <span>•</span>
                          <span>Xong {formatTimeAgo(item.completedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score & Time Details */}
                    <div className="flex items-center gap-4 shrink-0 font-mono text-right">
                      <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg">
                        <span className="text-xs text-slate-500 block leading-tight">ĐIỂM</span>
                        <span className={`text-base font-black ${item.isWinner ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {item.correct} / {item.total}
                        </span>
                      </div>
                      <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg min-w-[70px]">
                        <span className="text-xs text-slate-500 block leading-tight">THỜI GIAN</span>
                        <span className="text-base font-bold text-amber-300">
                          {formatDuration(item.durationMs)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Phần 2: NHỮNG NGƯỜI THAM GIA (Col 5 / 12) */}
        <section className="lg:col-span-5 flex flex-col bg-slate-900/60 border border-cyan-500/20 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          {/* Hộp QR Lượt Chơi Dành Cho Người Tiếp Theo Quét */}
          {activeWaitingSession ? (
            <div className="mb-4 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-400 p-4 rounded-2xl shadow-xl shadow-amber-500/20 animate-pulse">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Mời Người Chơi Tiếp Theo Quét Mã QR
                  </span>
                </div>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                  MÃ DUY NHẤT: {activeWaitingSession.id}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg border-2 border-amber-400">
                  <img
                    className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                    alt={`QR Lượt ${activeWaitingSession.id}`}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                      `${window.location.origin}/play/${activeWaitingSession.id}`
                    )}`}
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="font-extrabold text-sm text-slate-100">
                    Bật Camera điện thoại để tham gia ngay!
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] break-all">
                    {window.location.origin}/play/{activeWaitingSession.id}
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-950/60 border border-red-500/40 rounded text-red-300 text-[11px] font-semibold">
                    <span>⚠️</span>
                    <span>Chỉ 1 người quét · Khóa mã ngay khi bắt đầu</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-base">⏳</span>
                <span>Chờ Ban Tổ Chức tạo mã QR lượt mới...</span>
              </div>
              <span className="text-[10px] text-slate-500">Tự động hiện khi có mã</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <h2 className="text-xl font-extrabold tracking-wide text-cyan-400 uppercase">
                  Những Người Tham Gia
                </h2>
                <p className="text-xs text-slate-400">
                  Dòng hoạt động trực tiếp của các bạn sinh viên tại booth
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold">
                {participants.length} Người tham gia
              </span>
            </div>
          </div>

          {/* Participant Activity Feed */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[calc(100vh-210px)]">
            {participants.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono gap-3">
                <span className="text-4xl animate-pulse">🎯</span>
                <p>Chưa có ai vào phòng thi...</p>
                <p className="text-xs text-slate-600">Quét mã QR tại bàn tiếp đón để bắt đầu tham gia!</p>
              </div>
            ) : (
              participants.map((p) => {
                const isCompleted = p.status === 'completed';
                const isPlaying = p.status === 'playing';
                const total = p.deck?.length || p.config?.cardsPerRound || 10;
                const correct = p.correct ?? 0;
                const minWin = p.config?.minCorrectToWin ?? 7;
                const isWinner = isCompleted && correct >= minWin;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                        {isPlaying ? '⚡' : isWinner ? '🎉' : '🏁'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 truncate text-sm">
                            {p.playerName}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {isPlaying ? (
                            <span className="text-amber-400 font-semibold animate-pulse flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                              Đang làm bài trắc nghiệm...
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Đã hoàn tất lúc {new Date(p.completedAt || 0).toLocaleTimeString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 text-right font-mono">
                      {isPlaying ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ĐANG CHƠI
                        </span>
                      ) : isWinner ? (
                        <div className="flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {p.correct}/{total} CÂU ĐÚNG
                          </span>
                          <span className="text-[10px] text-orange-400 mt-0.5">Thắng Sticker ✨</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {p.correct}/{total} CÂU ĐÚNG
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">Hoàn thành</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Footer Banner */}
      <footer className="bg-slate-900/80 border-t border-slate-800 px-6 py-2.5 text-center text-xs text-slate-400 font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span>CMC UNIVERSITY · CYBERSECURITY WORKSHOP 2026</span>
        </div>
        <div className="text-slate-500">
          Tự động đồng bộ hoá mỗi 3.0 giây · Thiết kế tối ưu cho màn hình phụ / Máy chiếu
        </div>
        <div className="text-amber-400/80 font-bold">
          TRICK OR CLICK
        </div>
      </footer>
    </div>
  );
}
