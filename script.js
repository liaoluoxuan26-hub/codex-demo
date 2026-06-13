const videoLinkInput = document.querySelector("#videoLink");
const videoTextInput = document.querySelector("#videoText");
const analyzeBtn = document.querySelector("#analyzeBtn");
const exampleBtn = document.querySelector("#exampleBtn");
const clearBtn = document.querySelector("#clearBtn");
const copyBtn = document.querySelector("#copyBtn");
const message = document.querySelector("#message");
const resultList = document.querySelector("#resultList");

const moduleTitles = [
  "课程标题",
  "核心主题",
  "主要观点",
  "关键案例",
  "金句摘录",
  "可执行步骤",
  "适合发短视频的文案版本"
];

const stopWords = [
  "我们", "你们", "他们", "这个", "那个", "一个", "就是", "然后", "所以", "因为", "如果", "但是", "其实", "什么", "怎么", "可以", "进行", "通过", "不要", "不是", "没有", "自己", "很多", "今天", "视频", "课程", "内容", "文案"
];

const exampleText = "很多人做知识类短视频，最大的问题不是不会讲，而是开头太慢。首先，你要在前三秒说出用户的痛点，比如学员想做课程却不知道怎么写文案。第二，把一个大主题拆成三个小观点：问题是什么、为什么会这样、马上能做什么。第三，用一个真实案例增强信任，例如有位学员把一节30分钟课程拆成5条短视频，完播率明显提升。记住，好的课程文案不是把内容讲完，而是让用户愿意继续听。最后，给用户一个简单行动：今天先把你的课程标题改成一个具体问题。";

let latestResultText = "";
let latestResult = null;

analyzeBtn.addEventListener("click", function () {
  const videoLink = videoLinkInput.value.trim();
  const videoText = videoTextInput.value.trim();

  message.textContent = "";

  if (videoLink && !videoText) {
    resetResultData();
    showEmptyResult();
    message.textContent = "第一版暂不支持自动解析链接，请先粘贴文案内容。";
    return;
  }

  if (!videoText) {
    resetResultData();
    showEmptyResult();
    message.textContent = "请先粘贴需要拆解的视频文字。";
    return;
  }

  const rawSentences = splitText(videoText);
  const sentences = filterSentences(rawSentences);

  if (!sentences.length) {
    resetResultData();
    showEmptyResult();
    message.textContent = "内容里可用的中文句子太少，已过滤乱码和重复内容，请换一段更完整的文案。";
    return;
  }

  latestResult = buildResult(sentences);
  latestResultText = formatResultText(latestResult);
  renderResult(latestResult);
  message.textContent = "已自动过滤乱码和重复内容，生成更干净的拆解结果。";
});

exampleBtn.addEventListener("click", function () {
  videoLinkInput.value = "https://example.com/demo-video";
  videoTextInput.value = exampleText;
  message.textContent = "已填入示例文案，可以点击“开始拆解”查看效果。";
  videoTextInput.focus();
});

clearBtn.addEventListener("click", function () {
  videoLinkInput.value = "";
  videoTextInput.value = "";
  resetResultData();
  message.textContent = "内容已清空。";
  showEmptyResult();
  videoLinkInput.focus();
});

copyBtn.addEventListener("click", function () {
  if (!latestResultText) {
    message.textContent = "还没有可复制的拆解结果，请先点击“开始拆解”。";
    return;
  }

  copyText(latestResultText, "全部拆解结果已复制。");
});

function resetResultData() {
  latestResult = null;
  latestResultText = "";
}

function splitText(text) {
  return text
    .replace(/[\t\r]+/g, " ")
    .replace(/([。！？!?；;])/g, "$1\n")
    .split(/\n+/)
    .map(function (sentence) {
      return cleanSentence(sentence);
    })
    .filter(Boolean);
}

