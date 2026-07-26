/**
 * ==========================================================
 * Code.gs
 * GitHub Pages → GAS → Gemini
 * Web API
 * ==========================================================
 */

/**
 * POST通信受付
 */
function doPost(e) {

  try {

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("POSTデータが空です。");
    }

    const data = JSON.parse(e.postData.contents);

    const result = getTarotReading(
      data.cardName,
      data.englishName || "",
      data.orientation,
      data.category,
      data.categoryContext || "",
      data.keywords || "",
      data.baseMessage || ""
    );

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: true,
          source: "gemini",
          result: result
        })
      )
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    Logger.log(err);

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          source: "fallback",
          error: err.toString()
        })
      )
      .setMimeType(ContentService.MimeType.JSON);

  }

}

/**
 * タロット占い生成
 */
function getTarotReading(
  cardName,
  englishName,
  orientation,
  category,
  categoryContext,
  keywords,
  baseMessage
) {

  const prompt = `
あなたは経験豊富なタロット占い師です。

以下のタロット結果に合わせて、サイトに表示する3つの文章を作成してください。

カード：${cardName}
英名：${englishName}
向き：${orientation}
テーマ：${category}
テーマ補足：${categoryContext}
キーワード：${keywords}
元の短い解釈：${baseMessage}

条件：
・優しい文章
・前向き
・断定しすぎない
・占いとして自然な言葉にする
・カード名、向き、テーマの内容と矛盾しない
・箇条書き禁止
・見出し不要
・JSON以外の文章を出さない

出力形式：
{
  "message": "今日のメッセージ。120〜180文字程度。最後は励ます一文。",
  "focus": "意識したいこと。60〜100文字程度。",
  "action": "小さな行動。40〜80文字程度。今日すぐできる具体的な行動。"
}
`;

  try {

    const text = callGemini(prompt);
    const jsonText = extractJsonText(text);
    const parsed = JSON.parse(jsonText);

    return {
      message: parsed.message || getFixedReading(cardName, orientation, category).message,
      focus: parsed.focus || getFixedReading(cardName, orientation, category).focus,
      action: parsed.action || getFixedReading(cardName, orientation, category).action
    };

  } catch (err) {

    Logger.log(err);
    return getFixedReading(cardName, orientation, category);

  }

}

/**
 * Geminiが ```json などを付けた場合でもJSON部分だけ取り出す
 */
function extractJsonText(text) {

  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Geminiの回答がJSON形式ではありません: " + text);
  }

  return cleaned.slice(start, end + 1);

}

/**
 * Gemini失敗時
 */
function getFixedReading(cardName, orientation, category) {

  return {
    message: `【${cardName}（${orientation}）】${category}では、今日は焦らず自分の気持ちを大切にすると良い流れにつながりそうです。目の前の小さな一歩を積み重ねていきましょう。`,
    focus: "焦って答えを出さず、今の自分にとって無理のない選択を静かに確かめてください。",
    action: "今日できる小さな一歩を一つ選び、十五分だけ行動してみましょう。"
  };

}
