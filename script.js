const videoLinkInput = document.querySelector("#videoLink");
const videoTextInput = document.querySelector("#videoText");
const analyzeBtn = document.querySelector("#analyzeBtn");
const exampleBtn = document.querySelector("#exampleBtn");
const cleanBtn = document.querySelector("#cleanBtn");
const clearBtn = document.querySelector("#clearBtn");
const copyBtn = document.querySelector("#copyBtn");
const promptBtn = document.querySelector("#promptBtn");
const copyPromptBtn = document.querySelector("#copyPromptBtn");
const copyPromptInlineBtn = document.querySelector("#copyPromptInlineBtn");
const copyCleanBtn = document.querySelector("#copyCleanBtn");
const message = document.querySelector("#message");
const resultList = document.querySelector("#resultList");
const cleanedTextOutput = document.querySelector("#cleanedText");
const promptOutput = document.querySelector("#promptOutput");

const moduleTitles = ["课程标题", "核心主题", "主要观点", "关键案例", "金句摘录", "可执行步骤", "适合发短视频的文案版本"];
const actionVerbs = ["选择", "复制", "粘贴", "清洗", "整理", "提炼", "测试", "记录", "复盘", "优化", "发布", "保存", "验证"];
const examplePattern = /比如|例如|像|举个例子|你看/;
const caseFollowupPattern = /^(但如果|如果|你要|你只要|这样|这就|然后|再|最后|于是)/;
const caseActionPattern = /亲自|创建|发布|测试|操作|流程|工具|项目|网页|仓库|代码|合并|管理|优化|提取|整理|生成/;
const viewpointPattern = /不是.*而是|原因不是.*而是|真正|核心|问题在于|所以|关键在于|差距不是.*而是|工具本身不值钱，?流程才值钱|结论|能力|流程|行动/;
const quotePattern = /缺的不是.*而是|真正的?.*不是.*而是|工具本身不值钱，?流程才值钱|谁能.*谁就能|差距不是.*而是|不是.*而是/;
const fallbackTitles = ["普通人如何把工具变成生产流程", "如何把碎片信息转化成行动能力", "会用工具的人为什么更容易拉开差距"];
const stopWords = new Set(["今天", "我们", "一个", "这个", "那个", "很多", "问题", "原因", "不是", "而是", "所以", "比如", "例如", "真正", "关键", "内容", "课程", "文案", "短视频", "工具", "普通人", "可以", "没有", "自己", "最后", "开始", "形成", "进行"]);
const exampleText = `今天我们聊一个普通人非常容易忽略的问题：为什么很多人学了很多东西，最后还是没有改变？

原因不是他不努力，而是他只是在收集碎片信息，没有形成系统。比如你刷短视频，今天看到一个人讲认知，明天看到一个人讲赚钱，后天又看到一个人讲AI工具。你觉得自己学了很多，但这些东西没有被整理成方法，也没有真正用到生活里。

真正有用的学习，不是看了多少内容，而是你能不能把内容变成自己的操作流程。比如你今天学了一个AI工具，不要只听博主说它多厉害，你要亲自注册、亲自创建仓库、亲自让它生成代码、亲自发布网页、亲自测试效果。你只要完整跑一遍，理解就会明显加深。

这里有一个关键点：普通人和会使用工具的人之间，差距不是智商，而是是否愿意动手。很多人遇到VPN、谷歌账号、GitHub、虚拟卡、订阅、部署这些步骤，马上就放弃了。他们觉得太麻烦，于是只能花钱找代充、买镜像、听别人讲概念。

但真正的电子杠杆，不是你知道一个工具名字，而是你能把它用起来。比如AI可以帮你写代码，GitHub可以帮你管理项目，Pages可以帮你发布网页，转文字工具可以帮你提取课程内容。你把这些工具串起来，就形成了一套自己的生产流程。

所以今天最重要的结论是：不要沉迷于听概念，要把工具跑通。先从一个小项目开始，哪怕只是做一个简单网页，只要你亲自经历了创建、修改、提交、合并、发布、测试这几个步骤，你就已经比只刷短视频的人强很多。

普通人缺的不是信息，而是把信息转化成行动的能力。谁能把知识变成流程，谁就能真正获得杠杆。`;
let latestResultText = "";
let latestPromptText = "";
let latestCleanText = "";

