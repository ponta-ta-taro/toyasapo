"use client"

import { useMemo, useState } from "react"
import { Email } from "@/lib/types"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts"
import { BarChart3 } from "lucide-react"

// 日本語を簡易的に分割（2文字以上のひらがな・カタカナ・漢字の連続を抽出）
const extractWords = (text: string): string[] => {
    const matches = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,}/g);
    return matches || [];
};

// 頻出単語を大きさと色を変えて表示するシンプルな実装
const WordCloud = ({ words }: { words: { text: string; value: number }[] }) => {
    const maxValue = Math.max(...words.map(w => w.value), 1);

    return (
        <div className="flex flex-wrap gap-2 justify-center items-center p-4">
            {words.map((word, index) => {
                const size = Math.max(12, Math.min(36, (word.value / maxValue) * 36));
                const colors = ['text-blue-600', 'text-teal-600', 'text-purple-600', 'text-orange-600', 'text-pink-600'];
                return (
                    <span
                        key={index}
                        className={`${colors[index % colors.length]} font-medium`}
                        style={{ fontSize: `${size}px` }}
                    >
                        {word.text}
                    </span>
                );
            })}
        </div>
    );
};

const STOP_WORDS = new Set([
    // 助詞
    "の", "は", "が", "を", "に", "で", "と", "も", "や", "か", "へ", "より", "から", "まで", "など", "って", "ね", "よ", "わ", "な",
    // 助動詞・活用形
    "です", "ます", "でした", "ました", "ません", "ない", "なかっ", "まし", "でしょ", "だろう", "たい", "たく", "たかっ", "れる", "られる", "せる", "させる", "だ", "た",
    // 動詞（一般的すぎるもの）
    "いる", "ある", "する", "なる", "できる", "いく", "くる", "おる", "みる", "いう", "思う", "思い", "考え", "知り", "知っ",
    // 形容詞（一般的すぎるもの）
    "いい", "よい", "良い", "多い", "少ない", "大きい", "小さい",
    // 副詞・接続詞
    "とても", "かなり", "すごく", "また", "そして", "しかし", "ただ", "もし", "まだ", "もう", "よく", "あまり", "ちょっと",
    // 一般的すぎる名詞・代名詞
    "こと", "もの", "ため", "よう", "ところ", "とき", "方", "人", "私", "僕", "自分", "今", "後", "前", "中", "上", "下", "件", "点", "旨", "等", "それ", "これ", "あれ", "ん", "お客様",
    // 敬語表現
    "お", "ご", "いただき", "くださり", "致し", "申し", "存じ", "頂き", "下さい", "ください", "いたし", "ござい", "ありがとう", "存じ",
    // 接頭辞・接尾辞・記号
    "さん", "様", "殿", "氏", "的", "性", "化", "・", "、", "。", "?", "！", "...", "？", "!", "\n", " ", "　",
    // メール特有・テンプレート文
    "メール", "アドレス", "問い合わせ", "問合せ", "連絡", "返信", "送信", "受信", "件名", "宛先", "相談", "お願い", "申し訳",
    "名前削除", "このメールは", "お問い合わせフォームから送信されました", "ご担当の方は本文のメールアドレスまたはお電話番号にご対応をお願いします",
    "よろしくお願いします", "よろしくお願いいたします", "お世話になっております", "いつもお世話になっております", "お忙しいところ恐れ入りますが",
    "申し訳ありません", "ありがとうございます",
    // 挨拶・定型文（追加分）
    "現在", "はじめまして", "初めまして", "宜しくお願い致します", "よろしくお願い致します", "宜しくお願いします", "お世話になります",
    "本日", "先日", "明日", "削除", "こちらでは", "当方", "あと", "可能でしたら",
    // 一般的すぎる表現（追加分）
    "診察券番号", "こんにちは", "と申します", "ですが", "なお", "真緒です", "むしろ", "御机下", "アクセスした次第です", "相談がありまして",
    // 署名・フッター関連
    "新藤雅延先生", "有限会社", "事業部", "番地"
]);

