import { BoothConfig, QuestionCard } from '../data/defaultQuestions';

export function generateStandaloneHtml(questions: QuestionCard[], config: BoothConfig): string {
  const safeQuestionsJson = JSON.stringify(questions, null, 2).replace(/<\/script>/gi, '<\\/script>');
  const safeConfigJson = JSON.stringify(config, null, 2).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>CMC FEST 31/10: TRICK OR CLICK - Thử Thách Săn Sticker</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=VT323&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-dark: #0D0914;
      --bg-panel: #181124;
      --bg-card: #211733;
      --border-muted: #3B2854;
      --orange: #FF6B00;
      --green: #10B981;
      --red: #F43F5E;
      --purple: #A855F7;
      --yellow: #FACC15;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body {
      font-family: 'VT323', 'JetBrains Mono', monospace;
      background-color: var(--bg-dark);
      background-image:
        linear-gradient(to right, rgba(255,107,0,0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,107,0,0.05) 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    .font-pixel { font-family: 'VT323', 'JetBrains Mono', monospace; letter-spacing: 0.04em; }
    .tabular { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 2rem;
      padding: 0.85rem 1.5rem; background: #140D1F; border-bottom: 3px solid var(--border-muted);
    }
    .brand { font-family: 'VT323', monospace; font-size: 1.75rem; color: var(--orange); font-weight: 700; white-space: nowrap; }
    .nav-links { display: flex; gap: 1.5rem; font-size: 0.9rem; color: var(--text-muted); }
    .nav-links button { background: none; border: none; color: inherit; font: inherit; cursor: pointer; white-space: nowrap; }
    .nav-links button:hover { color: var(--text); text-decoration: underline; }
    .pixel-btn {
      font-family: 'VT323', 'JetBrains Mono', monospace; font-weight: 700; font-size: 1.15rem;
      padding: 0.55rem 1.1rem; border: 3px solid var(--text); background: var(--bg-card); color: var(--text);
      box-shadow: 4px 4px 0 #050308; cursor: pointer; transition: transform 0.12s; white-space: nowrap;
    }
    .pixel-btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 #050308; }
    .pixel-btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #050308; }
    .btn-orange { background: var(--orange); color: #0D0914; border-color: #FFF; }
    .btn-red { background: var(--red); color: #FFF; border-color: #FFE4E6; }
    .btn-green { background: var(--green); color: #052E16; border-color: #D1FAE5; }
    main { flex: 1; max-width: 1120px; width: 100%; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; }
    .panel { background: var(--bg-panel); border: 3px solid var(--border-muted); box-shadow: 6px 6px 0 #050308; padding: 1.75rem; }
    .hud { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding: 0.85rem 1.25rem; background: #140D1F; border: 3px solid var(--border-muted); }
    .card-stage { position: relative; width: 100%; max-width: 480px; min-height: 360px; margin: 0 auto; perspective: 1000px; }
    .swipe-card {
      background: var(--bg-card); border: 3px solid #6D28D9; box-shadow: 8px 8px 0 #050308;
      padding: 1.75rem; position: relative; touch-action: none; cursor: grab;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s;
    }
    .swipe-card.dragging { transition: none; cursor: grabbing; }
    .stamp {
      position: absolute; top: 1.25rem; padding: 0.35rem 0.85rem; font-family: 'VT323', monospace;
      font-size: 2rem; font-weight: 700; border: 4px solid; pointer-events: none; opacity: 0; z-index: 20;
    }
    .stamp-left { right: 1.25rem; transform: rotate(12deg); }
    .stamp-right { left: 1.25rem; transform: rotate(-12deg); }
    .controls-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 480px; width: 100%; margin: 1.25rem auto 0; }
    .swap-alert-banner {
      max-width: 480px; margin: 0.5rem auto 0.75rem; padding: 0.45rem 0.75rem;
      background: #2D143D; border: 2px dashed var(--yellow); color: var(--yellow);
      font-size: 0.82rem; font-weight: 700; text-align: center; border-radius: 4px;
    }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(5,3,8,0.86); display: none; align-items: center; justify-content: center; padding: 1rem; z-index: 100; }
    .modal-backdrop.open { display: flex; }
    .modal-box { background: var(--bg-panel); border: 3px solid var(--orange); box-shadow: 8px 8px 0 #000; max-width: 820px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem; }
    textarea, input, select { width: 100%; background: #0D0914; border: 2px solid var(--border-muted); color: var(--text); padding: 0.65rem; font-family: 'VT323', 'JetBrains Mono', monospace; font-size: 1.1rem; user-select: text; -webkit-user-select: text; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand">🎃 CMC FEST 31/10: TRICK OR CLICK</div>
    <nav class="nav-links">
      <button onclick="showView('title')">Trang Chủ</button>
      <button onclick="startNewRound()">Chơi Ngay</button>
      <button onclick="toggleAdminModal(true)">Kho Câu Hỏi (<span id="qCountLabel">0</span>)</button>
    </nav>
    <button class="pixel-btn" onclick="toggleAdminModal(true)">⚙️ Cài đặt (P)</button>
  </header>

  <main>
    <!-- TITLE VIEW -->
    <section id="view-title" class="panel" style="text-align:center; max-width: 760px; margin: 0 auto;">
      <p class="tabular" style="color: var(--orange); font-size: 0.9rem; margin-bottom: 0.5rem;" id="boothSubtitle"></p>
      <h1 class="font-pixel" style="font-size: clamp(2.4rem, 5vw, 3.8rem); line-height: 1.05; margin-bottom: 1rem;">
        TRICK OR CLICK: THỬ THÁCH SĂN STICKER
      </h1>
      <p style="color: var(--text-muted); line-height: 1.6; max-width: 60ch; margin: 0 auto 1.5rem;">
        Quẹt thẻ phân biệt tình huống <strong style="color:var(--red)">LỪA ĐẢO (TRICK 👻)</strong> hay <strong style="color:var(--green)">AN TOÀN (TREAT 🍬)</strong> để bảo vệ 3 Quả Bí Ngô và rinh Sticker dán vào bảng Bingo 25 CLB!
        <br/><span style="color:var(--yellow); font-size:0.88rem;">⚠️ Chế độ bẫy ma: Vị trí 2 nút Lừa đảo / An toàn sẽ được tráo đổi bất ngờ sau vài câu!</span>
      </p>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-muted);" class="tabular" id="rulesSummaryLine"></div>
      <div style="display:flex; justify-content:center; gap: 1rem; flex-wrap:wrap;">
        <button class="pixel-btn btn-orange" style="font-size:1.15rem; padding: 0.85rem 2rem;" onclick="startNewRound()">▶ BẮT ĐẦU LƯỢT CHƠI</button>
        <button class="pixel-btn" onclick="toggleAdminModal(true)">⚙️ Quản Lý Kho & Cài Đặt</button>
      </div>
    </section>

    <!-- PLAY VIEW -->
    <section id="view-play" class="hidden">
      <div class="hud">
        <div class="tabular" style="font-weight:700;">Thẻ: <span id="hudProgress">1/7</span> · Đúng: <span id="hudScore" style="color:var(--green)">0</span></div>
        <div id="hudLives" style="font-size: 1.4rem; letter-spacing: 0.2rem;">🎃🎃🎃</div>
        <div class="tabular" style="font-size:0.85rem; color:var(--text-muted);">Cần đúng <span id="hudTarget">5</span> câu</div>
      </div>

      <!-- SWAP WARNING BANNER -->
      <div id="swapAlertBanner" class="swap-alert-banner hidden">
        ⚠️ BẪY ĐẢO NÚT: [TRÁI = AN TOÀN 🍬] · [PHẢI = LỪA ĐẢO 👻]
      </div>

      <div class="card-stage">
        <div id="activeCard" class="swipe-card">
          <div id="stampLeft" class="stamp stamp-left">LỪA ĐẢO!</div>
          <div id="stampRight" class="stamp stamp-right">AN TOÀN!</div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.82rem;" class="tabular">
            <span id="cardCategory">SMS · Ngân hàng</span>
            <span id="cardNumber">#1</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.85rem; margin-bottom: 1.1rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-muted);">
            <div id="cardIcon" style="font-size: 2.4rem;">🎃</div>
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Nguồn / Người gửi</div>
              <div id="cardSender" style="font-weight:700; color:var(--orange);">+84 987xxx</div>
            </div>
          </div>
          <p id="cardContent" style="font-size: 1.08rem; line-height: 1.65; min-height: 120px;"></p>
        </div>

        <!-- EXPLANATION STEP -->
        <div id="feedbackBox" class="panel hidden" style="margin-top: 1rem;">
          <div id="feedbackHeader" class="font-pixel" style="font-size: 1.9rem; margin-bottom: 0.5rem;"></div>
          <p id="feedbackText" style="color: var(--text); line-height: 1.6; margin-bottom: 1.25rem;"></p>
          <button class="pixel-btn btn-orange" style="width:100%;" onclick="nextCard()">THẺ TIẾP THEO (SPACE / ENTER) →</button>
        </div>
      </div>

      <div id="swipeButtons" class="controls-row">
        <button id="btnLeft" class="pixel-btn btn-red" style="padding: 0.9rem;" onclick="handleLeftClick()">👈 LỪA ĐẢO (TRICK 👻)</button>
        <button id="btnRight" class="pixel-btn btn-green" style="padding: 0.9rem;" onclick="handleRightClick()">AN TOÀN (TREAT 🍬) 👉</button>
      </div>
    </section>

    <!-- RESULT VIEW -->
    <section id="view-result" class="panel hidden" style="text-align:center; max-width: 640px; margin: 0 auto;">
      <div id="resultIcon" style="font-size: 4rem; margin-bottom: 0.5rem;">🏆</div>
      <h2 id="resultTitle" class="font-pixel" style="font-size: 2.8rem; margin-bottom: 0.5rem;"></h2>
      <p id="resultSub" style="color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.6;"></p>
      <div id="stickerRewardBox" class="panel" style="background:#140D1F; border-color: var(--yellow); margin-bottom: 1.5rem;">
        <div style="font-size:0.8rem; color:var(--yellow);">MÃ XÁC NHẬN DÁN STICKER BINGO</div>
        <div id="resultStickerCode" class="font-pixel" style="font-size: 2.2rem; color: var(--green); margin-top: 0.25rem;"></div>
      </div>
      <div style="display:flex; justify-content:center; gap: 1rem;">
        <button class="pixel-btn btn-orange" onclick="startNewRound()">🔄 CHƠI LƯỢT MỚI (NGƯỜI TIẾP THEO)</button>
        <button class="pixel-btn" onclick="showView('title')">Về Màn Hình Chính</button>
      </div>
    </section>
  </main>

  <!-- ADMIN MODAL -->
  <div id="adminModal" class="modal-backdrop">
    <div class="modal-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid var(--border-muted);">
        <h3 class="font-pixel" style="font-size: 1.8rem; color: var(--orange);">⚙️ QUẢN LÝ KHO CÂU HỎI & CÀI ĐẶT BOOTH</h3>
        <button class="pixel-btn" onclick="toggleAdminModal(false)">Đóng (ESC)</button>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
        <div>
          <label style="font-size:0.8rem; color:var(--text-muted);">Tên CLB / Trạm Booth</label>
          <input id="cfgBoothName" type="text" />
        </div>
        <div>
          <label style="font-size:0.8rem; color:var(--text-muted);">Số thẻ mỗi lượt</label>
          <input id="cfgCardsPerRound" type="number" min="1" max="50" />
        </div>
        <div>
          <label style="font-size:0.8rem; color:var(--text-muted);">Số mạng Bí Ngô 🎃</label>
          <input id="cfgMaxLives" type="number" min="1" max="10" />
        </div>
        <div>
          <label style="font-size:0.8rem; color:var(--text-muted);">Số câu đúng nhận Sticker</label>
          <input id="cfgMinCorrect" type="number" min="1" max="50" />
        </div>
        <div>
          <label style="font-size:0.8rem; color:var(--text-muted);">Tráo Đổi Vị Trí Nút (Tăng độ khó)</label>
          <select id="cfgSwapMode">
            <option value="every_card">Luân phiên mỗi thẻ (Độ khó cao - Khuyên dùng)</option>
            <option value="every_3">Vài câu đổi 1 lần (Mỗi 3 câu)</option>
            <option value="every_2">Đổi thường xuyên (Mỗi 2 câu)</option>
            <option value="random">Đổi ngẫu nhiên bất ngờ</option>
            <option value="never">Tắt (Cố định Trái=Lừa, Phải=An toàn)</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom: 0.75rem;">
        <label style="font-size:0.85rem; font-weight:700; display:block; margin-bottom: 0.35rem;">Kho câu hỏi JSON (Chỉnh sửa hoặc Dán JSON mới vào đây):</label>
        <textarea id="jsonInput" rows="10"></textarea>
        <p id="adminMsg" style="font-size:0.85rem; margin-top: 0.4rem; color: var(--green);"></p>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap: 0.75rem;">
        <button class="pixel-btn btn-orange" onclick="saveAdminChanges(false)">💾 Lưu & Ghi Đè Kho Câu Hỏi</button>
        <button class="pixel-btn btn-green" onclick="saveAdminChanges(true)">➕ Thêm Nối Tiếp Vào Kho</button>
        <button class="pixel-btn" onclick="exportJsonFile()">📥 Tải File .JSON</button>
      </div>
    </div>
  </div>

  <script>
    const INITIAL_QUESTIONS = ${safeQuestionsJson};
    const INITIAL_CONFIG = ${safeConfigJson};

    let questions = JSON.parse(localStorage.getItem('cmc_fest_questions_v1') || 'null') || INITIAL_QUESTIONS;
    let config = JSON.parse(localStorage.getItem('cmc_fest_config_v1') || 'null') || INITIAL_CONFIG;
    if (!config.swapButtonsMode) config.swapButtonsMode = 'every_card';

    let deck = [], idx = 0, lives = 3, score = 0, awaitingNext = false;
    let isButtonsSwapped = false;
    let dragStartX = 0, currentX = 0, isDragging = false;

    function syncUI() {
      document.getElementById('qCountLabel').textContent = questions.length;
      document.getElementById('boothSubtitle').textContent = config.boothName + ' · Ô Bingo #' + config.bingoCellNumber;
      const drawCount = Math.min(config.cardsPerRound, questions.length);
      document.getElementById('rulesSummaryLine').textContent =
        'Rút ' + drawCount + ' thẻ ngẫu nhiên · ' + config.maxLives + ' Mạng Bí Ngô 🎃 · Đúng tối thiểu ' + Math.min(config.minCorrectToWin, drawCount) + '/' + drawCount + ' câu';
    }

    function showView(v) {
      ['title', 'play', 'result'].forEach(id => {
        document.getElementById('view-' + id).classList.toggle('hidden', id !== v);
      });
      syncUI();
    }

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function startNewRound() {
      const count = Math.min(config.cardsPerRound, questions.length);
      deck = shuffle(questions).slice(0, count);
      idx = 0; lives = config.maxLives; score = 0; awaitingNext = false;
      showView('play');
      renderCard();
    }

    function calculateIsSwapped(cardIndex) {
      const mode = config.swapButtonsMode || 'every_card';
      if (mode === 'never') return false;
      if (mode === 'every_card') return cardIndex % 2 === 1;
      if (mode === 'every_2') return Math.floor(cardIndex / 2) % 2 === 1;
      if (mode === 'every_3') return Math.floor(cardIndex / 3) % 2 === 1;
      if (mode === 'random') {
        // Deterministic pseudo-random per question index in round
        return (cardIndex * 7 + 3) % 5 === 0 || (cardIndex * 3 + 1) % 4 === 0;
      }
      return false;
    }

    function renderCard() {
      awaitingNext = false;
      isButtonsSwapped = calculateIsSwapped(idx);

      const cardEl = document.getElementById('activeCard');
      cardEl.classList.remove('hidden');
      cardEl.style.transform = 'translateX(0px) rotate(0deg)';
      document.getElementById('feedbackBox').classList.add('hidden');
      document.getElementById('swipeButtons').classList.remove('hidden');

      // Update Swap banner & buttons
      const banner = document.getElementById('swapAlertBanner');
      banner.classList.toggle('hidden', !isButtonsSwapped);

      const btnLeft = document.getElementById('btnLeft');
      const btnRight = document.getElementById('btnRight');
      const stampLeft = document.getElementById('stampLeft');
      const stampRight = document.getElementById('stampRight');

      stampLeft.style.opacity = 0;
      stampRight.style.opacity = 0;

      if (isButtonsSwapped) {
        btnLeft.className = 'pixel-btn btn-green';
        btnLeft.textContent = '👈 AN TOÀN (TREAT 🍬)';
        btnRight.className = 'pixel-btn btn-red';
        btnRight.textContent = 'LỪA ĐẢO (TRICK 👻) 👉';

        stampLeft.className = 'stamp stamp-left';
        stampLeft.style.borderColor = 'var(--green)';
        stampLeft.style.color = 'var(--green)';
        stampLeft.textContent = 'AN TOÀN!';

        stampRight.className = 'stamp stamp-right';
        stampRight.style.borderColor = 'var(--red)';
        stampRight.style.color = 'var(--red)';
        stampRight.textContent = 'LỪA ĐẢO!';
      } else {
        btnLeft.className = 'pixel-btn btn-red';
        btnLeft.textContent = '👈 LỪA ĐẢO (TRICK 👻)';
        btnRight.className = 'pixel-btn btn-green';
        btnRight.textContent = 'AN TOÀN (TREAT 🍬) 👉';

        stampLeft.className = 'stamp stamp-left';
        stampLeft.style.borderColor = 'var(--red)';
        stampLeft.style.color = 'var(--red)';
        stampLeft.textContent = 'LỪA ĐẢO!';

        stampRight.className = 'stamp stamp-right';
        stampRight.style.borderColor = 'var(--green)';
        stampRight.style.color = 'var(--green)';
        stampRight.textContent = 'AN TOÀN!';
      }

      const q = deck[idx];
      document.getElementById('hudProgress').textContent = (idx + 1) + '/' + deck.length;
      document.getElementById('hudScore').textContent = score;
      document.getElementById('hudTarget').textContent = Math.min(config.minCorrectToWin, deck.length);
      document.getElementById('hudLives').textContent = '🎃'.repeat(lives) + '🖤'.repeat(Math.max(0, config.maxLives - lives));

      document.getElementById('cardCategory').textContent = q.category;
      document.getElementById('cardNumber').textContent = '#' + q.id;
      document.getElementById('cardIcon').textContent = q.icon || '🎃';
      document.getElementById('cardSender').textContent = q.sender;
      document.getElementById('cardContent').textContent = q.content;
    }

    function handleLeftClick() {
      // If swapped, Left button is Safe (false), else Left button is Scam (true)
      handleChoice(!isButtonsSwapped);
    }

    function handleRightClick() {
      // If swapped, Right button is Scam (true), else Right button is Safe (false)
      handleChoice(isButtonsSwapped);
    }

    function handleChoice(choseScam) {
      if (awaitingNext || idx >= deck.length) return;
      awaitingNext = true;
      const q = deck[idx];
      const isCorrect = choseScam === Boolean(q.isScam);
      if (isCorrect) score++; else lives--;

      document.getElementById('hudScore').textContent = score;
      document.getElementById('hudLives').textContent = '🎃'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, config.maxLives - lives));
      document.getElementById('activeCard').classList.add('hidden');
      document.getElementById('swipeButtons').classList.add('hidden');

      const fb = document.getElementById('feedbackBox');
      fb.classList.remove('hidden');
      const hdr = document.getElementById('feedbackHeader');
      hdr.textContent = isCorrect ? '✅ CHÍNH XÁC! (+1 ĐIỂM)' : '💥 SAI RỒI! (-1 BÍ NGÔ 🎃)';
      hdr.style.color = isCorrect ? 'var(--green)' : 'var(--red)';
      document.getElementById('feedbackText').textContent = q.explanation;
    }

    function nextCard() {
      if (!awaitingNext) return;
      if (lives <= 0 || idx + 1 >= deck.length) {
        finishRound();
      } else {
        idx++;
        renderCard();
      }
    }

    function finishRound() {
      const req = Math.min(config.minCorrectToWin, deck.length);
      const won = lives > 0 && score >= req;
      showView('result');
      document.getElementById('resultIcon').textContent = won ? '🏆🎃' : '👻💀';
      const title = document.getElementById('resultTitle');
      title.textContent = won ? 'CHIẾN THẮNG! NHẬN STICKER!' : 'THẤT BẠI! THỬ LẠI NHÉ!';
      title.style.color = won ? 'var(--green)' : 'var(--red)';
      document.getElementById('resultSub').textContent =
        'Bạn trả lời đúng ' + score + '/' + deck.length + ' thẻ và còn ' + lives + ' mạng Bí Ngô.';
      const reward = document.getElementById('stickerRewardBox');
      reward.classList.toggle('hidden', !won);
      document.getElementById('resultStickerCode').textContent = config.stickerCode;
    }

    // Drag / Swipe events
    const cardEl = document.getElementById('activeCard');
    cardEl.addEventListener('pointerdown', e => {
      if (awaitingNext) return;
      isDragging = true; dragStartX = e.clientX; currentX = 0;
      cardEl.classList.add('dragging');
      cardEl.setPointerCapture(e.pointerId);
    });
    cardEl.addEventListener('pointermove', e => {
      if (!isDragging) return;
      currentX = e.clientX - dragStartX;
      cardEl.style.transform = 'translateX(' + currentX + 'px) rotate(' + (currentX * 0.06) + 'deg)';
      document.getElementById('stampLeft').style.opacity = currentX < -30 ? Math.min(1, Math.abs(currentX) / 110) : 0;
      document.getElementById('stampRight').style.opacity = currentX > 30 ? Math.min(1, currentX / 110) : 0;
    });
    cardEl.addEventListener('pointerup', () => {
      if (!isDragging) return;
      isDragging = false;
      cardEl.classList.remove('dragging');
      if (currentX < -95) {
        // Dragged Left -> activates Left button
        handleLeftClick();
      } else if (currentX > 95) {
        // Dragged Right -> activates Right button
        handleRightClick();
      } else {
        cardEl.style.transform = 'translateX(0px) rotate(0deg)';
        document.getElementById('stampLeft').style.opacity = 0;
        document.getElementById('stampRight').style.opacity = 0;
      }
    });

    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key.toLowerCase() === 'p') toggleAdminModal(true);
      if (e.key === 'Escape') toggleAdminModal(false);
      if (!document.getElementById('view-play').classList.contains('hidden')) {
        if (!awaitingNext && e.key === 'ArrowLeft') handleLeftClick();
        if (!awaitingNext && e.key === 'ArrowRight') handleRightClick();
        if (awaitingNext && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nextCard(); }
      }
    });

    function toggleAdminModal(open) {
      const m = document.getElementById('adminModal');
      m.classList.toggle('open', open);
      if (open) {
        document.getElementById('cfgBoothName').value = config.boothName;
        document.getElementById('cfgCardsPerRound').value = config.cardsPerRound;
        document.getElementById('cfgMaxLives').value = config.maxLives;
        document.getElementById('cfgMinCorrect').value = config.minCorrectToWin;
        document.getElementById('cfgSwapMode').value = config.swapButtonsMode || 'every_card';
        document.getElementById('jsonInput').value = JSON.stringify(questions, null, 2);
        document.getElementById('adminMsg').textContent = '';
      }
    }

    function saveAdminChanges(append) {
      try {
        const parsed = JSON.parse(document.getElementById('jsonInput').value);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('JSON phải là mảng chứa ít nhất 1 câu hỏi!');
        questions = append ? [...questions, ...parsed] : parsed;
        config.boothName = document.getElementById('cfgBoothName').value || config.boothName;
        config.cardsPerRound = Math.max(1, parseInt(document.getElementById('cfgCardsPerRound').value) || 10);
        config.maxLives = Math.max(1, parseInt(document.getElementById('cfgMaxLives').value) || 3);
        config.minCorrectToWin = Math.max(1, parseInt(document.getElementById('cfgMinCorrect').value) || 7);
        config.swapButtonsMode = document.getElementById('cfgSwapMode').value || 'every_card';
        localStorage.setItem('cmc_fest_questions_v1', JSON.stringify(questions));
        localStorage.setItem('cmc_fest_config_v1', JSON.stringify(config));
        document.getElementById('jsonInput').value = JSON.stringify(questions, null, 2);
        document.getElementById('adminMsg').textContent = '✅ Đã lưu thành công (' + questions.length + ' câu hỏi)!';
        syncUI();
      } catch (err) {
        document.getElementById('adminMsg').textContent = '❌ Lỗi JSON: ' + err.message;
      }
    }

    function exportJsonFile() {
      const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'cmc-fest-questions.json'; a.click();
      URL.revokeObjectURL(url);
    }

    syncUI();
  </script>
</body>
</html>`;
}

export function downloadStandaloneHtmlFile(questions: QuestionCard[], config: BoothConfig) {
  const htmlContent = generateStandaloneHtml(questions, config);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'CMC_FEST_3110_TRICK_OR_CLICK_SINGLE_FILE.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
