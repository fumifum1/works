/**
 * Apps Script for tarot readings with Gemini + Spreadsheet archive.
 *
 * Required Script Properties:
 * - GEMINI_API_KEY
 * - TAROT_SHEET_ID
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("POST data is empty.");
    }

    var data = JSON.parse(e.postData.contents);
    var reading = getTarotReading(
      data.cardName,
      data.englishName || "",
      data.orientation,
      data.category,
      data.categoryContext || "",
      data.keywords || "",
      data.baseMessage || ""
    );

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        source: reading.source,
        result: reading.result,
        debug: reading.debug || null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log(err);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        source: "fallback",
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getTarotReading(cardName, englishName, orientation, category, categoryContext, keywords, baseMessage) {
  var todayKey = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd");
  var sheet = getArchiveSheet();

  var archived = findArchivedReading(sheet, category, cardName, orientation);
  if (archived) {
    return {
      source: "sheet",
      result: archived,
      debug: {
        mode: "archive-hit",
        todayKey: todayKey
      }
    };
  }

  var prompt = buildPrompt(
    cardName,
    englishName,
    orientation,
    category,
    categoryContext,
    keywords,
    baseMessage
  );

  try {
    var text = callGemini(prompt);
    Logger.log("Gemini raw text: " + text);

    var parsed = parseGeminiJson(text);
    var result = normalizeReadingObject(parsed, cardName, orientation, category, categoryContext, keywords, baseMessage, todayKey);

    appendArchiveRow(sheet, {
      createdAt: new Date(),
      todayKey: todayKey,
      category: category,
      categoryContext: categoryContext,
      cardName: cardName,
      orientation: orientation,
      keywords: keywords,
      baseMessage: baseMessage,
      message: result.message,
      focus: result.focus,
      action: result.action,
      source: "gemini"
    });

    return {
      source: "gemini",
      result: result,
      debug: {
        mode: "gemini",
        todayKey: todayKey
      }
    };
  } catch (err) {
    Logger.log("Gemini fallback reason: " + err);

    var sheetFallback = pickArchivedFallback(sheet, category, cardName, orientation, todayKey);
    if (sheetFallback) {
      return {
        source: "sheet",
        result: sheetFallback,
        debug: {
          mode: "archive-fallback",
          reason: err.toString(),
          todayKey: todayKey
        }
      };
    }

    return {
      source: "fallback",
      result: getFallbackReading(cardName, orientation, category, categoryContext, keywords, baseMessage, todayKey),
      debug: {
        mode: "template-fallback",
        reason: err.toString(),
        todayKey: todayKey
      }
    };
  }
}

function buildPrompt(cardName, englishName, orientation, category, categoryContext, keywords, baseMessage) {
  return [
    "You are an experienced tarot reader.",
    "",
    "Create 3 short Japanese tarot messages for a website.",
    "",
    "Card: " + cardName,
    "English: " + englishName,
    "Orientation: " + orientation,
    "Theme: " + category,
    "Theme context: " + categoryContext,
    "Keywords: " + keywords,
    "Base meaning: " + baseMessage,
    "",
    "Rules:",
    "- Kind, optimistic, and not too certain",
    "- Keep the meaning consistent with the card and theme",
    "- No bullet points or headings in the output",
    "- Output JSON only",
    "",
    "Output format:",
    "{",
    '  "message": "120-180 chars. End with encouragement.",',
    '  "focus": "60-100 chars.",',
    '  "action": "40-80 chars. Concrete action for today."',
    "}"
  ].join("\n");
}

function parseGeminiJson(text) {
  var cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  var start = cleaned.indexOf("{");
  var end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response is not JSON: " + text);
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeReadingObject(parsed, cardName, orientation, category, categoryContext, keywords, baseMessage, todayKey) {
  var fallback = getFallbackReading(cardName, orientation, category, categoryContext, keywords, baseMessage, todayKey);
  return {
    message: parsed.message || fallback.message,
    focus: parsed.focus || fallback.focus,
    action: parsed.action || fallback.action
  };
}

function getFallbackReading(cardName, orientation, category, categoryContext, keywords, baseMessage, todayKey) {
  var seed = [
    todayKey,
    cardName,
    orientation,
    category,
    categoryContext,
    keywords,
    baseMessage
  ].join("|");

  var keywordText = keywords ? "「" + keywords + "」" : "今の流れ";
  var shortMeaning = baseMessage || "小さな調整が流れを整えてくれそうです。";

  var messages = [
    "【" + cardName + "（" + orientation + "）】" + category + "では、" + shortMeaning + " " + keywordText + "を手がかりに、焦らず今できることへ目を向けると良いでしょう。小さな前進が次の流れを連れてきます。",
    "【" + cardName + "（" + orientation + "）】" + (categoryContext || category) + "、今日は" + keywordText + "がヒントになりそうです。 " + shortMeaning + " 完璧を急がず、心が少し軽くなる選択を大切にしてみましょう。",
    "【" + cardName + "（" + orientation + "）】" + category + "の流れでは、" + shortMeaning + " 大きく変えようとしなくても、気づいたことを一つ整えるだけで景色が変わるかもしれません。",
    "【" + cardName + "（" + orientation + "）】今日は" + keywordText + "に関わる出来事を、いつもより丁寧に見つめたい日です。 " + shortMeaning + " あなたのペースで進めば大丈夫です。",
    "【" + cardName + "（" + orientation + "）】" + category + "では、今ある状況を否定せず、少しだけ扱いやすく整えることが助けになりそうです。 " + shortMeaning + " 穏やかな一歩を選んでみましょう。"
  ];

  var focuses = [
    keywordText + "に意識を向け、急いで結論を出すよりも、今の気持ちがどこで動くのかを静かに確かめてください。",
    "うまく進めることより、無理なく続けられる形を選ぶことを意識すると良いでしょう。小さな違和感も大切なサインです。",
    cardName + "の示す流れを、良い悪いで決めつけずに受け止めてみてください。見方を少し変える余白がありそうです。",
    category + "について、誰かの期待より自分の納得感を優先してみましょう。落ち着いた判断がしやすくなります。",
    "今日の焦点は、足りないもの探しより、すでに手元にある支えを見直すことかもしれません。"
  ];

  var actions = [
    "気になっていることを一つだけメモし、今日できる最小の一歩を十五分だけ試してみましょう。",
    "予定や持ち物を一つ整理して、心の余白を少し作ってみてください。",
    "深呼吸をしてから、後回しにしていた小さな用事を一つだけ終わらせましょう。",
    "信頼できる人に短く相談するか、自分の考えを三行だけ書き出してみましょう。",
    "今日は欲張らず、ひとつの行動を丁寧に終えることを目標にしてみてください。"
  ];

  return {
    message: pickBySeed(messages, seed + "|message"),
    focus: pickBySeed(focuses, seed + "|focus"),
    action: pickBySeed(actions, seed + "|action")
  };
}

function pickBySeed(list, seed) {
  return list[hashString(seed) % list.length];
}

function hashString(value) {
  var hash = 2166136261;
  var text = String(value || "");
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getArchiveSheet() {
  var sheetId = PropertiesService.getScriptProperties().getProperty("TAROT_SHEET_ID");
  if (!sheetId) {
    throw new Error("Script Properties に TAROT_SHEET_ID がありません。");
  }

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("archive");
  if (!sheet) {
    sheet = ss.insertSheet("archive");
    sheet.appendRow([
      "createdAt",
      "todayKey",
      "category",
      "categoryContext",
      "cardName",
      "orientation",
      "keywords",
      "baseMessage",
      "message",
      "focus",
      "action",
      "source"
    ]);
  }
  return sheet;
}

function appendArchiveRow(sheet, row) {
  sheet.appendRow([
    row.createdAt,
    row.todayKey,
    row.category,
    row.categoryContext,
    row.cardName,
    row.orientation,
    row.keywords,
    row.baseMessage,
    row.message,
    row.focus,
    row.action,
    row.source
  ]);
}

function findArchivedReading(sheet, category, cardName, orientation) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  var header = values[0];
  var idx = makeColumnIndex(header);
  var candidates = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (
      String(row[idx.category]) === String(category) &&
      String(row[idx.cardName]) === String(cardName) &&
      String(row[idx.orientation]) === String(orientation)
    ) {
      candidates.push({
        message: row[idx.message],
        focus: row[idx.focus],
        action: row[idx.action]
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates[hashString([category, cardName, orientation].join("|")) % candidates.length];
}

function pickArchivedFallback(sheet, category, cardName, orientation, todayKey) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  var header = values[0];
  var idx = makeColumnIndex(header);
  var candidates = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (
      String(row[idx.category]) === String(category) &&
      String(row[idx.cardName]) === String(cardName) &&
      String(row[idx.orientation]) === String(orientation)
    ) {
      candidates.push({
        message: row[idx.message],
        focus: row[idx.focus],
        action: row[idx.action]
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates[hashString([todayKey, category, cardName, orientation].join("|")) % candidates.length];
}

function makeColumnIndex(header) {
  var index = {};
  for (var i = 0; i < header.length; i++) {
    index[String(header[i])] = i;
  }
  return {
    category: index.category,
    cardName: index.cardName,
    orientation: index.orientation,
    message: index.message,
    focus: index.focus,
    action: index.action
  };
}
