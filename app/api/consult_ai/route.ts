import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
// Ensure ANTHROPIC_API_KEY is set in .env.local
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, contextData } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        // Construct System Prompt from contextData
        const systemPrompt = `あなたはメンタルクリニックの経営アドバイザーです。
以下の分析データを元に、改善提案や質問への回答をしてください。

【データ概要】
- 問い合わせメール: ${contextData.email_count ?? '不明'}件
- 口コミ: ${contextData.review_count ?? '不明'}件（高評価: ${contextData.high_rating_count ?? '不明'}件 / 低評価: ${contextData.low_rating_count ?? '不明'}件）

【メールで多いキーワード】
${Array.isArray(contextData.email_top10) ? contextData.email_top10.join(', ') : 'データなし'}

【高評価口コミで多いキーワード（強み）】
${Array.isArray(contextData.high_rating_top10) ? contextData.high_rating_top10.join(', ') : 'データなし'}

【低評価口コミで多いキーワード（改善点）】
${Array.isArray(contextData.low_rating_top10) ? contextData.low_rating_top10.join(', ') : 'データなし'}

【共通キーワード（メール×低評価）】
${Array.isArray(contextData.common_email_low_rating) ? contextData.common_email_low_rating.join(', ') : 'データなし'}

【相関スコア】
- メール×全口コミ: ${contextData.scores?.email_review ?? '-'}%
- メール×低評価口コミ: ${contextData.scores?.email_low_rating ?? '-'}%

回答は具体的かつ建設的に、クリニック経営者の視点に立って行ってください。`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map((msg: Message) => ({
                role: msg.role,
                content: msg.content,
            })),
        });

        const reply = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('Error in AI consultation API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
