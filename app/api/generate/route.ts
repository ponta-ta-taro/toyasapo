import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { inquiry, policy } = await req.json();

        if (!inquiry) {
            return NextResponse.json(
                { error: "問い合わせ内容が不足しています" },
                { status: 400 }
            );
        }

        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            temperature: 0.7,
            system: policy || `あなたは心療内科「とやさぽ」の受付・相談スタッフです。
患者様やそのご家族からの問い合わせに対して、共感的かつ専門的な返信メールの下書きを作成してください。

【指針】
- 相手の不安に寄り添う、温かみのある丁寧な言葉遣いを心がけてください（「です・ます」調）。
- 医療的な診断や断定は避け、「〜の可能性があります」「〜をお勧めします」といった表現を用いてください。
- 予約に関する質問には、Web予約または電話での予約を案内してください。
- 緊急性が感じられる場合（「死にたい」など）は、必要に応じて地域の救急相談窓口や救急車の利用を促す文言を含めてください。
- 署名は含めないでください（本文のみ作成）。

【入力】
問い合わせ内容を提供します。`,
            messages: [
                {
                    role: "user",
                    content: inquiry,
                },
            ],
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
