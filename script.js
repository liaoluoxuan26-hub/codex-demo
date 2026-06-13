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

const stopWords = new Set([
  "一个", "这个", "那个", "我们", "你们", "他们", "很多", "就是", "因为", "所以", "如果", "但是", "然后", "其实", "可以", "不是", "没有", "不要", "需要", "通过", "进行", "以及", "或者", "可能", "时候", "内容", "视频", "课程", "文案", "短视频", "token", "undefined", "null", "nan", "字幕", "识别", "提取"
]);

const noisyPatterns = [
  /https?:\/\/\S+/gi,
  /www\.\S+/gi,
  /[a-z0-9_+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  /\b(token|timestamp|undefined|null|nan|error|debug|json|api|id|uuid)\b/gi,
  /[a-f0-9]{16,}/gi,
  /\[[^\]\u4e00-\u9fa5]{1,30}\]/g,
  /\{[^{}]{0,80}\}/g,
  /<[^>]+>/g
];

const exampleText = "很多人做知识类短视频，最大的问题不是不会讲，而是开头太慢。首先，你要在前三秒说出用户的痛点，比如学员想做课程却不知道怎么写文案。第二，把一个大主题拆成三个小观点：问题是什么、为什么会这样、马上能做什么。第三，用一个真实案例增强信任，例如有位学员把一节30分钟课程拆成5条短视频，完播率明显提升。记住，好的课程文案不是把内容讲完，而是让用户愿意继续听。最后，给用户一个简单行动：今天先把你的课程标题改成一个具体问题。";

let latestResultText = "";

