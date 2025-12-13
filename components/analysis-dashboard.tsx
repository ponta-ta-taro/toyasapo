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
    // メール特有
    "メール", "アドレス", "問い合わせ", "問合せ", "連絡", "返信", "送信", "受信", "件名", "宛先", "相談", "お願い", "申し訳"
]);

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

    const wordCloudData = useMemo(() => {
        const counts: Record<string, number> = {};

        filteredEmails.forEach(email => {
            if (!email.inquiry) return;
            const segments = extractWords(email.inquiry);

            segments.forEach(word => {
                // Filter: not in STOP_WORDS (Regex ensures length >= 2)
                if (!STOP_WORDS.has(word)) {
                    counts[word] = (counts[word] || 0) + 1;
                }
            });
        });

        // Convert to array and sort
        return Object.entries(counts)
            .map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50); // Limit to top 50 words for visualization
    }, [filteredEmails]);

    const topKeywords = useMemo(() => {
        return wordCloudData.slice(0, 5);
    }, [wordCloudData]);

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
                        {/* Priority Chart (New) */}
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

                        {/* Category Chart */}
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

                        {/* Month Chart */}
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

                        {/* Keyword Analysis Section */}
                        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Word Cloud */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h3 className="text-lg font-bold mb-4">よくある問い合わせキーワード</h3>
                                <div className="w-full min-h-[300px] flex items-center justify-center">
                                    <WordCloud words={wordCloudData} />
                                </div>
                            </div>

                            {/* Ranking Table */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
                        </div>

                        {/* Time Chart */}
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

                        {/* Day Chart */}
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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
