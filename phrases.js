// Tất cả câu mà app đọc to. Dùng chung cho trình duyệt và cho script tạo file giọng (tools/).
// Sửa/thêm câu ở đây xong thì chạy: tools\tao_giong.bat để tạo file mp3 mới.
(function (root) {
  "use strict";

  const THINGS = [
    { e: "🍎", n: "quả táo", unit: "quả", go: "Ăn mất" },
    { e: "🍌", n: "quả chuối", unit: "quả", go: "Ăn mất" },
    { e: "🍓", n: "quả dâu", unit: "quả", go: "Ăn mất" },
    { e: "🍭", n: "cây kẹo", unit: "cây", go: "Ăn mất" },
    { e: "🐟", n: "con cá", unit: "con", go: "Bơi đi" },
    { e: "🐥", n: "con gà con", unit: "con", go: "Chạy đi" },
    { e: "🐱", n: "con mèo", unit: "con", go: "Chạy đi" },
    { e: "🐶", n: "con chó", unit: "con", go: "Chạy đi" },
    { e: "🦋", n: "con bướm", unit: "con", go: "Bay đi" },
    { e: "🌸", n: "bông hoa", unit: "bông", go: "Hái mất" },
    { e: "🎈", n: "quả bóng bay", unit: "quả", go: "Bay đi" },
    { e: "🚗", n: "chiếc ô tô", unit: "chiếc", go: "Chạy đi" },
  ];

  const SHAPES = [
    { id: "circle", n: "hình tròn" },
    { id: "square", n: "hình vuông" },
    { id: "triangle", n: "hình tam giác" },
    { id: "rect", n: "hình chữ nhật" },
    { id: "star", n: "hình ngôi sao" },
    { id: "heart", n: "hình trái tim" },
    { id: "diamond", n: "hình thoi" },
    { id: "oval", n: "hình bầu dục" },
  ];

  // Hành trình: mỗi chặng mở khi bé tích đủ sao, tặng một bạn đồng hành mới.
  const MAP = [
    { need: 0, place: "Nhà Gấu", bg: "🏡", friend: { id: "bear", e: "🐻", n: "Gấu Bông" } },
    { need: 5, place: "Đồi Cà Rốt", bg: "🥕", friend: { id: "bunny", e: "🐰", n: "Thỏ Ngọc" } },
    { need: 12, place: "Rừng Thông", bg: "🌲", friend: { id: "fox", e: "🦊", n: "Cáo Nhỏ" } },
    { need: 20, place: "Rừng Tre", bg: "🎋", friend: { id: "panda", e: "🐼", n: "Gấu Trúc" } },
    { need: 30, place: "Biển Băng", bg: "🧊", friend: { id: "penguin", e: "🐧", n: "Chim Cánh Cụt" } },
    { need: 42, place: "Đồng Cỏ", bg: "🌾", friend: { id: "lion", e: "🦁", n: "Sư Tử" } },
    { need: 55, place: "Biển Xanh", bg: "🌊", friend: { id: "dolphin", e: "🐬", n: "Cá Heo" } },
    { need: 70, place: "Cầu Vồng", bg: "🌈", friend: { id: "unicorn", e: "🦄", n: "Kỳ Lân" } },
    { need: 90, place: "Núi Lửa", bg: "🌋", friend: { id: "dragon", e: "🐲", n: "Rồng Con" } },
    { need: 120, place: "Mặt Trăng", bg: "🌙", friend: { id: "alien", e: "👽", n: "Bạn Ngoài Hành Tinh" } },
  ];

  const GAME_NAMES = {
    count: "Đếm số", find: "Tìm số", more: "Nhiều hay ít", add: "Phép cộng", sub: "Phép trừ",
    trace: "Tập tô số", shapes: "Hình học", pattern: "Quy luật", clock: "Xem đồng hồ", money: "Đếm tiền",
  };

  const P = {
    num: (n) => String(n),
    count: (t) => `Có mấy ${t.n}?`,
    find: (n, t) => `Nhóm nào có ${n} ${t.n}?`,
    more: (t) => `Bên nào nhiều ${t.n} hơn?`,
    less: (t) => `Bên nào ít ${t.n} hơn?`,
    add: (a, b) => `${a} cộng ${b} bằng mấy?`,
    sub: (a, b) => `${a} trừ ${b} còn mấy?`,
    trace: (n) => `Bé hãy tô số ${n} nhé!`,
    shapeFind: (s) => `Đâu là ${s.n}?`,
    shapeCount: (s) => `Có mấy ${s.n}?`,
    pattern: () => "Tiếp theo là gì nhỉ?",
    patternNum: () => "Số tiếp theo là số mấy?",
    clock: () => "Đồng hồ chỉ mấy giờ?",
    time: (h, half) => (half ? `${h} giờ rưỡi` : `${h} giờ`),
    money: () => "Có tất cả bao nhiêu tiền?",
    moneyVal: (k) => `${k} nghìn đồng`,
    unlock: (m) => `Bé đã đến ${m.place}! Bé có bạn mới là ${m.friend.n}!`,
  };

  const T = {
    welcome: "Chào bé! Hôm nay mình học gì nào?",
    praise: ["Giỏi quá!", "Đúng rồi!", "Tuyệt vời!", "Hay lắm!", "Bé giỏi quá!", "Xuất sắc!"],
    okAfterRetry: "Đúng rồi!",
    wrong: ["Chưa đúng rồi, bé thử lại nhé!", "Ồ, chưa đúng. Thử lại nào!", "Gần đúng rồi, cố lên!"],
    hintCount: "Mình cùng đếm nhé!",
    hintLook: "Bé nhìn kỹ lại nhé!",
    traceOk: "Tô đẹp quá!",
    traceBad: "Bé tô theo nét số nhé, thử lại nào!",
    levelUp: "Bé lên cấp rồi! Câu hỏi sẽ khó hơn một chút nhé!",
    result: [
      "Mình chơi lại nhé, lần sau bé sẽ giỏi hơn!",
      "Cố lên nhé! Bé được một ngôi sao!",
      "Giỏi lắm! Bé được hai ngôi sao!",
      "Siêu giỏi! Bé được ba ngôi sao!",
    ],
    shopOk: "Bé đã có sticker mới!",
    shopNeed: "Bé cần thêm ngôi sao nữa nhé!",
    guide: "Bạn ấy sẽ đi cùng bé!",
  };

  // Tên file giọng = mã băm của câu (giống nhau ở trình duyệt và Node)
  function hash(s) {
    const b = new TextEncoder().encode(String(s).normalize("NFC"));
    let h = 0x811c9dc5;
    for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  }

  function allPhrases() {
    const out = new Set();
    const add = (s) => out.add(s);
    for (let n = 0; n <= 30; n++) add(P.num(n));
    for (const t of THINGS) {
      add(P.count(t)); add(P.more(t)); add(P.less(t));
      for (let n = 1; n <= 20; n++) add(P.find(n, t));
    }
    for (let a = 1; a <= 20; a++) for (let b = 1; a + b <= 20; b++) add(P.add(a, b));
    for (let a = 2; a <= 20; a++) for (let b = 1; b < a; b++) add(P.sub(a, b));
    for (let n = 0; n <= 20; n++) add(P.trace(n));
    for (const s of SHAPES) { add(P.shapeFind(s)); add(P.shapeCount(s)); add(s.n); }
    add(P.pattern()); add(P.patternNum()); add(P.clock()); add(P.money());
    for (let h = 1; h <= 12; h++) { add(P.time(h, false)); add(P.time(h, true)); }
    for (let k = 1; k <= 20; k++) add(P.moneyVal(k));
    for (const m of MAP) add(P.unlock(m));
    for (const v of Object.values(GAME_NAMES)) add(v);
    for (const v of Object.values(T)) (Array.isArray(v) ? v : [v]).forEach(add);
    return [...out];
  }

  const PH = { THINGS, SHAPES, MAP, GAME_NAMES, P, T, hash, allPhrases };
  root.PH = PH;
  if (typeof module !== "undefined" && module.exports) module.exports = PH;
})(typeof window !== "undefined" ? window : globalThis);
