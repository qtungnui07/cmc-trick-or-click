import React, { useEffect, useState } from 'react';
import type { BoothConfig, QuestionCard } from '../data/defaultQuestions';

export interface GameSession {
  id: string; createdAt: string; status: 'waiting' | 'playing' | 'completed'; playerName: string | null;
  startedAt: string | null; completedAt: string | null; correct: number | null; wrong: number | null;
  durationMs: number | null; deck: QuestionCard[]; config: BoothConfig;
}

export function SessionPanel({ questions, config }: { questions: QuestionCard[]; config: BoothConfig }) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [current, setCurrent] = useState<GameSession | null>(null);
  const [selected, setSelected] = useState<GameSession | null>(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('nextfest_admin_token') || '');
  const [tokenDraft, setTokenDraft] = useState(() => sessionStorage.getItem('nextfest_admin_token') || '');
  const [error, setError] = useState('');
  const headers = () => ({ 'Content-Type': 'application/json', 'x-admin-token': token });
  const load = async () => {
    if (!token) return;
    try {
      const r = await fetch('/api/sessions', { headers: { 'x-admin-token': token } });
      if (r.status === 401) throw new Error('Mã Admin không đúng.');
      if (!r.ok) throw new Error('Không tải được danh sách lượt.');
      setSessions(await r.json());
    } catch (err) { setError(err instanceof Error ? err.message : 'Không kết nối được server lưu lượt chơi.'); }
  };
  useEffect(() => { load(); const timer = window.setInterval(load, 3000); return () => window.clearInterval(timer); }, [token]);
  const create = async () => {
    setError('');
    try {
      const r = await fetch('/api/sessions', { method: 'POST', headers: headers(), body: JSON.stringify({ questions, config }) });
      if (!r.ok) throw new Error(); const session = await r.json(); setCurrent(session); await load();
    } catch { setError('Không tạo được lượt. Hãy chạy app bằng npm run serve.'); }
  };
  const reset = async (id: string) => {
    if (!window.confirm('Đặt lại lượt này? Tên và kết quả hiện tại sẽ bị xóa.')) return;
    const r = await fetch(`/api/sessions/${id}/reset`, { method: 'POST', headers: headers() });
    if (!r.ok) return setError('Không thể reset lượt.');
    setSelected(await r.json()); await load();
  };
  const remove = async (id: string) => {
    if (!window.confirm('Xóa vĩnh viễn lượt này?')) return;
    const r = await fetch(`/api/sessions/${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
    if (!r.ok) return setError('Không thể xóa lượt.');
    if (selected?.id === id) setSelected(null); if (current?.id === id) setCurrent(null); await load();
  };
  const link = current ? `${window.location.origin}/play/${current.id}` : '';
  const duration = (ms: number | null) => ms == null ? '—' : `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  if (!token) return <section className="mt-6 max-w-md bg-[#161022] pixel-box p-6 space-y-4"><h2 className="font-pixel text-2xl text-[#FACC15]">ADMIN</h2><p className="text-xs text-slate-300">Nhập mã Admin để quản lý QR và lượt chơi.</p><form onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem('nextfest_admin_token', tokenDraft); setToken(tokenDraft); setError(''); }} className="space-y-3"><input type="password" value={tokenDraft} onChange={e => setTokenDraft(e.target.value)} placeholder="Mã Admin" className="w-full bg-[#0B0711] border-2 border-[#FF6B00] px-3 py-2 text-white" /><button className="pixel-btn bg-[#FF6B00] text-[#0D0914] px-4 py-2 text-xs font-extrabold">MỞ DASHBOARD</button></form>{error && <p className="text-xs text-[#F43F5E]">{error}</p>}</section>;
  return <section className="mt-6 bg-[#161022] pixel-box p-5 space-y-4">
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div>
        <h2 className="font-pixel text-2xl text-[#FACC15]">ADMIN · QR & LƯỢT CHƠI</h2>
        <p className="text-xs text-slate-400 mt-1">Tạo QR cho từng sinh viên. Danh sách tự cập nhật mỗi 3 giây.</p>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/monitor"
          target="_blank"
          rel="noreferrer"
          className="pixel-btn bg-[#06B6D4] text-[#0D0914] px-4 py-3 text-sm font-extrabold flex items-center gap-1.5"
        >
          <span>📺</span> Mở Màn hình Phụ (Live)
        </a>
        <button onClick={create} className="pixel-btn bg-[#FACC15] text-[#0D0914] px-5 py-3 text-sm font-extrabold">
          ＋ Tạo QR lượt mới
        </button>
      </div>
    </div>
    {error && <p className="text-xs text-[#F43F5E]">{error}</p>}
    {current && <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 bg-white p-4 text-[#161022] border-4 border-[#FF6B00]"><img className="w-[180px] h-[180px] mx-auto" alt="QR lượt chơi" src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(link)}`} /><div className="space-y-2"><strong className="font-pixel text-xl">QR lượt: {current.id}</strong><p className="text-sm break-all font-mono">{link}</p><button className="border-2 border-[#161022] px-3 py-1.5 text-xs font-bold" onClick={() => navigator.clipboard.writeText(link)}>Sao chép link</button><p className="text-xs">Người chơi quét QR, nhập tên, sau đó bắt đầu lượt này.</p></div></div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400 border-b border-[#3B2854]"><tr><th className="p-2">ID</th><th>Tên</th><th>Trạng thái</th><th>Đúng/Sai</th><th>Thời gian</th><th></th></tr></thead><tbody>{sessions.map(s => <tr key={s.id} className="border-b border-[#3B2854]/60"><td className="p-2 font-mono text-[#FACC15]">{s.id}</td><td>{s.playerName || 'Chưa quét QR'}</td><td>{s.status === 'waiting' ? 'Chờ' : s.status === 'playing' ? 'Đang chơi' : 'Hoàn tất'}</td><td>{s.correct == null ? '—' : `${s.correct}/${s.wrong}`}</td><td>{duration(s.durationMs)}</td><td><button onClick={() => setSelected(s)} className="underline text-[#FACC15]">Chi tiết</button></td></tr>)}</tbody></table></div>
    {selected && <div className="bg-[#0B0711] border-2 border-[#FF6B00] p-4 text-xs space-y-3"><div className="flex justify-between gap-3"><strong className="font-mono text-[#FACC15]">Lượt {selected.id}</strong><button onClick={() => setSelected(null)}>✕</button></div><p>Người chơi: <strong>{selected.playerName || 'Chưa quét QR'}</strong> · Tạo: {new Date(selected.createdAt).toLocaleString('vi-VN')}</p><p>Link: <span className="font-mono break-all">{window.location.origin}/play/{selected.id}</span></p><p>Bộ đề: {selected.deck.length} câu · Điểm: {selected.correct == null ? 'chưa có' : `${selected.correct} đúng / ${selected.wrong} sai`}</p><div className="flex gap-3"><button onClick={() => reset(selected.id)} className="pixel-btn bg-[#FACC15] text-[#0D0914] px-3 py-2 font-bold">Reset lượt</button><button onClick={() => remove(selected.id)} className="pixel-btn bg-[#E11D48] text-white px-3 py-2 font-bold">Xóa lượt</button></div></div>}
  </section>;
}