function cleanSentence(sentence) {
  return sentence
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[▶◆●■★☆#@￥$%^&*_+=<>|~`\\/]{2,}/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[,，.。:：;；!！?？\-—\s]+|[,，:：;；\-—\s]+$/g, "")
    .trim();
}

function filterSentences(sentences) {
  const seen = [];

  return sentences.filter(function (sentence) {
    if (!isUsefulSentence(sentence)) {
      return false;
    }

    const fingerprint = makeFingerprint(sentence);
    const repeated = seen.some(function (item) {
      return item === fingerprint || getSimilarity(item, fingerprint) > 0.85;
    });

    if (repeated) {
      return false;
    }

    seen.push(fingerprint);
    return true;
  });
}

function isUsefulSentence(sentence) {
  const chineseChars = sentence.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseRatio = chineseChars.length / Math.max(sentence.length, 1);
  const repeatedChars = /(.)\1{5,}/.test(sentence);
  const tooShort = chineseChars.length < 8;
  const tooLong = sentence.length > 120;
  const mostlySymbols = chineseRatio < 0.45;

  return !tooShort && !tooLong && !mostlySymbols && !repeatedChars;
}

function makeFingerprint(sentence) {
  return sentence.replace(/[\s，。！？、,.!?；;：:”“"'‘’（）()《》【】\[\]]/g, "").slice(0, 48);
}

function getSimilarity(textA, textB) {
  const setA = new Set(textA);
  const setB = new Set(textB);
  let sameCount = 0;

  setA.forEach(function (char) {
    if (setB.has(char)) {
      sameCount += 1;
    }
  });

  return sameCount / Math.max(setA.size, setB.size, 1);
}

function buildResult(sentences) {
  const keywords = getTopKeywords(sentences);
  const coreSentence = pickCoreSentence(sentences, keywords);
  const points = pickMainPoints(sentences, keywords);
  const cases = pickCases(sentences);
  const quotes = pickGoldenSentences(sentences, keywords);
  const steps = makeActionSteps(points, keywords);

  return {
    "课程标题": makeTitle(coreSentence, keywords),
    "核心主题": summarizeTheme(coreSentence, keywords, points),
    "主要观点": points,
    "关键案例": cases,
    "金句摘录": quotes,
    "可执行步骤": steps,
    "适合发短视频的文案版本": makeShortVideoCopy(coreSentence, points, steps)
  };
}

function getTopKeywords(sentences) {
  const wordMap = {};

  sentences.forEach(function (sentence) {
    const chineseOnly = sentence.replace(/[^\u4e00-\u9fa5]/g, "");
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= chineseOnly.length - size; index += 1) {
        const word = chineseOnly.slice(index, index + size);
        if (stopWords.some(function (stopWord) { return word.includes(stopWord) || stopWord.includes(word); })) {
          continue;
        }
        wordMap[word] = (wordMap[word] || 0) + size;
      }
    }
  });

  return Object.keys(wordMap).sort(function (a, b) {
    return wordMap[b] - wordMap[a] || b.length - a.length;
  }).slice(0, 5);
}

function pickCoreSentence(sentences, keywords) {
  return sentences.slice().sort(function (a, b) {
    return scoreSentence(b, keywords) - scoreSentence(a, keywords);
  })[0];
}

function scoreSentence(sentence, keywords) {
  const keywordScore = keywords.reduce(function (total, keyword) {
    return total + (sentence.includes(keyword) ? 3 : 0);
  }, 0);
  const opinionScore = hasOpinionSignal(sentence) ? 4 : 0;
  const actionScore = /首先|第一|第二|第三|最后|方法|步骤|行动|建议|记住|要/.test(sentence) ? 2 : 0;
  const lengthScore = sentence.length >= 18 && sentence.length <= 70 ? 3 : 0;

  return keywordScore + opinionScore + actionScore + lengthScore;
}

function hasOpinionSignal(sentence) {
  return /关键|重点|核心|问题|痛点|方法|原因|本质|不是|而是|记住|真正|最好|必须|应该|只要|才能|价值|提升/.test(sentence);
}

function pickMainPoints(sentences, keywords) {
  const sorted = sentences.filter(function (sentence) {
    return sentence.length >= 12 && hasOpinionSignal(sentence);
  }).sort(function (a, b) {
    return scoreSentence(b, keywords) - scoreSentence(a, keywords);
  });

  const points = sorted.concat(sentences).filter(function (sentence, index, list) {
    return list.indexOf(sentence) === index;
  }).slice(0, 4);

  return points.length ? points : ["这段内容的观点不够集中，建议补充更完整的课程口播稿。"];
}

function pickCases(sentences) {
  const cases = sentences.filter(function (sentence) {
    return /比如|例如|案例|故事|客户|学员|用户|我见过|有位|曾经|数据|提升|下降|分钟|天/.test(sentence);
  }).slice(0, 3);

  return cases.length ? cases : ["原文中没有明显案例，建议补充一个真实学员、客户或业务场景。"];
}

function pickGoldenSentences(sentences, keywords) {
  const quotes = sentences.filter(function (sentence) {
    return sentence.length >= 14 && sentence.length <= 60 && hasOpinionSignal(sentence);
  }).sort(function (a, b) {
    return scoreGoldenSentence(b, keywords) - scoreGoldenSentence(a, keywords);
  }).slice(0, 3);

  return quotes.length ? quotes : [pickCoreSentence(sentences, keywords)];
}

function scoreGoldenSentence(sentence, keywords) {
  const contrastScore = /不是|而是|别|不要|却|但是|真正|本质/.test(sentence) ? 5 : 0;
  const insightScore = /记住|关键|核心|最好|必须|应该|只要|才能|价值/.test(sentence) ? 4 : 0;
  return scoreSentence(sentence, keywords) + contrastScore + insightScore;
}

function makeActionSteps(points, keywords) {
  const topic = keywords[0] || "这段课程内容";
  const firstPoint = points[0] || "先找到用户最关心的问题";
  const secondPoint = points[1] || "再把观点拆成几个小重点";

  return [
    "先写下目标用户现在最卡的一个问题，围绕“" + topic + "”收窄主题。",
    "把课程内容拆成3个要点：问题、原因、解决方法，避免一次讲太多。",
    "从原文里挑1个案例或数据，说明方法真的能带来变化。",
    "提炼1句最有冲突感的金句，放在开头或结尾强化记忆。",
    "按照“痛点开场—观点解释—案例证明—行动引导”重写成短视频口播稿。"
  ].map(function (step, index) {
    if (index === 1 && firstPoint !== secondPoint) {
      return step + " 参考观点：" + firstPoint;
    }
    return step;
  });
}

function makeTitle(coreSentence, keywords) {
  const topic = keywords[0] || extractShortPhrase(coreSentence) || "课程内容";
  const pain = findPainPhrase(coreSentence);

  if (pain) {
    return "解决“" + pain + "”：" + topic + "的短视频表达方法";
  }

  return "把“" + topic + "”讲清楚的短视频文案拆解";
}

function extractShortPhrase(sentence) {
  const phrases = sentence.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  return phrases.find(function (phrase) {
    return !stopWords.some(function (word) { return phrase.includes(word); });
  });
}

function findPainPhrase(sentence) {
  const match = sentence.match(/(?:问题|痛点|难点|卡点)(?:是|在于|不是)?([^，。！？]{3,18})/);
  return match ? match[1].replace(/^(不|不会|不知道)?/, function (text) { return text; }) : "";
}

function summarizeTheme(coreSentence, keywords, points) {
  const topic = keywords.slice(0, 2).join("、") || "课程表达";
  const point = points[0] || coreSentence;

  return "这段内容主要在讲“" + topic + "”：先指出用户遇到的真实问题，再用观点、案例和行动建议，帮助用户把课程内容转成更容易被短视频观众听懂的表达。核心提醒是：" + point;
}

function makeShortVideoCopy(coreSentence, points, steps) {
  const pointOne = points[0] || coreSentence;
  const pointTwo = points[1] || "把复杂内容拆成简单动作";
  const action = steps[steps.length - 1] || "先写一个痛点开头，再补充案例和行动引导。";

  return "开头钩子：你做课程短视频时，是不是明明内容很多，但观众就是划走？\n" +
    "正文：问题往往不在内容少，而在表达没有抓住痛点。先记住这句话：" + pointOne + "\n" +
    "接着把它拆成两步：第一，先讲用户正在卡住的地方；第二，再给一个能马上照做的方法。" + pointTwo + "\n" +
    "结尾引导：如果你也想把一节课拆成能发布的短视频，今天就先执行这一步：" + action;
}

function renderResult(result) {
  resultList.innerHTML = "";

  moduleTitles.forEach(function (title, index) {
    const item = document.createElement("article");
    item.className = "result-item";

    const top = document.createElement("div");
    top.className = "result-item-header";

    const heading = document.createElement("h3");
    const number = document.createElement("span");
    number.className = "module-number";
    number.textContent = index + 1;
    heading.appendChild(number);
    heading.appendChild(document.createTextNode(title));

    const moduleCopyBtn = document.createElement("button");
    moduleCopyBtn.className = "module-copy-button";
    moduleCopyBtn.type = "button";
    moduleCopyBtn.textContent = "复制";
    moduleCopyBtn.addEventListener("click", function () {
      copyText(formatModuleText(title, result[title]), "“" + title + "”已复制。");
    });

    top.appendChild(heading);
    top.appendChild(moduleCopyBtn);
    item.appendChild(top);

    const content = result[title];
    if (Array.isArray(content)) {
      const list = document.createElement("ul");
      content.forEach(function (text) {
        const li = document.createElement("li");
        li.textContent = text;
        list.appendChild(li);
      });
      item.appendChild(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      item.appendChild(paragraph);
    }

    resultList.appendChild(item);
  });
}

function formatResultText(result) {
  return moduleTitles.map(function (title) {
    return formatModuleText(title, result[title]);
  }).join("\n\n");
}

function formatModuleText(title, content) {
  const body = Array.isArray(content) ? content.map(function (item) {
    return "- " + item;
  }).join("\n") : content;

  return "【" + title + "】\n" + body;
}

function copyText(text, successMessage) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () {
      message.textContent = successMessage;
    }).catch(function () {
      copyTextWithTextarea(text, successMessage);
    });
    return;
  }

  copyTextWithTextarea(text, successMessage);
}

function copyTextWithTextarea(text, successMessage) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  message.textContent = successMessage;
}

function showEmptyResult() {
  resultList.innerHTML = '<p class="empty">结果会显示在这里。</p>';
}