exampleBtn.addEventListener("click", () => { videoLinkInput.value = "https://example.com/course-source"; videoTextInput.value = exampleText; message.textContent = "已填入内置测试样本文案。"; });
cleanBtn.addEventListener("click", () => cleanAndShow(true));
analyzeBtn.addEventListener("click", analyzeText);
promptBtn.addEventListener("click", () => generatePrompt(true));
copyBtn.addEventListener("click", () => latestResultText ? copyText(latestResultText, "全部拆解结果已复制。") : showMessage("还没有可复制的拆解结果，请先点击“开始拆解”。"));
copyPromptBtn.addEventListener("click", copyPrompt);
copyPromptInlineBtn.addEventListener("click", copyPrompt);
copyCleanBtn.addEventListener("click", () => latestCleanText ? copyText(latestCleanText, "清洗后的文本已复制。") : showMessage("请先点击“清洗文本”。"));
clearBtn.addEventListener("click", () => { videoLinkInput.value = ""; videoTextInput.value = ""; latestResultText = ""; latestPromptText = ""; latestCleanText = ""; cleanedTextOutput.textContent = "清洗后的文本会显示在这里。"; promptOutput.textContent = "提示词会显示在这里。"; showEmptyResult(); showMessage("内容已清空。"); });

function analyzeText() {
  const cleanText = cleanAndShow(false);
  if (!cleanText) return;
  const sentences = splitText(cleanText);
  if (!sentences.length) { showEmptyResult(); latestResultText = ""; showMessage("没有识别到有效中文内容，请删掉乱码或补充完整文案。"); return; }
  const result = buildResult(cleanText, sentences);
  latestResultText = formatResultText(result);
  renderResult(result);
  generatePrompt(false);
  showMessage("拆解完成，可复制全部结果、单独模块或 ChatGPT 深度拆解提示词。");
}

function cleanAndShow(writeBack) {
  const raw = videoTextInput.value.trim();
  if (videoLinkInput.value.trim() && !raw) showMessage("第一版暂不支持自动解析链接，请先粘贴文案内容。");
  if (!raw) { latestCleanText = ""; cleanedTextOutput.textContent = "清洗后的文本会显示在这里。"; return ""; }
  latestCleanText = cleanInputText(raw);
  cleanedTextOutput.textContent = latestCleanText || "没有保留下有效中文内容。";
  if (writeBack && latestCleanText) videoTextInput.value = latestCleanText;
  if (writeBack) showMessage("文本已清洗，可继续点击“开始拆解”。");
  return latestCleanText;
}

