import React from 'react';
import { CMC_25_CLUBS } from '../data/defaultQuestions';
import { soundFX } from '../utils/sound';

interface BingoSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoothCell: number;
  stampedCells: number[];
  onToggleCell: (cellNumber: number) => void;
}

export const BingoSheetModal: React.FC<BingoSheetModalProps> = ({
  isOpen,
  onClose,
  activeBoothCell,
  stampedCells,
  onToggleCell,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bingo-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#161021] pixel-box-orange text-[#F8FAFC] overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#1F1630] border-b-2 border-[#3B2854]">
          <div>
            <h2 id="bingo-modal-title" className="font-pixel text-2xl sm:text-3xl text-[#FF6B00] leading-none">
              🎃 PHIẾU BINGO 25 CLB · CMC FEST 31/10
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono-tabular">
              Đã sưu tầm: {stampedCells.length}/25 Sticker · Gian hàng hiện tại: Ô số #{activeBoothCell}
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

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Chiến thắng thử thách <strong>TRICK OR CLICK</strong> tại trạm này sẽ tự động đóng dấu <strong>Sticker Bí Ngô</strong> vào <strong>Ô số #{activeBoothCell}</strong>. Bạn cũng có thể bấm vào các ô CLB khác bên dưới để đánh dấu những Sticker đã thu thập trên tờ Bingo giấy!
          </p>

          <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
            {CMC_25_CLUBS.map((club) => {
              const isCurrentBooth = club.cell === activeBoothCell;
              const isStamped = stampedCells.includes(club.cell);

              return (
                <button
                  key={club.cell}
                  onClick={() => {
                    soundFX.click();
                    onToggleCell(club.cell);
                  }}
                  className={`relative p-2 sm:p-3 text-left flex flex-col justify-between min-h-[82px] sm:min-h-[96px] border-2 transition-transform active:scale-95 ${
                    isCurrentBooth
                      ? 'bg-[#2B1838] border-[#FF6B00]'
                      : isStamped
                      ? 'bg-[#064E3B]/70 border-[#10B981]'
                      : 'bg-[#120C1C] border-[#3B2854] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full text-[11px] font-mono-tabular text-slate-400">
                    <span>#{club.cell}</span>
                    <span>{club.icon}</span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-white leading-tight line-clamp-2 mt-1">
                    {club.name}
                  </div>
                  {isStamped && (
                    <div className="mt-1 text-[10px] font-mono-tabular font-extrabold text-[#34D399]">
                      ★ ĐÃ CÓ STICKER
                    </div>
                  )}
                  {!isStamped && isCurrentBooth && (
                    <div className="mt-1 text-[10px] font-mono-tabular font-extrabold text-[#FF6B00]">
                      📍 TRẠM NÀY
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
