"use client"

import { useMemo, useState, useEffect } from "react"
import { Email } from "@/lib/types"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
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
import { BarChart3, Database, AlertCircle } from "lucide-react"

interface AnalyzedWord {
    word: string;
    count: number;
}

interface TFIDFWord {
    word: string;
    score: number;
}

interface ColabAnalysisData {
    updated_at: string;
    total_count: number;
    keywords_top20: AnalyzedWord[];
    disease: AnalyzedWord[];
    symptoms: AnalyzedWord[];
    concerns: AnalyzedWord[];
    inquiry_types: AnalyzedWord[];
    bigrams_top20?: AnalyzedWord[]; // Optional in case older data doesn't have it
    keywords_tfidf?: TFIDFWord[];
    cooccurrence?: Record<string, AnalyzedWord[]>;
    sentiment_summary?: {
        positive_count: number;
        negative_count: number;
        neutral_count: number;
        mixed_count: number;
        average_scores: {
            positive: number;
            negative: number;
            neutral: number;
        }
    };
}

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
    const [colabData, setColabData] = useState<ColabAnalysisData | null>(null);
    const [loadingColab, setLoadingColab] = useState(false);
    const [selectedCooccurrenceKey, setSelectedCooccurrenceKey] = useState<string>("");

    useEffect(() => {
        const fetchColabAnalysis = async () => {
            if (!isOpen) return;
            try {
                setLoadingColab(true);
                // db can be null if config is broken, so check, although in this project context it should be fine.
                // Assuming db is imported as Firestore | null
                if (!db) {
                    console.warn("Firestore not loaded or not initialized");
                    return;
                }
                const docRef = doc(db, 'analysis_results', 'latest');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as ColabAnalysisData;
                    setColabData(data);
                    if (data.cooccurrence) {
                        const keys = Object.keys(data.cooccurrence);
                        if (keys.length > 0) setSelectedCooccurrenceKey(keys[0]);
                    }
                } else {
                    setColabData(null);
                }
            } catch (error) {
                console.error("Error fetching colab analysis:", error);
                setColabData(null);
            } finally {
                setLoadingColab(false);
            }
        };

        fetchColabAnalysis();
    }, [isOpen]);

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

                <div className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="p-6">
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

                        </div>
                    </div>

                    {/* Section 2: Colab Analysis (All Time) */}
                    <div className="bg-slate-100 border-t border-gray-200 p-6 lg:p-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex flex-col gap-1 mb-6 border-b border-gray-100 pb-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                        <Database className="h-6 w-6 text-indigo-600" />
                                        Colab詳細分析（形態素解析）
                                    </h3>
                                    {colabData && (
                                        <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                            最終更新: {new Date(colabData.updated_at).toLocaleString('ja-JP')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 ml-8">
                                    ※全期間のデータに基づく分析です（期間フィルターは適用されません）
                                </p>
                            </div>

                            {loadingColab ? (
                                <div className="flex justify-center items-center h-[300px] text-gray-500">
                                    読み込み中...
                                </div>
                            ) : !colabData ? (
                                <div className="flex justify-center items-center h-[200px] bg-gray-50 rounded-lg text-gray-500">
                                    分析データがありません。Google Colabで分析を実行してください。
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    {/* Summary Section */}
                                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                                        <h4 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-700">
                                            📋 分析サマリー
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                            {/* Data Overview */}
                                            <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100 flex flex-col justify-center">
                                                <div className="text-xs text-gray-500 font-medium mb-1">総問い合わせ件数</div>
                                                <div className="text-2xl font-bold text-gray-800">{colabData.total_count.toLocaleString()}件</div>
                                            </div>

                                            {/* Disease Top 3 */}
                                            <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100 lg:col-span-1">
                                                <div className="text-xs text-blue-600 font-bold mb-2 border-b border-blue-100 pb-1">■ 病名・診断 TOP3</div>
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    {colabData.disease.slice(0, 3).map((item, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span className="font-medium">{item.word}</span>
                                                            <span className="text-gray-500 text-xs">({item.count}件)</span>
                                                        </div>
                                                    ))}
                                                    {colabData.disease.length === 0 && <span className="text-gray-400 text-xs">データなし</span>}
                                                </div>
                                            </div>

                                            {/* Symptoms Top 3 */}
                                            <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100 lg:col-span-1">
                                                <div className="text-xs text-orange-500 font-bold mb-2 border-b border-orange-100 pb-1">■ 症状 TOP3</div>
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    {colabData.symptoms.slice(0, 3).map((item, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span className="font-medium">{item.word}</span>
                                                            <span className="text-gray-500 text-xs">({item.count}件)</span>
                                                        </div>
                                                    ))}
                                                    {colabData.symptoms.length === 0 && <span className="text-gray-400 text-xs">データなし</span>}
                                                </div>
                                            </div>

                                            {/* Concerns Top 3 */}
                                            <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100 lg:col-span-1">
                                                <div className="text-xs text-green-600 font-bold mb-2 border-b border-green-100 pb-1">■ 悩み・状況 TOP3</div>
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    {colabData.concerns.slice(0, 3).map((item, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span className="font-medium">{item.word}</span>
                                                            <span className="text-gray-500 text-xs">({item.count}件)</span>
                                                        </div>
                                                    ))}
                                                    {colabData.concerns.length === 0 && <span className="text-gray-400 text-xs">データなし</span>}
                                                </div>
                                            </div>

                                            {/* Inquiry Types Top 3 */}
                                            <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100 lg:col-span-1">
                                                <div className="text-xs text-purple-600 font-bold mb-2 border-b border-purple-100 pb-1">■ 相談内容 TOP3</div>
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    {colabData.inquiry_types.slice(0, 3).map((item, i) => (
                                                        <div key={i} className="flex justify-between">
                                                            <span className="font-medium">{item.word}</span>
                                                            <span className="text-gray-500 text-xs">({item.count}件)</span>
                                                        </div>
                                                    ))}
                                                    {colabData.inquiry_types.length === 0 && <span className="text-gray-400 text-xs">データなし</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sentiment Analysis Section */}
                                    {colabData.sentiment_summary ? (
                                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                                            {/* ... (Existing Content) ... */}
                                            <h4 className="text-base font-bold flex items-center gap-2 mb-4 text-slate-700">
                                                ❤️ 感情分析（AI判定）
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                {/* Sentiment Pie Chart */}
                                                <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100 flex flex-col items-center">
                                                    <h5 className="text-sm font-bold mb-2">感情分布</h5>
                                                    <div className="w-full h-[200px]">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={[
                                                                        { name: 'ポジティブ', value: colabData.sentiment_summary.positive_count, color: '#22c55e' },
                                                                        { name: 'ネガティブ', value: colabData.sentiment_summary.negative_count, color: '#ef4444' },
                                                                        { name: 'ニュートラル', value: colabData.sentiment_summary.neutral_count, color: '#94a3b8' },
                                                                        { name: '混合', value: colabData.sentiment_summary.mixed_count, color: '#eab308' },
                                                                    ].filter(d => d.value > 0)}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={60}
                                                                    outerRadius={80}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    {[
                                                                        { name: 'ポジティブ', value: colabData.sentiment_summary.positive_count, color: '#22c55e' },
                                                                        { name: 'ネガティブ', value: colabData.sentiment_summary.negative_count, color: '#ef4444' },
                                                                        { name: 'ニュートラル', value: colabData.sentiment_summary.neutral_count, color: '#94a3b8' },
                                                                        { name: '混合', value: colabData.sentiment_summary.mixed_count, color: '#eab308' },
                                                                    ].filter(d => d.value > 0).map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip />
                                                                <Legend />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                {/* Scores & Alerts */}
                                                <div className="lg:col-span-2 flex flex-col gap-4">
                                                    {/* Alert if Negative is significant */}
                                                    {(colabData.sentiment_summary.negative_count > colabData.sentiment_summary.positive_count ||
                                                        colabData.sentiment_summary.negative_count > (colabData.total_count * 0.2)) && (
                                                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
                                                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="font-bold">ネガティブな問い合わせが増加しています</p>
                                                                    <p className="text-sm">
                                                                        ネガティブ判定のメールが全体の {(colabData.sentiment_summary.negative_count / colabData.total_count * 100).toFixed(1)}% ({colabData.sentiment_summary.negative_count}件) 検出されました。
                                                                        対応の優先度を見直すことをお勧めします。
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100">
                                                            <div className="text-xs text-gray-500 mb-1">ポジティブ平均</div>
                                                            <div className="text-xl font-bold text-green-600">
                                                                {(colabData.sentiment_summary.average_scores.positive * 100).toFixed(1)}<span className="text-sm text-gray-400">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100">
                                                            <div className="text-xs text-gray-500 mb-1">ネガティブ平均</div>
                                                            <div className="text-xl font-bold text-red-600">
                                                                {(colabData.sentiment_summary.average_scores.negative * 100).toFixed(1)}<span className="text-sm text-gray-400">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100">
                                                            <div className="text-xs text-gray-500 mb-1">ニュートラル平均</div>
                                                            <div className="text-xl font-bold text-slate-600">
                                                                {(colabData.sentiment_summary.average_scores.neutral * 100).toFixed(1)}<span className="text-sm text-gray-400">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-5 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center text-center gap-2">
                                            <h4 className="text-base font-bold text-gray-500">感情分析データがありません</h4>
                                            <p className="text-sm text-gray-400">
                                                Colabでアクセストークン（azure_textanalytics_key.txt）が正しく読み込まれていない可能性があります。<br />
                                                Google Driveの設定を確認してください。
                                            </p>
                                        </div>
                                    )}

                                    {/* Categories Grid (Top 10 Keywords removed by request) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Disease */}
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 text-gray-700 border-l-4 pl-2" style={{ borderColor: '#3b82f6' }}>
                                                病名・診断
                                            </h4>
                                            <div className="w-full h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.disease.slice(0, 5).map(item => ({ name: item.word, value: item.count }))}
                                                        layout="vertical"
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Symptom */}
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 text-gray-700 border-l-4 pl-2" style={{ borderColor: '#f97316' }}>
                                                症状
                                            </h4>
                                            <div className="w-full h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.symptoms.slice(0, 5).map(item => ({ name: item.word, value: item.count }))}
                                                        layout="vertical"
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Concern */}
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 text-gray-700 border-l-4 pl-2" style={{ borderColor: '#22c55e' }}>
                                                悩み・状況
                                            </h4>
                                            <div className="w-full h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.concerns.slice(0, 5).map(item => ({ name: item.word, value: item.count }))}
                                                        layout="vertical"
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Inquiry Type */}
                                        <div>
                                            <h4 className="text-md font-semibold mb-2 text-gray-700 border-l-4 pl-2" style={{ borderColor: '#a855f7' }}>
                                                相談内容
                                            </h4>
                                            <div className="w-full h-[250px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.inquiry_types.slice(0, 5).map(item => ({ name: item.word, value: item.count }))}
                                                        layout="vertical"
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bigrams (Consultation Patterns) */}
                                    {colabData.bigrams_top20 && colabData.bigrams_top20.length > 0 && (
                                        <div className="border-t border-gray-100 pt-6 mt-2">
                                            <h4 className="text-md font-bold mb-4 text-gray-700 flex items-center gap-2">
                                                🔗 よくある相談パターン
                                            </h4>
                                            <div className="w-full h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.bigrams_top20.slice(0, 10).map(item => ({ name: item.word, value: item.count }))}
                                                        layout="vertical"
                                                        margin={{ left: 20 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#8b5cf6" name="出現回数" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Top 10 Keywords (Reference) */}
                                    <div className="border-t border-gray-100 pt-6 mt-2">
                                        <h4 className="text-md font-bold mb-4 text-gray-700 flex items-center gap-2">
                                            📊 参考：キーワード分析
                                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">※精度向上中</span>
                                        </h4>
                                        <div className="w-full h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={colabData.keywords_top20.slice(0, 10).map(item => ({ name: item.word, value: item.count }))}
                                                    layout="vertical"
                                                    margin={{ left: 20 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis type="number" />
                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" fill="#64748b" name="出現回数" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* TF-IDF Analysis */}
                                    {colabData.keywords_tfidf && colabData.keywords_tfidf.length > 0 && (
                                        <div className="border-t border-gray-100 pt-6 mt-2">
                                            <h4 className="text-md font-bold mb-4 text-gray-700 flex items-center gap-2">
                                                📈 重要キーワード（TF-IDF）
                                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">※特徴的な単語を重視</span>
                                            </h4>
                                            <div className="w-full h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.keywords_tfidf.slice(0, 10).map(item => ({ name: item.word, value: item.score }))}
                                                        layout="vertical"
                                                        margin={{ left: 20 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" tickFormatter={(value) => value.toFixed(2)} />
                                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                        <Tooltip formatter={(value: number) => value.toFixed(2)} />
                                                        <Bar dataKey="value" fill="#14b8a6" name="スコア" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Co-occurrence Analysis */}
                                    {colabData.cooccurrence && Object.keys(colabData.cooccurrence).length > 0 && (
                                        <div className="border-t border-gray-100 pt-6 mt-2">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-md font-bold text-gray-700 flex items-center gap-2">
                                                    🔍 キーワード関連分析
                                                </h4>
                                                <div className="w-[180px]">
                                                    <Select
                                                        value={selectedCooccurrenceKey}
                                                        onValueChange={setSelectedCooccurrenceKey}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="キーワード選択" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.keys(colabData.cooccurrence).map((key) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {key}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {selectedCooccurrenceKey && colabData.cooccurrence[selectedCooccurrenceKey] && (
                                                <div className="w-full h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={colabData.cooccurrence[selectedCooccurrenceKey].slice(0, 10).map(item => ({ name: item.word, value: item.count }))}
                                                            layout="vertical"
                                                            margin={{ left: 20 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis type="number" />
                                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                            <Tooltip />
                                                            <Bar dataKey="value" fill="#f97316" name="共起回数" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog >
    )
}
