"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, User, Loader2, Sparkles, X } from "lucide-react"

// Types matching the structure in analysis-dashboard.tsx
interface AnalyzedWord {
    word: string;
    count: number;
}

export interface CorrelationAnalysisData {
    updated_at: string;
    email_count: number;
    review_count: number;
    low_rating_review_count: number;
    high_rating_review_count?: number;
    email_top20: AnalyzedWord[];
    review_top20: AnalyzedWord[];
    low_rating_top20: AnalyzedWord[];
    high_rating_top20?: AnalyzedWord[];
    common_email_review: string[];
    common_email_low_rating: string[];
    common_all: string[];
    correlation_scores: {
        email_review: number;
        email_low_rating: number;
        email_high_rating?: number;
    };
    improvement_suggestions: string[];
    strength_keywords?: AnalyzedWord[];
    weakness_keywords?: AnalyzedWord[];
}

interface AIConsultationPanelProps {
    onClose: () => void;
    data: CorrelationAnalysisData | null;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AIConsultationPanel({ onClose, data }: AIConsultationPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'こんにちは。経営アドバイザーAIです。分析データを元に、改善提案やご質問にお答えします。' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !data) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Prepare context data safely
            const contextData = {
                email_count: data.email_count,
                review_count: data.review_count,
                high_rating_count: data.high_rating_review_count,
                low_rating_count: data.low_rating_review_count,
                email_top10: data.email_top20?.slice(0, 10).map(w => w.word) || [],
                high_rating_top10: data.high_rating_top20?.slice(0, 10).map(w => w.word) || [],
                low_rating_top10: data.low_rating_top20?.slice(0, 10).map(w => w.word) || [],
                common_email_low_rating: data.common_email_low_rating || [],
                scores: data.correlation_scores
            };

            const response = await fetch('/api/consult_ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMsg }],
                    contextData
                })
            });

            const resData = await response.json();

            if (!response.ok) {
                throw new Error(resData.error || 'Server Error');
            }

            setMessages(prev => [...prev, { role: 'assistant', content: resData.reply }]);
        } catch (error) {
            console.error("AI Consultation Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown Error';
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `(エラーが発生しました)\n詳細: ${errorMessage}\n\nもう一度お試しいただくか、管理者にお問い合わせください。`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const sampleQuestions = [
        "何から改善したらいい？",
        "予約の問い合わせを減らすには？",
        "強みをもっと活かすには？"
    ];

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-800">AI経営アドバイザー</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="w-5 h-5 text-gray-500" />
                </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                            </div>
                            <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800 shadow-sm'}`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-start gap-2 max-w-[90%]">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-600">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-white border p-3 rounded-lg shadow-sm">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
                <div className="px-4 pb-2 bg-gray-50 shrink-0">
                    <p className="text-xs text-gray-500 mb-2 font-bold">質問例:</p>
                    <div className="flex flex-wrap gap-2">
                        {sampleQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(q)}
                                className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-50 transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t bg-white shrink-0">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="質問を入力..."
                        className="flex-1"
                        disabled={loading}
                    />
                    <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