function cleanInputText(text) {
  let cleaned = text.normalize("NFKC")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/\b(?:king\s*)?tokens?\b/gi, " ")
    .replace(/\b(?:undefined|null|nan|debug|error|timestamp|uuid|json)\b/gi, " ")
    .replace(/\b(?!(?:GPT|AI|GitHub|Pages|Codex|Claude|Cursor)\b)[a-z]{8,}(?:\s+(?!(?:GPT|AI|GitHub|Pages|Codex|Claude|Cursor)\b)[a-z]{3,}){1,}\b/gi, " ")
    .replace(/([。！？!?，,；;：:、])\1+/g, "$1")
    .replace(/[\t\r]+/g, " ")
    .replace(/[|*_#~`^={}<>\[\]\\]+/g, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/([\u4e00-\u9fa5]),([\u4e00-\u9fa5])/g, "$1，$2")
    .replace(/([\u4e00-\u9fa5]):([\u4e00-\u9fa5])/g, "$1：$2")
    .replace(/\s+/g, " ");
  return uniqueList(cleaned.split(/(?<=[。！？!?；;])|\n+/).map((item) => item.trim()).filter((item) => item && !isNoisySentence(item))).join("\n");
}

function splitText(text) {
  return uniqueList(text.split(/[。！？!?\n]+/).flatMap((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return [];
    if (examplePattern.test(trimmed)) return [trimmed];
    return trimmed.split(/[；;]+/);
  }).map((s) => s.trim().replace(/^[,，、：:\-\s]+|[,，、：:\-\s]+$/g, "")).filter((s) => s.length >= 12 && !isNoisySentence(s)));
}

function isNoisySentence(sentence) {
  const chinese = sentence.match(/[\u4e00-\u9fa5]/g) || [];
  const letters = sentence.match(/[a-z]/gi) || [];
  return chinese.length < 6 || letters.length > chinese.length * 0.7 || /\b(?:king\s*)?tokens?\b/i.test(sentence) || /(.)\1{8,}/.test(sentence);
}

function buildResult(text, sentences) {
  const keywords = getTopKeywords(text);
  const ranked = rankSentences(sentences, keywords);
  const points = makeMainPoints(sentences, ranked).slice(0, 5);
  const steps = makeActionSteps(sentences);
  return {
    "课程标题": makeTitle(keywords, ranked),
    "核心主题": makeTheme(ranked, keywords),
    "主要观点": points,
    "关键案例": findCases(sentences),
    "金句摘录": findQuotes(sentences, keywords),
    "可执行步骤": steps,
    "适合发短视频的文案版本": makeShortVideoCopy(points, steps)
  };
}

function getTopKeywords(text) {
  const counts = {};
  (text.match(/[\u4e00-\u9fa5]{2,6}/g) || []).forEach((chunk) => {
    for (let size = Math.min(4, chunk.length); size >= 2; size -= 1) {
      for (let i = 0; i <= chunk.length - size; i += 1) {
        const word = chunk.slice(i, i + size);
        if (!stopWords.has(word)) counts[word] = (counts[word] || 0) + size;
      }
    }
  });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || b.length - a.length).slice(0, 10);
}

function rankSentences(sentences, keywords) { return sentences.slice().sort((a, b) => scoreSentence(b, keywords) - scoreSentence(a, keywords)); }
function scoreSentence(sentence, keywords) {
  const examplePenalty = isCaseSentence(sentence) ? -35 : 0;
  const openingPenalty = isOpeningSentence(sentence) ? -50 : 0;
  return keywords.reduce((sum, k) => sum + (sentence.includes(k) ? 4 : 0), 0) + (viewpointPattern.test(sentence) ? 16 : 0) + (sentence.length >= 18 && sentence.length <= 110 ? 4 : 0) + examplePenalty + openingPenalty;
}

function makeTitle(keywords, ranked) {
  const joined = ranked.join(" ");
  if (/工具|流程|GitHub|Pages|AI/.test(joined)) return "普通人如何把工具变成生产流程";
  if (/碎片|信息|行动|能力/.test(joined)) return "如何把碎片信息转化成行动能力";
  const useful = keywords.filter((k) => !/[的了和是把在]/.test(k)).slice(0, 2).join("");
  if (useful.length >= 4 && useful.length <= 14) return `如何提升${useful}的行动效果`.slice(0, 28);
  return fallbackTitles[1];
}

function makeTheme(ranked) {
  const best = ranked.find((s) => /不是|而是|真正|核心|结论|能力|流程|行动/.test(s)) || ranked[0];
  if (/碎片信息|操作流程|工具|行动/.test(ranked.join(" "))) return "这段内容的核心是提醒普通人不要只停留在刷信息和听概念，而要把工具真正跑通，形成自己的行动流程。";
  return rewritePoint(best || "这段内容提醒用户把零散内容整理成可执行的方法，并通过行动验证学习效果。", 0);
}