// カテゴリ別キーワード辞書
const KEYWORD_DICTIONARIES = {
    disease: {
        label: "病名・診断",
        color: "#3b82f6", // blue-500
        keywords: [
            "うつ病", "うつ", "鬱", "鬱病", "パニック障害", "パニック", "発達障害", "ADHD", "注意欠陥", "ASD", "自閉症", "アスペルガー", "適応障害", "不眠症", "睡眠障害", "社交不安", "対人恐怖", "強迫性障害", "強迫症", "OCD", "双極性障害", "躁うつ", "統合失調症", "PTSD", "心的外傷", "摂食障害", "過食", "拒食", "依存症", "アルコール依存", "認知症", "更年期障害", "自律神経失調症", "PMS", "PMDD", "HSP"
        ]
    },
    symptom: {
        label: "症状",
        color: "#f97316", // orange-500
        keywords: [
            "眠れない", "不眠", "寝れない", "不安", "動悸", "息苦しい", "過呼吸", "食欲不振", "食欲がない", "倦怠感", "だるい", "疲れ", "集中できない", "涙が止まらない", "泣いてしまう", "イライラ", "怒り", "落ち込み", "憂うつ", "やる気が出ない", "無気力", "頭痛", "めまい", "吐き気", "手の震え", "緊張", "恐怖", "パニック発作", "フラッシュバック", "幻聴", "幻覚", "妄想", "希死念慮", "死にたい", "自傷"
        ]
    },
    concern: {
        label: "悩み・状況",
        color: "#22c55e", // green-500
        keywords: [
            "休職", "復職", "退職", "仕事", "職場", "上司", "同僚", "パワハラ", "セクハラ", "いじめ", "人間関係", "家族", "親", "夫", "妻", "子供", "育児", "介護", "離婚", "結婚", "恋愛", "学校", "不登校", "受験", "進路", "ストレス", "孤独", "引きこもり"
        ]
    },
    inquiryType: {
        label: "相談内容",
        color: "#a855f7", // purple-500
        keywords: [
            "予約", "キャンセル", "変更", "診断書", "紹介状", "セカンドオピニオン", "薬", "処方", "副作用", "カウンセリング", "心理検査", "費用", "料金", "保険", "自立支援", "障害年金", "傷病手当", "初診", "再診", "通院"
        ]
    }
};

