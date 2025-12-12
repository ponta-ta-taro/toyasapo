import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLASSIFICATION_PROMPT = `あなたは医療機関の問い合わせ分類AIです。

【カテゴリ分類基準】
- 予約: 初診予約、予約変更、キャンセル
- 症状相談: 症状の相談、治療方針の質問、未成年の受診相談
- 書類: 診断書、紹介状の依頼
- 料金: 費用に関する質問
- クレーム: 不満や苦情
- その他: 上記に該当しないもの

【優先度判定基準】
5(緊急): 「死」「自殺」「死にたい」「消えたい」などの希死念慮表現を含む
4(高): 症状悪化、強い不安、「無理」「限界」などの表現
3(通常): 一般的な相談、1週間以内の対応
2(低): 事務的な問い合わせ
1(参考): 感謝のメール、情報提供のみ

以下の問い合わせを分類してください。
出力はJSON形式で:
{
  "category": "カテゴリ名",
  "priority": 数値(1-5),
  "reason": "判定理由(20文字以内)"
}`;

export async function POST(req: Request) {
    try {
        const { inquiry } = await req.json();

        if (!inquiry) {
            return NextResponse.json(
                { error: "問い合わせ内容が不足しています" },
                { status: 400 }
            );
        }

        const msg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307", // Using Haiku for speed/cost efficiency for classification
            max_tokens: 300,
            temperature: 0,
            system: CLASSIFICATION_PROMPT,
            messages: [
                {
                    role: "user",
                    content: inquiry,
                },
            ],
        });

        const textContent = msg.content[0].type === 'text' ? msg.content[0].text : '';

        // Extract JSON from response (in case of extra text)
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse JSON from AI response");
        }

        const classification = JSON.parse(jsonMatch[0]);

        return NextResponse.json(classification);
    } catch (error) {
        console.error("Classification error:", error);
        return NextResponse.json(
            { error: "分類に失敗しました" },
            { status: 500 }
        );
    }
}