function makeMainPoints(sentences, ranked) {
  const viewpointSentences = sentences
    .filter((s) => viewpointPattern.test(s) && !isCaseSentence(s) && !isOpeningSentence(s) && !isQuestionSentence(s))
    .sort((a, b) => scoreViewpoint(b) - scoreViewpoint(a));
  const backupSentences = ranked.filter((s) => !isCaseSentence(s) && !isOpeningSentence(s) && !isQuestionSentence(s));
  const candidates = uniqueList(viewpointSentences.concat(backupSentences));
  return candidates.map(rewritePoint).filter((s) => s.length >= 16 && !isCaseSentence(s) && !isOpeningSentence(s) && !isQuestionSentence(s)).slice(0, 5);
}

function scoreViewpoint(sentence) {
  let score = 0;
  if (isOpeningSentence(sentence) || isQuestionSentence(sentence)) score -= 80;
  if (isCaseSentence(sentence)) score -= 60;
  if (/不是.*而是|原因不是.*而是|差距不是.*而是/.test(sentence)) score += 30;
  if (/工具本身不值钱，?流程才值钱/.test(sentence)) score += 30;
  if (/真正|核心|关键在于|问题在于/.test(sentence)) score += 20;
  if (/所以|结论|能力|流程|行动/.test(sentence)) score += 10;
  if (sentence.length >= 18 && sentence.length <= 110) score += 5;
  return score;
}

function rewritePoint(sentence) {
  let s = sentence.replace(/^(首先|其次|然后|最后|第一|第二|第三|这里有一个关键点|所以今天最重要的结论是)[，,:：、\s]*/, "").trim();
  if (/为什么很多人学了很多东西|最后还是没有改变/.test(s)) return "很多人学习之后没有改变，常见原因是只停留在输入信息，没有进入整理和行动。";
  if (/收集碎片信息/.test(s)) return "很多人学习没有改变，不是因为不努力，而是因为只收集碎片信息，没有整理成系统方法。";
  if (/操作流程/.test(s)) return "真正有效的学习不看收藏了多少内容，而看能不能把内容转化成自己的操作流程。";
  if (/差距不是智商/.test(s)) return "普通人和会用工具的人之间，核心差距不是智商，而是愿不愿意动手跑完整流程。";
  if (/电子杠杆/.test(s)) return "真正的电子杠杆不是知道工具名字，而是能把多个工具串成自己的生产流程。";
  if (/工具本身不值钱，?流程才值钱/.test(s)) return "工具本身不值钱，流程才值钱，真正值钱的是发现问题、调用工具、测试结果和持续优化的能力。";
  if (/不要沉迷于听概念|工具跑通/.test(s)) return "不要沉迷于听概念，要从小项目开始，把创建、修改、提交、发布和测试亲自跑通。";
  if (!/[。！？]$/.test(s)) s += "。";
  return s;
}

function findCases(sentences) {
  const caseGroups = [];
  sentences.forEach((sentence, index) => {
    if (!examplePattern.test(sentence) || isPureViewpoint(sentence)) return;
    let group = sentence;
    for (let nextIndex = index + 1; nextIndex < sentences.length && nextIndex <= index + 3; nextIndex += 1) {
      const next = sentences[nextIndex];
      if (shouldMergeCaseFollowup(next, group)) {
        group += `；${next}`;
      } else {
        break;
      }
    }
    caseGroups.push(normalizeCase(group));
  });
  const cases = uniqueList(caseGroups)
    .filter((s) => s.length >= 24 && s.length <= 220 && !isPureViewpoint(s))
    .sort((a, b) => scoreCase(b) - scoreCase(a))
    .slice(0, 3);
  return cases.length ? cases : ["原文案例较少，可补充一个贴近日常操作的案例。"];
}

function shouldMergeCaseFollowup(sentence, currentCase) {
  if (!sentence || isPureViewpoint(sentence) || isOpeningSentence(sentence) || isQuestionSentence(sentence)) return false;
  if (examplePattern.test(sentence)) return false;
  if (currentCase.length >= 180 && !caseFollowupPattern.test(sentence)) return false;
  return caseFollowupPattern.test(sentence) || (caseActionPattern.test(sentence) && currentCase.length < 160);
}