analyzeBtn.addEventListener("click", function () {
  const videoLink = videoLinkInput.value.trim();
  const videoText = videoTextInput.value.trim();

  message.textContent = "";

  if (videoLink && !videoText) {
    latestResultText = "";
    showEmptyResult();
    message.textContent = "第一版暂不支持自动解析链接，请先粘贴文案内容。";
    return;
  }

  if (!videoText) {
    latestResultText = "";
    showEmptyResult();
    message.textContent = "请先粘贴需要拆解的视频文字。";
    return;
  }

  const cleanText = cleanInputText(videoText);
  const sentences = splitText(cleanText);

  if (!sentences.length) {
    latestResultText = "";
    showEmptyResult();
    message.textContent = "没有识别到有效中文内容，请删掉乱码或补充完整文案。";
    return;
  }

  const result = buildResult(cleanText, sentences);
  latestResultText = formatResultText(result);
  renderResult(result);
  message.textContent = "拆解完成，可复制全部结果或单独复制某个模块。";
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
  latestResultText = "";
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

function cleanInputText(text) {
  let cleaned = text.normalize("NFKC");

  noisyPatterns.forEach(function (pattern) {
    cleaned = cleaned.replace(pattern, " ");
  });

  return cleaned
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/[\t\r]+/g, " ")
    .replace(/[|*_#~`^=<>]+/g, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitText(text) {
  const seen = new Set();

  return text
    .split(/[。！？!?；;\n]+|(?<=\D)[,.，、](?=\s*第[一二三四五六七八九十]|\s*(?:首先|其次|然后|最后))/)
    .map(function (sentence) {
      return sentence.trim().replace(/^[,，、：:；;\-\s]+|[,，、：:；;\-\s]+$/g, "");
    })
    .filter(function (sentence) {
      if (!sentence || sentence.length < 6 || isNoisySentence(sentence)) {
        return false;
      }

      const key = sentence.slice(0, 70);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function isNoisySentence(sentence) {
  const chineseChars = sentence.match(/[\u4e00-\u9fa5]/g) || [];
  const letters = sentence.match(/[a-z]/gi) || [];
  const symbols = sentence.match(/[^\w\u4e00-\u9fa5，。！？；：、,.!?;:\s]/g) || [];

  return chineseChars.length < 4 || letters.length > chineseChars.length || symbols.length > sentence.length * 0.22;
}

function buildResult(text, sentences) {
  const keywords = getTopKeywords(text);
  const rankedSentences = rankSentences(sentences, keywords);
  const coreSentences = rankedSentences.slice(0, 3);
  const mainPoints = pickMainPoints(sentences, rankedSentences);
  const cases = findByKeywords(sentences, ["比如", "例如", "案例", "故事", "客户", "学员", "用户", "真实", "曾经"]);
  const quotes = findGoldenSentences(sentences, keywords);
  const steps = findSteps(sentences, rankedSentences);
  const title = makeTitle(keywords, coreSentences, sentences);

  return {
    "课程标题": title,
    "核心主题": summarizeTheme(keywords, coreSentences, sentences),
    "主要观点": mainPoints.length ? mainPoints : ["暂未识别到明确观点，可补充更完整的课程文字。"],
    "关键案例": cases.length ? cases : ["暂未识别到案例，可从原文中补充“比如/例如/案例/学员”相关内容。"],
    "金句摘录": quotes.length ? quotes : coreSentences.slice(0, 2),
    "可执行步骤": steps.length ? steps : ["明确用户最关心的痛点。", "拆出3个可以马上理解的小观点。", "补充案例或对比，增强信任。", "用一句行动指令收尾。"],
    "适合发短视频的文案版本": makeShortVideoCopy(title, mainPoints, steps)
  };
}

function getTopKeywords(text) {
  const words = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  const scores = {};

  words.forEach(function (word) {
    for (let size = Math.min(4, word.length); size >= 2; size -= 1) {
      for (let index = 0; index <= word.length - size; index += 1) {
        const part = word.slice(index, index + size);
        if (!stopWords.has(part) && !/^第[一二三四五六七八九十]$/.test(part)) {
          scores[part] = (scores[part] || 0) + size;
        }
      }
    }
  });

  return Object.keys(scores)
    .sort(function (a, b) {
      return scores[b] - scores[a] || b.length - a.length;
    })
    .slice(0, 8);
}

function selectDistinctKeywords(keywords) {
  const selected = [];

  keywords.forEach(function (keyword) {
    const overlaps = selected.some(function (item) {
      return item.includes(keyword) || keyword.includes(item);
    });

    if (keyword.length >= 2 && !stopWords.has(keyword) && !overlaps) {
      selected.push(keyword);
    }
  });

  return selected;
}

function rankSentences(sentences, keywords) {
  return sentences.slice().sort(function (a, b) {
    return sentenceScore(b, keywords) - sentenceScore(a, keywords);
  });
}

function sentenceScore(sentence, keywords) {
  const keywordScore = keywords.reduce(function (score, keyword) {
    return score + (sentence.includes(keyword) ? 5 : 0);
  }, 0);
  const actionScore = /痛点|问题|方法|步骤|重点|记住|行动|提升|解决|学会|马上/.test(sentence) ? 4 : 0;
  const lengthScore = sentence.length >= 14 && sentence.length <= 70 ? 3 : 0;

  return keywordScore + actionScore + lengthScore;
}

function pickMainPoints(sentences, rankedSentences) {
  const pointKeywords = ["首先", "第一", "第二", "第三", "其次", "然后", "最后", "重点", "原因", "方法", "记住", "核心", "问题"];
  const explicitPoints = findByKeywords(sentences, pointKeywords);
  return uniqueList(explicitPoints.concat(rankedSentences)).slice(0, 4);
}

function makeTitle(keywords, coreSentences, sentences) {
  const candidates = selectDistinctKeywords(keywords);
  const subject = candidates.slice(0, 2).join("与") || extractReadablePhrase(coreSentences[0] || sentences[0]);
  const benefitSentence = coreSentences.find(function (sentence) {
    return /提升|解决|学会|做好|转化|行动|愿意|清楚/.test(sentence);
  }) || coreSentences[0] || sentences[0];
  const benefit = extractReadablePhrase(benefitSentence);

  if (subject && benefit && !benefit.includes(subject)) {
    return "用" + subject + "讲清" + benefit;
  }

  return "把" + (subject || "课程内容") + "拆成更容易传播的短视频文案";
}

function summarizeTheme(keywords, coreSentences, sentences) {
  const focus = keywords.slice(0, 3).join("、") || "课程表达、用户痛点、短视频转化";
  const core = extractReadablePhrase(coreSentences[0] || sentences[0]);
  return "围绕“" + focus + "”展开，核心是" + core + "，帮助用户把课程内容整理成更清晰、可复用、能引导行动的短视频表达。";
}

function extractReadablePhrase(sentence) {
  if (!sentence) {
    return "课程内容";
  }

  return sentence
    .replace(/^(首先|其次|然后|最后|第一|第二|第三|第四)[，,:：、\s]*/, "")
    .replace(/你是不是也|大家一定要|很多人/g, "")
    .slice(0, 28);
}

function findByKeywords(sentences, keywords) {
  return uniqueList(sentences.filter(function (sentence) {
    return keywords.some(function (keyword) {
      return sentence.includes(keyword);
    });
  })).slice(0, 4);
}

function findGoldenSentences(sentences, keywords) {
  return sentences.filter(function (sentence) {
    return sentence.length >= 12 && sentence.length <= 55 && /不是|而是|记住|关键|核心|真正|最好|一定|愿意|行动/.test(sentence);
  }).sort(function (a, b) {
    return sentenceScore(b, keywords) - sentenceScore(a, keywords);
  }).slice(0, 3);
}

function findSteps(sentences, rankedSentences) {
  const stepKeywords = ["第一", "第二", "第三", "首先", "其次", "然后", "最后", "步骤", "方法", "做法", "行动"];
  const matched = findByKeywords(sentences, stepKeywords);

  if (matched.length) {
    return matched.map(function (sentence, index) {
      return normalizeStep(sentence, index);
    }).slice(0, 5);
  }

  return rankedSentences.slice(0, 4).map(function (sentence, index) {
    return "第" + (index + 1) + "步：" + extractReadablePhrase(sentence);
  });
}

function normalizeStep(sentence, index) {
  if (/^第[一二三四五六七八九十]\b|^第\d+步/.test(sentence)) {
    return sentence;
  }

  return "第" + (index + 1) + "步：" + sentence.replace(/^(首先|其次|然后|最后)[，,:：、\s]*/, "");
}

function makeShortVideoCopy(title, points, steps) {
  const pointText = points.slice(0, 3).map(extractReadablePhrase).join("；");
  const action = steps[0] ? steps[0].replace(/^第\d+步：/, "") : "先拆出一个最具体的用户痛点";

  return "开头：如果你想做知识类短视频，先别急着把课讲完。\n" +
    "正文：这条内容的重点是“" + title + "”。你可以按三个层次讲：" + (pointText || "先说痛点，再给方法，最后给行动") + "。\n" +
    "结尾：今天就做一个动作——" + action + "，再把它改成一句用户一听就懂的话。";
}

function uniqueList(items) {
  const seen = new Set();
  return items.filter(function (item) {
    const key = item.slice(0, 60);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function renderResult(result) {
  resultList.innerHTML = "";

  moduleTitles.forEach(function (title, index) {
    const item = document.createElement("article");
    item.className = "result-item";

    const itemHeader = document.createElement("div");
    itemHeader.className = "result-item-header";

    const heading = document.createElement("h3");
    heading.innerHTML = '<span class="module-number">' + (index + 1) + "</span>" + title;
    itemHeader.appendChild(heading);

    const moduleCopyBtn = document.createElement("button");
    moduleCopyBtn.className = "module-copy-button";
    moduleCopyBtn.type = "button";
    moduleCopyBtn.textContent = "复制";
    moduleCopyBtn.addEventListener("click", function () {
      copyText(formatModuleText(title, result[title]), "“" + title + "”已复制。");
    });
    itemHeader.appendChild(moduleCopyBtn);
    item.appendChild(itemHeader);

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

function copyText(text, successText) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () {
      message.textContent = successText;
    }).catch(function () {
      copyTextWithTextarea(text, successText);
    });
    return;
  }

  copyTextWithTextarea(text, successText);
}

function copyTextWithTextarea(text, successText) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  message.textContent = successText;
}

function showEmptyResult() {
  resultList.innerHTML = '<p class="empty">结果会显示在这里。</p>';
}
