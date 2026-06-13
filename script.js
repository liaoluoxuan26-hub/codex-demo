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

  const sentences = splitText(videoText);
  const result = buildResult(videoText, sentences);
  latestResultText = formatResultText(result);
  renderResult(result);
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

  copyText(latestResultText);
});

function splitText(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/[。！？!?；;\n]/)
    .map(function (sentence) {
      return sentence.trim();
    })
    .filter(Boolean);
}

function buildResult(text, sentences) {
  const firstSentence = sentences[0] || text.slice(0, 30);
  const mainPoints = sentences.slice(0, 4);
  const cases = findByKeywords(sentences, ["比如", "例如", "案例", "故事", "客户", "学员"]);
  const quotes = findGoldenSentences(sentences);
  const steps = findSteps(sentences);

  return {
    "课程标题": makeTitle(firstSentence),
    "核心主题": summarizeTheme(firstSentence),
    "主要观点": mainPoints.length ? mainPoints : ["暂未识别到明确观点，可补充更完整的课程文字。"],
    "关键案例": cases.length ? cases : ["暂未识别到案例，可从原文中补充“比如/例如/案例”相关内容。"],
    "金句摘录": quotes.length ? quotes : [firstSentence],
    "可执行步骤": steps.length ? steps : ["提炼问题", "说明方法", "给出案例", "提醒行动"],
    "适合发短视频的文案版本": makeShortVideoCopy(firstSentence, mainPoints)
  };
}

function makeTitle(sentence) {
  const shortSentence = sentence.slice(0, 24);
  return "如何用课程内容讲清楚：" + shortSentence;
}

function summarizeTheme(sentence) {
  return "围绕“" + sentence.slice(0, 36) + "”展开，帮助用户理解课程重点并转化为行动。";
}

function findByKeywords(sentences, keywords) {
  return sentences.filter(function (sentence) {
    return keywords.some(function (keyword) {
      return sentence.includes(keyword);
    });
  }).slice(0, 3);
}

function findGoldenSentences(sentences) {
  return sentences.filter(function (sentence) {
    return sentence.length >= 12 && sentence.length <= 45;
  }).slice(0, 3);
}

function findSteps(sentences) {
  const stepKeywords = ["第一", "第二", "第三", "首先", "然后", "最后", "步骤", "方法", "做法"];
  const matched = findByKeywords(sentences, stepKeywords);

  if (matched.length) {
    return matched;
  }

  return sentences.slice(0, 3).map(function (sentence, index) {
    return "第" + (index + 1) + "步：" + sentence;
  });
}

function makeShortVideoCopy(titleSentence, points) {
  const pointText = points.slice(0, 3).join("；");
  return "开头：你是不是也遇到过这个问题——" + titleSentence + "？\n" +
    "正文：记住这几个重点：" + pointText + "。\n" +
    "结尾：如果你想把课程内容变成短视频文案，先从这几个点开始拆解。";
}

function renderResult(result) {
  resultList.innerHTML = "";

  moduleTitles.forEach(function (title, index) {
    const item = document.createElement("article");
    item.className = "result-item";

    const heading = document.createElement("h3");
    heading.innerHTML = '<span class="module-number">' + (index + 1) + '</span>' + title;
    item.appendChild(heading);

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
    const content = result[title];
    const body = Array.isArray(content) ? content.map(function (item) {
      return "- " + item;
    }).join("\n") : content;

    return "【" + title + "】\n" + body;
  }).join("\n\n");
}

function copyText(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () {
      message.textContent = "全部拆解结果已复制。";
    }).catch(function () {
      copyTextWithTextarea(text);
    });
    return;
  }

  copyTextWithTextarea(text);
}

function copyTextWithTextarea(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  message.textContent = "全部拆解结果已复制。";
}

function showEmptyResult() {
  resultList.innerHTML = '<p class="empty">结果会显示在这里。</p>';
}