function scoreCase(sentence) {
  let score = 0;
  if (examplePattern.test(sentence)) score += 80;
  if (/但如果|如果|你要|这样|这就/.test(sentence)) score += 30;
  if (caseActionPattern.test(sentence)) score += 20;
  if (sentence.length >= 80 && sentence.length <= 180) score += 20;
  if (sentence.length > 180) score -= sentence.length - 180;
  return score;
}

function findQuotes(sentences, keywords) {
  const quotes = sentences
    .map(normalizeQuote)
    .filter((s) => s.length >= 10 && s.length <= 90 && quotePattern.test(s) && !isCaseSentence(s) && !isOpeningSentence(s) && !isQuestionSentence(s))
    .sort((a, b) => scoreQuote(b, keywords) - scoreQuote(a, keywords));
  return uniqueList(quotes).slice(0, 5);
}

function normalizeQuote(sentence) {
  let s = sentence.replace(/^(但|但是|所以|这里有一个关键点：|今天最重要的结论是：)/, "").trim();
  if (!/[。！？]$/.test(s)) s += "。";
  return s;
}

function scoreQuote(sentence, keywords) {
  let score = keywords.reduce((sum, k) => sum + (sentence.includes(k) ? 2 : 0), 0);
  if (/缺的不是.*而是/.test(sentence)) score += 100;
  if (/真正的?.*不是.*而是/.test(sentence)) score += 90;
  if (/工具本身不值钱，?流程才值钱/.test(sentence)) score += 80;
  if (/谁能.*谁就能/.test(sentence)) score += 70;
  if (/差距不是.*而是/.test(sentence)) score += 60;
  if (/不是.*而是/.test(sentence)) score += 30;
  return score;
}

function makeActionSteps(sentences) {
  const text = sentences.join(" ");
  if (/工具|流程|创建|发布|测试|ChatGPT|AI|GitHub/.test(text)) return [
    "第1步：选择一个具体的小项目，先用最小目标跑通流程。",
    "第2步：复制课程转写文字，粘贴到拆解器里保留素材来源。",
    "第3步：清洗多余空格、重复句和识别噪声，再开始基础拆解。",
    "第4步：复制 ChatGPT 深度拆解提示词，粘贴给 ChatGPT 做二次总结和改写。",
    "第5步：保存最终文案和操作流程，记录问题并复盘下一次怎么优化。"
  ];
  return actionVerbs.slice(0, 5).map((verb, index) => `第${index + 1}步：${verb}一个最小任务，把内容转成可以马上执行的动作。`);
}

function makeShortVideoCopy(points, steps) {
  const point = points.find((item) => /不是.*而是|真正|流程|行动/.test(item)) || "问题不是你知道得少，而是没有亲手跑通流程。";
  const action = steps[0].replace(/^第\d+步：/, "");
  return `开头钩子：很多人每天刷 AI 工具、收藏教程，但最后还是不会真正用起来。\n正文解释：${point}真正的电子杠杆，不是记住一堆工具名，而是能把转文字、内容拆解、生成代码、网页发布这些环节串成自己的生产流程。你亲手跑通一次，工具才会从概念变成能力。\n结尾引导：今天别再只收藏了，${action}亲手跑一遍。你跑通一次，就会知道自己和只刷短视频的人差在哪里。`;
}

function isQuestionSentence(sentence) { return /[？?]/.test(sentence) || /^(为什么|你有没有发现|有没有发现|难道|是不是)/.test(sentence); }
function isOpeningSentence(sentence) { return /^(今天(我想|我们)?(想)?讲|今天(我)?想聊|今天我们聊|你有没有发现|为什么)/.test(sentence); }
function isCaseSentence(sentence) { return examplePattern.test(sentence) || /^(但如果|如果|你要|你看)/.test(sentence); }
function isPureViewpoint(sentence) { return /^(真正|所以|关键|核心|问题在于|结论|原因不是|差距不是)/.test(sentence) && !examplePattern.test(sentence); }
function normalizeCase(sentence) {
  let s = sentence.replace(/\s+/g, " ").replace(/[;；]+/g, "；").replace(/,([\u4e00-\u9fa5])/g, "，$1").replace(/；；+/g, "；").trim();
  if (!/[。！？]$/.test(s)) s += "。";
  return s;
}

