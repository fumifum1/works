/**
 * ==========================================================
 * AI.gs
 * Gemini API 共通ライブラリ
 * APIキーは Script Properties の
 * GEMINI_API_KEY から取得します。
 * ==========================================================
 */


/**
 * Script PropertiesからGemini APIキーを取得
 */
function getGeminiApiKey() {

  const key = PropertiesService
    .getScriptProperties()
    .getProperty("GEMINI_API_KEY");

  if (!key) {
    throw new Error("Script Properties に GEMINI_API_KEY がありません。");
  }

  return key;
}


/**
 * Geminiへ問い合わせる共通関数
 *
 * @param {string} prompt AIへ送る文章
 * @return {string} Geminiの回答
 */
function callGemini(prompt) {

  const apiKey = getGeminiApiKey();

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    apiKey;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  // HTTPエラー
  if (response.getResponseCode() !== 200) {
    throw new Error(response.getContentText());
  }

  const json = JSON.parse(response.getContentText());

  // Geminiの回答取得
  if (
    json.candidates &&
    json.candidates.length > 0 &&
    json.candidates[0].content &&
    json.candidates[0].content.parts &&
    json.candidates[0].content.parts.length > 0
  ) {
    return json.candidates[0].content.parts[0].text.trim();
  }

  throw new Error("Geminiから回答を取得できませんでした。");
}