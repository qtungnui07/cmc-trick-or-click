import React, { useState, useEffect, useRef } from 'react';
import {
  BoothConfig,
  BoothStats,
  DEFAULT_BOOTH_CONFIG,
  DEFAULT_QUESTIONS,
  QuestionCard,
  SwapButtonsMode,
} from '../data/defaultQuestions';
import { soundFX } from '../utils/sound';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionCard[];
  onUpdateQuestions: (newQuestions: QuestionCard[]) => void;
  config: BoothConfig;
  onUpdateConfig: (newConfig: BoothConfig) => void;
  stats: BoothStats;
  onResetStats: () => void;
}

const SAMPLE_JSON_TEMPLATE: QuestionCard[] = [
  {
    id: 101,
    category: 'SMS / Ngân hàng',
    sender: '+84 987 111 xxx (Giả mạo Bank)',
    icon: '🎃',
    content: 'Tài khoản ngân hàng của bạn phát sinh giao dịch lạ tại CMC FEST. Bấm vào link http://bank-verify-cmc.xyz nhập OTP để hủy ngay!',
    isScam: true,
    explanation: 'Ngân hàng không bao giờ gửi link lạ qua số di động cá nhân và tuyệt đối không yêu cầu nhập mã OTP để hủy giao dịch.',
  },
  {
    id: 102,
    category: 'Gian hàng CLB / QR Code',
    sender: 'Bàn Check-in CLB An Toàn Thông Tin',
    icon: '🍬',
    content: 'Quét mã QR dẫn tới Google Form chính thức (@cmc-u.edu.vn) để điểm danh tham gia Workshop Halloween, chỉ điền Họ tên và Mã sinh viên.',
    isScam: false,
    explanation: 'Form điểm danh sự kiện chỉ hỏi Họ tên & MSSV, không yêu cầu mật khẩu hay mã OTP nên hoàn toàn an toàn.',
  },
];

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  questions,
  onUpdateQuestions,
  config,
  onUpdateConfig,
  stats,
  onResetStats,
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'crud' | 'settings'>('settings');
  const [jsonText, setJsonText] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'scam' | 'safe'>('all');

  // Form state for adding/editing a single question
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formCategory, setFormCategory] = useState('Mạng xã hội · Vé sự kiện');
  const [formSender, setFormSender] = useState('');
  const [formIcon, setFormIcon] = useState('🎃');
  const [formContent, setFormContent] = useState('');
  const [formIsScam, setFormIsScam] = useState(true);
  const [formExplanation, setFormExplanation] = useState('');

  // Local settings state
  const [draftConfig, setDraftConfig] = useState<BoothConfig>(config);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(questions, null, 2));
      setDraftConfig(config);
      setStatusMsg(null);
    }
  }, [isOpen, questions, config]);

  if (!isOpen) return null;

  const validateAndNormalizeQuestions = (raw: unknown): QuestionCard[] => {
    if (!Array.isArray(raw)) {
      throw new Error('Dữ liệu JSON phải là một mảng [ ... ] chứa danh sách các thẻ câu hỏi.');
    }
    if (raw.length === 0) {
      throw new Error('Mảng JSON không được để trống (cần ít nhất 1 câu hỏi).');
    }
    return raw.map((item, idx) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`Phần tử thứ ${idx + 1} không phải là object hợp lệ.`);
      }
      const obj = item as Record<string, unknown>;
      const content = String(obj.content ?? '').trim();
      if (!content) {
        throw new Error(`Câu hỏi thứ ${idx + 1} thiếu trường "content" (nội dung tình huống).`);
      }
      if (typeof obj.isScam !== 'boolean') {
        throw new Error(`Câu hỏi thứ ${idx + 1} trường "isScam" phải là kiểu boolean (true hoặc false).`);
      }
      return {
        id: obj.id !== undefined ? (obj.id as number | string) : idx + 1,
        category: String(obj.category || 'Tình huống chung').trim(),
        sender: String(obj.sender || 'Nguồn ẩn danh').trim(),
        icon: String(obj.icon || (obj.isScam ? '👻' : '🍬')).trim(),
        content,
        isScam: Boolean(obj.isScam),
        explanation: String(
          obj.explanation ||
            (obj.isScam
              ? 'Đây là tình huống LỪA ĐẢO (TRICK). Hãy luôn cảnh giác!'
              : 'Đây là tình huống AN TOÀN (TREAT) và hợp lệ.')
        ).trim(),
      };
    });
  };

  const handleImportJson = (mode: 'replace' | 'append') => {
    soundFX.click();
    try {
      const parsed = JSON.parse(jsonText);
      const validList = validateAndNormalizeQuestions(parsed);

      let updated: QuestionCard[];
      if (mode === 'replace') {
        updated = validList;
      } else {
        const maxId = questions.reduce((max, q) => {
          const num = Number(q.id);
          return !Number.isNaN(num) && num > max ? num : max;
        }, 0);
        const reindexed = validList.map((q, i) => ({
          ...q,
          id: maxId + i + 1,
        }));
        updated = [...questions, ...reindexed];
      }

      onUpdateQuestions(updated);
      setJsonText(JSON.stringify(updated, null, 2));
      setStatusMsg({
        type: 'success',
        text:
          mode === 'replace'
            ? `Đã ghi đè kho dữ liệu thành công với ${updated.length} câu hỏi!`
            : `Đã nối thêm ${validList.length} câu hỏi! Tổng kho hiện có ${updated.length} câu.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Lỗi cú pháp JSON không hợp lệ.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setJsonText(content);
      try {
        const parsed = JSON.parse(content);
        const validList = validateAndNormalizeQuestions(parsed);
        setStatusMsg({
          type: 'success',
          text: `Đã đọc file "${file.name}" (${validList.length} câu hỏi hợp lệ). Bấm "Ghi Đè" hoặc "Thêm Nối Tiếp" bên dưới để áp dụng!`,
        });
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: `File JSON lỗi: ${err instanceof Error ? err.message : 'Cú pháp không hợp lệ'}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJsonFile = () => {
    soundFX.click();
    const blob = new Blob([JSON.stringify(questions, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cmc-fest-3110-questions-${questions.length}cards.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({
      type: 'success',
      text: `Đã tải xuống file JSON (${questions.length} câu hỏi).`,
    });
  };

  const handleSaveCardForm = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.click();
    if (!formContent.trim() || !formSender.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Vui lòng nhập đầy đủ Tên người gửi/nguồn và Nội dung tình huống!',
      });
      return;
    }

    if (editingId !== null) {
      const updated = questions.map((q) =>
        q.id === editingId
          ? {
              ...q,
              category: formCategory.trim() || 'Chung',
              sender: formSender.trim(),
              icon: formIcon.trim() || '🎃',
              content: formContent.trim(),
              isScam: formIsScam,
              explanation:
                formExplanation.trim() ||
                (formIsScam ? 'Tình huống lừa đảo!' : 'Tình huống an toàn!'),
            }
          : q
      );
      onUpdateQuestions(updated);
      setStatusMsg({ type: 'success', text: `Đã cập nhật thẻ bài #${editingId}!` });
      setEditingId(null);
    } else {
      const nextId =
        questions.reduce((max, q) => {
          const n = Number(q.id);
          return !Number.isNaN(n) && n > max ? n : max;
        }, 0) + 1;

      const newCard: QuestionCard = {
        id: nextId,
        category: formCategory.trim() || 'Chung',
        sender: formSender.trim(),
        icon: formIcon.trim() || '🎃',
        content: formContent.trim(),
        isScam: formIsScam,
        explanation:
          formExplanation.trim() ||
          (formIsScam ? 'Tình huống lừa đảo!' : 'Tình huống an toàn!'),
      };
      const updated = [newCard, ...questions];
      onUpdateQuestions(updated);
      setStatusMsg({ type: 'success', text: `Đã thêm thẻ bài mới #${nextId} vào kho!` });
    }

    setFormSender('');
    setFormContent('');
    setFormExplanation('');
  };

  const handleStartEditCard = (card: QuestionCard) => {
    soundFX.click();
    setEditingId(card.id);
    setFormCategory(card.category);
    setFormSender(card.sender);
    setFormIcon(card.icon);
    setFormContent(card.content);
    setFormIsScam(card.isScam);
    setFormExplanation(card.explanation);
  };

  const handleDeleteCard = (id: string | number) => {
    soundFX.click();
    if (questions.length <= 1) {
      setStatusMsg({
        type: 'error',
        text: 'Kho dữ liệu phải giữ lại ít nhất 1 thẻ câu hỏi!',
      });
      return;
    }
    const updated = questions.filter((q) => q.id !== id);
    onUpdateQuestions(updated);
    setStatusMsg({ type: 'success', text: `Đã xóa thẻ #${id}. Còn lại ${updated.length} thẻ.` });
  };

  const handleSaveBoothSettings = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.click();
    const safeCards = Math.max(1, Math.min(50, Number(draftConfig.cardsPerRound) || 10));
    const safeLives = Math.max(1, Math.min(10, Number(draftConfig.maxLives) || 3));
    const safeMinWin = Math.max(1, Math.min(safeCards, Number(draftConfig.minCorrectToWin) || 7));

    const updatedConfig: BoothConfig = {
      ...draftConfig,
      cardsPerRound: safeCards,
      maxLives: safeLives,
      minCorrectToWin: safeMinWin,
    };
    onUpdateConfig(updatedConfig);
    setDraftConfig(updatedConfig);
    setStatusMsg({
      type: 'success',
      text: 'Đã lưu cấu hình Luật chơi & Tùy chọn tráo đổi nút chống bấm vẹt!',
    });
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterType === 'scam' && !q.isScam) return false;
    if (filterType === 'safe' && q.isScam) return false;
    if (!searchQuery.trim()) return true;
    const kw = searchQuery.toLowerCase();
    return (
      q.content.toLowerCase().includes(kw) ||
      q.sender.toLowerCase().includes(kw) ||
      q.category.toLowerCase().includes(kw) ||
      String(q.id).includes(kw)
    );
  });

  const scamCount = questions.filter((q) => q.isScam).length;
  const safeCount = questions.length - scamCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#161021] pixel-box-orange text-[#F8FAFC] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#1F1630] border-b-2 border-[#3B2854]">
          <div>
            <h2 id="admin-modal-title" className="font-pixel text-2xl sm:text-3xl text-[#FF6B00] leading-none">
              ⚙️ QUẢN LÝ KHO CÂU HỎI & CÀI ĐẶT BOOTH
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono-tabular">
              Kho: {questions.length} thẻ · Lừa đảo: {scamCount} · An toàn: {safeCount} · Chế độ tráo nút: {draftConfig.swapButtonsMode}
            </p>
          </div>
          <button
            onClick={() => {
              soundFX.click();
              onClose();
            }}
            className="pixel-btn bg-[#2A1E3F] text-white px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0"
          >
            Đóng (ESC)
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-[#120C1C] border-b border-[#3B2854]">
          <button
            onClick={() => {
              soundFX.click();
              setActiveTab('settings');
            }}
            className={`px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[#FF6B00] text-[#0D0914] border-2 border-white'
                : 'bg-[#1F1630] text-slate-300 border-2 border-[#3B2854] hover:text-white'
            }`}
          >
            1. Luật Chơi & Tráo Đổi Nút
          </button>
          <button
            onClick={() => {
              soundFX.click();
              setActiveTab('json');
            }}
            className={`px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'json'
                ? 'bg-[#FF6B00] text-[#0D0914] border-2 border-white'
                : 'bg-[#1F1630] text-slate-300 border-2 border-[#3B2854] hover:text-white'
            }`}
          >
            2. Import / Export JSON
          </button>
          <button
            onClick={() => {
              soundFX.click();
              setActiveTab('crud');
            }}
            className={`px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'crud'
                ? 'bg-[#FF6B00] text-[#0D0914] border-2 border-white'
                : 'bg-[#1F1630] text-slate-300 border-2 border-[#3B2854] hover:text-white'
            }`}
          >
            3. Danh Sách Thẻ ({questions.length})
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMsg && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusMsg.type === 'success'
                ? 'bg-[#064E3B] text-[#A7F3D0] border-[#10B981]'
                : 'bg-[#881337] text-[#FECDD3] border-[#F43F5E]'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button
              onClick={() => setStatusMsg(null)}
              className="underline ml-4 text-xs opacity-80 hover:opacity-100 whitespace-nowrap"
            >
              Ẩn thông báo
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: BOOTH SETTINGS & RULES + SWAP BUTTONS MECHANIC */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveBoothSettings} className="space-y-5">
              <div className="bg-[#211432] p-4 border-2 border-[#FF6B00] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔀</span>
                  <label className="text-sm font-bold text-[#FACC15]">
                    ĐỘ KHÓ: TRÁO ĐỔI VỊ TRÍ 2 NÚT LỪA ĐẢO / AN TOÀN
                  </label>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Để chống người chơi bấm theo thói quen (bấm vẹt) hoặc gian lận, mặc định hệ thống sẽ luân phiên hoán đổi vị trí của 2 nút sau mỗi thẻ: <strong className="text-[#10B981]">AN TOÀN</strong> chuyển sang Trái, và <strong className="text-[#F43F5E]">LỪA ĐẢO</strong> chuyển sang Phải kèm hiệu ứng cảnh báo bẫy ma!
                </p>
                <div className="pt-2">
                  <select
                    value={draftConfig.swapButtonsMode}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        swapButtonsMode: e.target.value as SwapButtonsMode,
                      })
                    }
                    className="w-full bg-[#0D0914] border-2 border-[#FF6B00] px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="every_card">
                      🔄 Luân phiên mỗi thẻ (Độ khó cao - Khuyên dùng)
                    </option>
                    <option value="every_3">
                      🎃 Vài câu đổi 1 lần (Mỗi 3 câu tráo đổi 1 lần)
                    </option>
                    <option value="every_2">
                      ⚡ Thử thách nhanh (Mỗi 2 câu tráo đổi 1 lần)
                    </option>
                    <option value="random">
                      🎲 Bất ngờ ngẫu nhiên (Xuất hiện bất thình lình)
                    </option>
                    <option value="never">
                      🔒 Cố định (Trái luôn là Lừa đảo, Phải luôn là An toàn)
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tên Gian Hàng / CLB Tại CMC FEST
                  </label>
                  <input
                    type="text"
                    value={draftConfig.boothName}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, boothName: e.target.value })
                    }
                    className="w-full bg-[#0B0711] border-2 border-[#3B2854] px-3 py-2 text-xs text-white select-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số Thẻ Bài Rút Mỗi Lượt (Mặc định: 7)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={draftConfig.cardsPerRound}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        cardsPerRound: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B0711] border-2 border-[#3B2854] px-3 py-2 text-xs text-white font-mono-tabular select-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số Câu Đúng Tối Thiểu Để Nhận Sticker (Mặc định: 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={draftConfig.minCorrectToWin}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        minCorrectToWin: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B0711] border-2 border-[#3B2854] px-3 py-2 text-xs text-white font-mono-tabular select-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số Mạng Quả Bí Ngô 🎃 (Mặc định: 3)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={draftConfig.maxLives}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        maxLives: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#0B0711] border-2 border-[#3B2854] px-3 py-2 text-xs text-white font-mono-tabular select-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Mã Xác Nhận Phát Sticker (Hiện Khi Thắng)
                  </label>
                  <input
                    type="text"
                    value={draftConfig.stickerCode}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, stickerCode: e.target.value })
                    }
                    className="w-full bg-[#0B0711] border-2 border-[#3B2854] px-3 py-2 text-xs text-[#34D399] font-mono select-text"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#3B2854]">
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="pixel-btn bg-[#FF6B00] text-[#0D0914] px-5 py-2 text-xs font-extrabold whitespace-nowrap"
                  >
                    💾 Lưu Cài Đặt Booth
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      setDraftConfig(DEFAULT_BOOTH_CONFIG);
                      onUpdateConfig(DEFAULT_BOOTH_CONFIG);
                      setStatusMsg({
                        type: 'success',
                        text: 'Đã đưa luật chơi về mặc định (7 thẻ · 3 mạng Bí Ngô · Đúng 5/7 nhận Sticker · Đổi nút mỗi 3 câu).',
                      });
                    }}
                    className="pixel-btn bg-[#2A1E3F] text-slate-300 px-3.5 py-2 text-xs font-bold whitespace-nowrap"
                  >
                    Khôi phục Luật Mặc Định
                  </button>
                </div>

                {/* Booth Live Telemetry Summary */}
                <div className="flex items-center gap-4 text-xs text-slate-400 font-mono-tabular">
                  <span>Lượt chơi tại Booth: {stats.totalPlays}</span>
                  <span>·</span>
                  <span className="text-[#10B981]">Sticker đã phát: {stats.totalWins}</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.click();
                      onResetStats();
                      setStatusMsg({ type: 'success', text: 'Đã xóa bộ đếm thống kê tại Booth.' });
                    }}
                    className="underline text-[#F43F5E] hover:text-white ml-2"
                  >
                    Reset thống kê
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: IMPORT / EXPORT JSON */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Nhập / Xuất Kho Câu Hỏi Chuẩn Cấu Trúc JSON
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dán mảng JSON trực tiếp vào ô bên dưới hoặc tải file <code className="text-[#FF6B00]">.json</code> từ máy tính. Dữ liệu tự động lưu vào trình duyệt (LocalStorage).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="pixel-btn bg-[#2A1E3F] text-white px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                  >
                    📂 Chọn File .JSON
                  </button>
                  <button
                    onClick={handleExportJsonFile}
                    className="pixel-btn bg-[#2A1E3F] text-[#34D399] px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                  >
                    📥 Xuất File .JSON
                  </button>
                  <button
                    onClick={() => {
                      soundFX.click();
                      setJsonText(JSON.stringify(SAMPLE_JSON_TEMPLATE, null, 2));
                      setStatusMsg({
                        type: 'success',
                        text: 'Đã điền mẫu JSON 2 câu hỏi chuẩn vào ô soạn thảo. Bạn có thể chỉnh sửa rồi bấm Thêm Nối Tiếp hoặc Ghi Đè.',
                      });
                    }}
                    className="pixel-btn bg-[#2A1E3F] text-[#FACC15] px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                  >
                    📋 Xem JSON Mẫu
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={13}
                spellCheck={false}
                className="w-full bg-[#0B0711] border-2 border-[#3B2854] focus:border-[#FF6B00] outline-none p-3.5 text-xs font-mono text-[#E2E8F0] leading-relaxed select-text"
                placeholder="Dán mảng JSON câu hỏi vào đây..."
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleImportJson('replace')}
                    className="pixel-btn bg-[#FF6B00] text-[#0D0914] px-4 py-2 text-xs font-extrabold whitespace-nowrap"
                  >
                    💾 Ghi Đè Kho Câu Hỏi (Replace)
                  </button>
                  <button
                    onClick={() => handleImportJson('append')}
                    className="pixel-btn bg-[#10B981] text-[#052E16] px-4 py-2 text-xs font-extrabold whitespace-nowrap"
                  >
                    ➕ Thêm Nối Tiếp Vào Kho (Append)
                  </button>
                </div>

                <button
                  onClick={() => {
                    soundFX.click();
                    onUpdateQuestions(DEFAULT_QUESTIONS);
                    setJsonText(JSON.stringify(DEFAULT_QUESTIONS, null, 2));
                    setStatusMsg({
                      type: 'success',
                      text: `Đã khôi phục bộ ${DEFAULT_QUESTIONS.length} câu hỏi gốc của sự kiện CMC FEST!`,
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-[#F43F5E] underline whitespace-nowrap"
                >
                  Khôi phục 15 câu mặc định CMC FEST
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VISUAL CRUD */}
          {activeTab === 'crud' && (
            <div className="space-y-6">
              {/* Form Thêm / Sửa Nhanh */}
              <form
                onSubmit={handleSaveCardForm}
                className="bg-[#120C1C] border-2 border-[#3B2854] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#FF6B00]">
                    {editingId !== null
                      ? `✏️ Đang Chỉnh Sửa Thẻ Bài #${editingId}`
                      : '➕ Thêm Nhanh Tình Huống Mới'}
                  </h3>
                  {editingId !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setFormSender('');
                        setFormContent('');
                        setFormExplanation('');
                      }}
                      className="text-xs text-slate-400 underline hover:text-white"
                    >
                      Hủy chỉnh sửa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Danh mục (Category)</label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="VD: SMS / Ngân hàng"
                      className="w-full bg-[#0B0711] border border-[#3B2854] px-3 py-1.5 text-xs text-white select-text"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Người gửi / Nguồn (Sender)</label>
                    <input
                      type="text"
                      value={formSender}
                      onChange={(e) => setFormSender(e.target.value)}
                      placeholder="VD: +84 987xxx, Fanpage CLB..."
                      className="w-full bg-[#0B0711] border border-[#3B2854] px-3 py-1.5 text-xs text-white select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Biểu tượng (Icon)</label>
                    <input
                      type="text"
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      placeholder="🎃, 📱, 💬..."
                      className="w-full bg-[#0B0711] border border-[#3B2854] px-3 py-1.5 text-xs text-white select-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nội dung tình huống trên thẻ bài</label>
                  <textarea
                    rows={2}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Nhập tình huống thực tế để sinh viên phân biệt..."
                    className="w-full bg-[#0B0711] border border-[#3B2854] px-3 py-1.5 text-xs text-white select-text"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Giải thích hiện ra sau khi quẹt thẻ</label>
                    <input
                      type="text"
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      placeholder="Giải thích ngắn gọn dấu hiệu nhận biết..."
                      className="w-full bg-[#0B0711] border border-[#3B2854] px-3 py-1.5 text-xs text-white select-text"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsScam(true)}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold border-2 whitespace-nowrap ${
                        formIsScam
                          ? 'bg-[#F43F5E] text-white border-white'
                          : 'bg-[#1F1630] text-slate-400 border-[#3B2854]'
                      }`}
                    >
                      👻 LỪA ĐẢO
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsScam(false)}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold border-2 whitespace-nowrap ${
                        !formIsScam
                          ? 'bg-[#10B981] text-[#052E16] border-white'
                          : 'bg-[#1F1630] text-slate-400 border-[#3B2854]'
                      }`}
                    >
                      🍬 AN TOÀN
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="pixel-btn bg-[#FF6B00] text-[#0D0914] px-4 py-1.5 text-xs font-extrabold whitespace-nowrap"
                  >
                    {editingId !== null ? '💾 Cập Nhật Thẻ Này' : '➕ Thêm Vào Kho Câu Hỏi'}
                  </button>
                </div>
              </form>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Tìm theo nội dung, người gửi, danh mục..."
                  className="flex-1 min-w-[220px] bg-[#0B0711] border-2 border-[#3B2854] px-3 py-1.5 text-xs text-white select-text"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 text-xs font-bold border whitespace-nowrap ${
                      filterType === 'all'
                        ? 'bg-white text-[#0D0914] border-white'
                        : 'bg-[#1F1630] text-slate-300 border-[#3B2854]'
                    }`}
                  >
                    Tất cả ({questions.length})
                  </button>
                  <button
                    onClick={() => setFilterType('scam')}
                    className={`px-3 py-1.5 text-xs font-bold border whitespace-nowrap ${
                      filterType === 'scam'
                        ? 'bg-[#F43F5E] text-white border-white'
                        : 'bg-[#1F1630] text-slate-300 border-[#3B2854]'
                    }`}
                  >
                    Lừa đảo ({scamCount})
                  </button>
                  <button
                    onClick={() => setFilterType('safe')}
                    className={`px-3 py-1.5 text-xs font-bold border whitespace-nowrap ${
                      filterType === 'safe'
                        ? 'bg-[#10B981] text-[#052E16] border-white'
                        : 'bg-[#1F1630] text-slate-300 border-[#3B2854]'
                    }`}
                  >
                    An toàn ({safeCount})
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 bg-[#120C1C] border border-[#3B2854] flex items-start justify-between gap-4 hover:border-slate-500 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                        <span className="text-base">{q.icon}</span>
                        <span className="font-bold text-white">#{q.id}</span>
                        <span>·</span>
                        <span>{q.category}</span>
                        <span>·</span>
                        <span className="text-[#FF6B00] font-semibold">{q.sender}</span>
                        <span>·</span>
                        <span
                          className={
                            q.isScam ? 'text-[#F43F5E] font-bold' : 'text-[#10B981] font-bold'
                          }
                        >
                          {q.isScam ? 'LỪA ĐẢO (TRICK 👻)' : 'AN TOÀN (TREAT 🍬)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{q.content}</p>
                      <p className="text-[11px] text-slate-400 italic">💡 {q.explanation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStartEditCard(q)}
                        className="px-2.5 py-1 text-xs font-bold bg-[#2A1E3F] text-white hover:bg-[#FF6B00] hover:text-black transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteCard(q.id)}
                        className="px-2.5 py-1 text-xs font-bold bg-[#2A1E3F] text-[#F43F5E] hover:bg-[#F43F5E] hover:text-white transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
