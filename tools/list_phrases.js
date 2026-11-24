// Xuất danh sách câu cần đọc -> voice/list.json  (chạy bằng: node tools/list_phrases.js)
const fs = require("fs");
const path = require("path");
const PH = require("../phrases.js");

const list = PH.allPhrases().map((t) => ({ f: PH.hash(t) + ".mp3", t }));
const dir = path.join(__dirname, "..", "voice");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "list.json"), JSON.stringify(list, null, 0), "utf8");
console.log("phrases:", list.length);