interface AnalysisDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    emails: Email[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const TIME_RANGES = ["0-6時", "6-12時", "12-18時", "18-24時"];

export function AnalysisDashboard({ isOpen, onClose, emails }: AnalysisDashboardProps) {
    const [dateRange, setDateRange] = useState<string>("all");
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");

    const filteredEmails = useMemo(() => {
        if (dateRange === "all") return emails;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return emails.filter(e => {
            if (!e.datetime) return false;
            // Parse "YYYY/MM/DD HH:mm" or similar format
            // Assuming e.datetime is standard format that Date constructor handles or "YYYY/MM/DD" string.
            // If it's the specific format from earlier files "YYYY/MM/DD HH:mm", Date usually parses it if it is standard.
            // Let's rely on new Date(e.datetime) working as it worked in dashboard.tsx filters.
            const d = new Date(e.datetime);
            if (isNaN(d.getTime())) return false;

            const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

            if (dateRange === "custom") {
                if (!customStartDate && !customEndDate) return true;
                const start = customStartDate ? new Date(customStartDate) : new Date(0);
                const end = customEndDate ? new Date(customEndDate) : new Date(9999, 11, 31);
                return target >= start && target <= end;
            }

            const diffTime = today.getTime() - target.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (dateRange === "7d") return diffDays <= 7;
            if (dateRange === "30d") return diffDays <= 30;
            if (dateRange === "3m") return diffDays <= 90;
            if (dateRange === "year") return d.getFullYear() === today.getFullYear();

            return true;
        });
    }, [emails, dateRange, customStartDate, customEndDate]);

    const allWordCounts = useMemo(() => {
        const counts: Record<string, number> = {};

        filteredEmails.forEach(email => {
            if (!email.inquiry) return;
            const segments = extractWords(email.inquiry);

            segments.forEach(word => {
                // Filter: not in STOP_WORDS (Regex ensures length >= 2), and length <= 10
                if (!STOP_WORDS.has(word) && word.length <= 10) {
                    counts[word] = (counts[word] || 0) + 1;
                }
            });
        });

        // Convert to array and sort by value desc
        return Object.entries(counts)
            .map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredEmails]);

    const wordCloudData = useMemo(() => {
        return allWordCounts.slice(0, 50);
    }, [allWordCounts]);

    const topKeywords = useMemo(() => {
        return allWordCounts.slice(0, 5);
    }, [allWordCounts]);

    const potentialNeedsKeywords = useMemo(() => {
        return allWordCounts
            .filter(w => w.value >= 2 && w.value <= 5)
            .slice(0, 5);
    }, [allWordCounts]);

    const categoryAnalysisData = useMemo(() => {
        const results = {
            disease: [] as { name: string, value: number }[],
            symptom: [] as { name: string, value: number }[],
            concern: [] as { name: string, value: number }[],
            inquiryType: [] as { name: string, value: number }[]
        };

        const categories = ['disease', 'symptom', 'concern', 'inquiryType'] as const;

        categories.forEach(catKey => {
            const counts: Record<string, number> = {};
            const dictionary = KEYWORD_DICTIONARIES[catKey];

            filteredEmails.forEach(email => {
                const text = email.inquiry || "";
                dictionary.keywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        counts[keyword] = (counts[keyword] || 0) + 1;
                    }
                });
            });

            results[catKey] = Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Top 5
        });

        return results;
    }, [filteredEmails]);

    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEmails.forEach(e => {
            const cat = e.classification?.category || "未分類";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredEmails]);

    const priorityData = useMemo(() => {
        const counts = { high: 0, medium: 0, low: 0 };
        filteredEmails.forEach(e => {
            const p = e.classification?.priority || 0;
            if (p >= 4) counts.high++;
            else if (p === 3) counts.medium++;
            else counts.low++;
        });
        return [
            { name: "高 (4-5)", value: counts.high, color: "#ef4444" }, // red-500
            { name: "中 (3)", value: counts.medium, color: "#eab308" }, // yellow-500
            { name: "低 (1-2)", value: counts.low, color: "#22c55e" }, // green-500
        ].filter(d => d.value > 0);
    }, [filteredEmails]);

    const timeData = useMemo(() => {
        const counts = [0, 0, 0, 0]; // 0-6, 6-12, 12-18, 18-24
        filteredEmails.forEach(e => {
            if (!e.datetime) return;
            const date = new Date(e.datetime);
            const hour = date.getHours();
            if (hour < 6) counts[0]++;
            else if (hour < 12) counts[1]++;
            else if (hour < 18) counts[2]++;
            else counts[3]++;
        });
        return TIME_RANGES.map((range, i) => ({ name: range, value: counts[i] }));
    }, [filteredEmails]);

    const dayData = useMemo(() => {
        const counts = Array(7).fill(0);
        filteredEmails.forEach(e => {
            if (!e.datetime) return;
            const date = new Date(e.datetime);
            const day = date.getDay();
            counts[day]++;
        });
        return DAYS.map((day, i) => ({ name: day, value: counts[i] }));
    }, [filteredEmails]);

    const monthData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEmails.forEach(e => {
            if (!e.datetime) return;
            const date = new Date(e.datetime);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, value]) => ({ name, value }));
    }, [filteredEmails]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
                <div className="p-6 border-b border-gray-200 shrink-0 bg-white z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <BarChart3 className="h-6 w-6 text-blue-600" />
                                問い合わせデータ分析
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                対象期間: {filteredEmails.length}件 / 全{emails.length}件
                            </DialogDescription>
                        </div>

                        {/* Date Filter Controls */}
                        <div className="flex items-center gap-2">
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="期間を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7d">過去7日間</SelectItem>
                                    <SelectItem value="30d">過去30日間</SelectItem>
                                    <SelectItem value="3m">過去3ヶ月</SelectItem>
                                    <SelectItem value="year">今年</SelectItem>
                                    <SelectItem value="all">全期間</SelectItem>
                                    <SelectItem value="custom">カスタム指定</SelectItem>
                                </SelectContent>
                            </Select>

                            {dateRange === "custom" && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <Input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-auto"
                                    />
                                    <span className="text-gray-400">~</span>
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-auto"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* 1. Category Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center lg:col-span-2">
                            <h3 className="text-lg font-bold mb-4 w-full text-left">カテゴリ別件数</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={80} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8884d8" name="件数">
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Priority Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center">
                            <h3 className="text-lg font-bold mb-4 w-full text-left">優先度別件数</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={priorityData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            dataKey="value"
                                        >
                                            {priorityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Month Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-3">
                            <h3 className="text-lg font-bold mb-4">月別推移</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} name="件数" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 4. Time Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold mb-4">時間帯別件数</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timeData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#82ca9d" name="件数" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 5. Day Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold mb-4">曜日別件数</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dayData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#8884d8" name="件数" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Spacer for grid alignment if needed */}
                        <div className="hidden lg:block lg:col-span-1"></div>


                        {/* 6. Category Keyword Analysis Section (New Position) */}
                        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold mb-6">問い合わせ傾向分析</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {(Object.keys(KEYWORD_DICTIONARIES) as (keyof typeof KEYWORD_DICTIONARIES)[]).map((key) => (
                                    <div key={key} className="flex flex-col">
                                        <h4 className="text-md font-semibold mb-2 text-gray-700 border-l-4 pl-2" style={{ borderColor: KEYWORD_DICTIONARIES[key].color }}>
                                            {KEYWORD_DICTIONARIES[key].label}
                                        </h4>
                                        <div className="w-full h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={categoryAnalysisData[key]}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" hide />
                                                    <YAxis
                                                        dataKey="name"
                                                        type="category"
                                                        width={90}
                                                        tick={{ fontSize: 12 }}
                                                        interval={0}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px' }}
                                                        cursor={{ fill: 'transparent' }}
                                                    />
                                                    <Bar
                                                        dataKey="value"
                                                        fill={KEYWORD_DICTIONARIES[key].color}
                                                        radius={[0, 4, 4, 0]}
                                                        barSize={20}
                                                        label={{ position: 'right', fill: '#666', fontSize: 12 }}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 7. Keyword Analysis Section (Word Cloud) - Moved to bottom */}
                        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Word Cloud */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h3 className="text-lg font-bold mb-4">参考：キーワード分析（精度向上中）</h3>
                                <div className="w-full min-h-[300px] flex items-center justify-center">
                                    <WordCloud words={wordCloudData} />
                                </div>
                            </div>

                            {/* Rankings */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-6">
                                {/* Top Keywords */}
                                <div>
                                    <h3 className="text-lg font-bold mb-4">キーワードTOP5</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">順位</TableHead>
                                                <TableHead>キーワード</TableHead>
                                                <TableHead className="text-right">件数</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topKeywords.map((keyword, index) => (
                                                <TableRow key={keyword.text}>
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell>{keyword.text}</TableCell>
                                                    <TableCell className="text-right">{keyword.value}件</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Potential Needs Keywords */}
                                <div>
                                    <h3 className="text-lg font-bold mb-4 text-blue-700">潜在ニーズキーワード<span className="text-sm font-normal text-gray-500 ml-2">（少数の問い合わせ）</span></h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">順位</TableHead>
                                                <TableHead>キーワード</TableHead>
                                                <TableHead className="text-right">件数</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {potentialNeedsKeywords.map((keyword, index) => (
                                                <TableRow key={keyword.text}>
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell>{keyword.text}</TableCell>
                                                    <TableCell className="text-right">{keyword.value}件</TableCell>
                                                </TableRow>
                                            ))}
                                            {potentialNeedsKeywords.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                                                        該当するキーワードはありません
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