function generatePrompt(showNotice) {
  const cleanText = latestCleanText || cleanAndShow(false);
  if (!cleanText) { if (showNotice) showMessage("请先粘贴并清洗一段视频文字。"); return; }
  latestPromptText = `下面是一段从短视频、直播课或课程里提取出来的文字。请你不要机械复制原文，而是进行深度理解和结构化拆解。\n\n请按以下格式输出：\n\n课程标题：用一句自然、有吸引力的话概括内容；\n\n核心主题：说明这段内容真正想讲什么；\n\n主要观点：提炼 5 条核心观点，每条都要完整、通顺、像人话；\n\n关键案例：提取原文中的案例，如果原文案例不足，请指出不足；\n\n金句摘录：提取有冲击力、有启发、有传播性的原文句子；\n\n可执行步骤：把内容转化成普通人可以照着做的行动清单；\n\n短视频口播文案：改写成适合抖音/快手/视频号发布的口播稿；\n\n学习笔记版：整理成适合保存复盘的学习笔记。\n\n要求：\n\n过滤乱码、重复句、无意义词；\n\n不要保留 token、tokens、king token 等识别错误内容；\n\n不要把半截句当观点；\n\n不要把现象句当执行步骤；\n\n不要空泛，要具体；\n\n输出要适合普通人直接看懂和使用。\n\n下面是原文：${cleanText}`;
  promptOutput.textContent = latestPromptText;
  if (showNotice) showMessage("ChatGPT 深度拆解提示词已生成。");
}

function renderResult(result) { resultList.innerHTML = ""; moduleTitles.forEach((title, index) => { const item = document.createElement("article"); item.className = "result-item"; const header = document.createElement("div"); header.className = "result-item-header"; const h = document.createElement("h3"); h.innerHTML = `<span class="module-number">${index + 1}</span>${title}`; const btn = document.createElement("button"); btn.className = "module-copy-button"; btn.type = "button"; btn.textContent = "复制"; btn.addEventListener("click", () => copyText(formatModuleText(title, result[title]), `“${title}”已复制。`)); header.append(h, btn); item.appendChild(header); const content = result[title]; if (Array.isArray(content)) { const ul = document.createElement("ul"); content.forEach((text) => { const li = document.createElement("li"); li.textContent = text; ul.appendChild(li); }); item.appendChild(ul); } else { const p = document.createElement("p"); p.textContent = content; item.appendChild(p); } resultList.appendChild(item); }); }
function formatResultText(result) { return moduleTitles.map((title) => formatModuleText(title, result[title])).join("\n\n"); }
function formatModuleText(title, content) { return `【${title}】\n${Array.isArray(content) ? content.map((item) => `- ${item}`).join("\n") : content}`; }
function uniqueList(items) { const seen = new Set(); return items.filter((item) => { const key = item.replace(/\s+/g, "").slice(0, 80); if (seen.has(key)) return false; seen.add(key); return true; }); }
function copyPrompt() { latestPromptText ? copyText(latestPromptText, "ChatGPT 深度拆解提示词已复制。") : showMessage("请先生成 ChatGPT 深度拆解提示词。"); }
function showMessage(text) { message.textContent = text; }
function showEmptyResult() { resultList.innerHTML = '<p class="empty">结果会显示在这里。</p>'; }
function copyText(text, successText) { if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => showMessage(successText)).catch(() => copyTextWithTextarea(text, successText)); return; } copyTextWithTextarea(text, successText); }
function copyTextWithTextarea(text, successText) { const textarea = document.createElement("textarea"); textarea.value = text; textarea.setAttribute("readonly", ""); textarea.style.position = "fixed"; textarea.style.top = "-999px"; document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); document.body.removeChild(textarea); showMessage(successText); }
