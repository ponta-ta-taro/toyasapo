import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { Draft } from "@/lib/types";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { inquiry, policy, pastResponses, mode, currentDraft, instructions, clinicInfo } = await req.json();

        // Construct Clinic Info System Prompt
        let clinicInfoPrompt = "";
        if (clinicInfo) {
            clinicInfoPrompt = `
【クリニック情報】
以下は当院の基本情報です。案内に必要であれば正確に参照してください。
- 予約ページURL: ${clinicInfo.reservationUrl || "未設定"}
- 診療時間: ${clinicInfo.clinicHours || "未設定"}
- 電話番号: ${clinicInfo.phoneNumber || "未設定"}
- その他案内: ${clinicInfo.commonInfo || "なし"}
`;
        }

        if (!inquiry && mode !== "refine") {
            return NextResponse.json(
                { error: "問い合わせ内容が不足しています" },
                { status: 400 }
            );
        }

        let systemPrompt = (policy || `あなたは心療内科「とやさぽ」の受付・相談スタッフです。
患者様やそのご家族からの問い合わせに対して、共感的かつ専門的な返信メールの下書きを作成してください。

【指針】
- 相手の不安に寄り添う、温かみのある丁寧な言葉遣いを心がけてください（「です・ます」調）。
- 医療的な診断や断定は避け、「〜の可能性があります」「〜をお勧めします」といった表現を用いてください。
- 予約に関する質問には、Web予約または電話での予約を案内してください。
- 緊急性が感じられる場合（「死にたい」など）は、必要に応じて地域の救急相談窓口や救急車の利用を促す文言を含めてください。
- 署名は含めないでください（本文のみ作成）。
- 簡潔で分かりやすい文章構成`) + clinicInfoPrompt;

        // Append Few-Shot examples if available (only for Create mode or if relevant context)
        // For refinement, we might prioritize the user's explicit instruction, but keeping examples doesn't hurt.
        if (pastResponses && Array.isArray(pastResponses) && pastResponses.length > 0) {
            systemPrompt += `\n\n【過去の返信事例（参考）】\n以下の事例の書き方やトーンを参考にしてください。\n`;
            pastResponses.forEach((draft: Draft, index: number) => {
                systemPrompt += `\n事例${index + 1}:\n問い合わせ: ${draft.inquiry}\n返信: ${draft.generatedDraft || draft.finalResponse}\n`;
            });
        }

        let messages: { role: "user" | "assistant"; content: string }[] = [];

        if (mode === "refine") {
            if (!currentDraft || !instructions) {
                return NextResponse.json({ error: "修正元の文面または指示が不足しています" }, { status: 400 });
            }
            messages = [
                { role: "user", content: inquiry || "（問い合わせ内容不明）" },
                { role: "assistant", content: currentDraft },
                { role: "user", content: `この返信案に対して、以下の修正を加えて書き直してください：\n\n${instructions}` }
            ];
        } else {
            messages = [
                { role: "user", content: inquiry }
            ];
        }

        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            temperature: 0.7,
            system: systemPrompt,
            messages: messages,
        });

        const draft = msg.content[0].type === 'text' ? msg.content[0].text : '';

        return NextResponse.json({ draft });
    } catch (error) {
        console.error("Generate error:", error);
        return NextResponse.json(
            { error: "返信案の生成に失敗しました" },
            { status: 500 }
        );
    }
}
