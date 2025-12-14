"use client"

import { useMemo, useState, useEffect } from "react"
import { Email } from "@/lib/types"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, limit, getDocs } from "firebase/firestore"
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
import { BarChart3, Database, AlertCircle, MessageSquare, Star, Quote, Lightbulb, ArrowRightLeft, Target } from "lucide-react"

interface AnalyzedWord {
    word: string;
    count: number;
}

interface TFIDFWord {
    word: string;
    score: number;
}

interface Review {
    id: string;
    name: string;
    author?: string; // Fallback
    rating: number;
    text: string;
    date_text: string;
    date?: string; // Fallback
    scraped_at?: string;
    created_at?: unknown;
}

interface ReviewSentimentData {
    updated_at: string;
    total_count: number;
    source: string;
    summary: { // Structure from Python script
        positive_count: number;
        negative_count: number;
        neutral_count: number;
        mixed_count: number;
        average_scores: {
            positive: number;
            negative: number;
            neutral: number;
        };
    };
    // Flattened structure fallback if user changed structure
    positive_count?: number;
    negative_count?: number;
    neutral_count?: number;
    mixed_count?: number;
    average_scores?: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

interface CorrelationAnalysisData {
    updated_at: string;
    email_count: number;
    review_count: number;
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
    improvement_suggestions: string[]; // Deprecated, use weakness_keywords
    strength_keywords?: AnalyzedWord[];
    weakness_keywords?: AnalyzedWord[];
}

interface ColabAnalysisData {
    updated_at: string;
    total_count: number;
    keywords_top20: AnalyzedWord[];
    disease: AnalyzedWord[];
    symptoms: AnalyzedWord[];
    concerns: AnalyzedWord[];
    inquiry_types: AnalyzedWord[];
    bigrams_top20?: { word?: string; words?: string; count: number }[]; // Optional in case older data doesn't have it
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
    const [reviewSentiment, setReviewSentiment] = useState<ReviewSentimentData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [correlationData, setCorrelationData] = useState<CorrelationAnalysisData | null>(null);
    const [loadingColab, setLoadingColab] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(false);
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

        const fetchReviewData = async () => {
            if (!isOpen) return;
            try {
                setLoadingReviews(true);
                if (!db) return;

                // 1. Fetch Sentiment Analysis
                const sentimentRef = doc(db, 'analysis_results', 'reviews_sentiment');
                const sentimentSnap = await getDoc(sentimentRef);
                if (sentimentSnap.exists()) {
                    setReviewSentiment(sentimentSnap.data() as ReviewSentimentData);
                } else {
                    setReviewSentiment(null);
                }

                // 2. Fetch Correlation Analysis
                const correlationRef = doc(db, 'analysis_results', 'correlation_analysis');
                const correlationSnap = await getDoc(correlationRef);
                if (correlationSnap.exists()) {
                    setCorrelationData(correlationSnap.data() as CorrelationAnalysisData);
                } else {
                    setCorrelationData(null);
                }

                // 3. Fetch Recent Reviews
                // Note: 'date' or 'scraped_at' might vary, checking latest documents usually implies sorting.
                // Since user didn't specify sort key, we try 'scraped_at' or 'created_at' if available, else just get some.
                const reviewsRef = collection(db, 'reviews');
                // Try to get latest 50 for stats
                const q = query(reviewsRef, limit(100));
                const querySnapshot = await getDocs(q);

                const loadedReviews: Review[] = [];
                querySnapshot.forEach((doc) => {
                    loadedReviews.push({ id: doc.id, ...doc.data() } as Review);
                });

                // Sort by star rating or date if possible? 
                // For now, client-side sort if needed.
                setReviews(loadedReviews);

            } catch (error) {
                console.error("Error fetching review data:", error);
            } finally {
                setLoadingReviews(false);
            }
        };

        fetchColabAnalysis();
        fetchReviewData();
    }, [isOpen]);

    // Review Stats Calculation
    const reviewStats = useMemo(() => {
        if (reviews.length === 0) return null;

        const count = reviews.length;
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = totalRating / count;

        const starCounts = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5
        reviews.forEach(r => {
            const star = Math.round(r.rating || 0);
            if (star >= 1 && star <= 5) {
                starCounts[star - 1]++;
            }
        });

        const starData = starCounts.map((count, i) => ({
            name: `${i + 1}星`,
            value: count
        })).reverse(); // 5 stars top

        return { count, avgRating, starData };
    }, [reviews]);


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
                                                                        { name: 'ポジティブ', value: colabData.sentiment_summary?.positive_count || 0, color: '#22c55e' },
                                                                        { name: 'ネガティブ', value: colabData.sentiment_summary?.negative_count || 0, color: '#ef4444' },
                                                                        { name: 'ニュートラル', value: colabData.sentiment_summary?.neutral_count || 0, color: '#94a3b8' },
                                                                        { name: '混合', value: colabData.sentiment_summary?.mixed_count || 0, color: '#eab308' },
                                                                    ].filter(d => d.value > 0)}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={60}
                                                                    outerRadius={80}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    {[
                                                                        { name: 'ポジティブ', value: colabData.sentiment_summary?.positive_count || 0, color: '#22c55e' },
                                                                        { name: 'ネガティブ', value: colabData.sentiment_summary?.negative_count || 0, color: '#ef4444' },
                                                                        { name: 'ニュートラル', value: colabData.sentiment_summary?.neutral_count || 0, color: '#94a3b8' },
                                                                        { name: '混合', value: colabData.sentiment_summary?.mixed_count || 0, color: '#eab308' },
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
                                                    {(() => {
                                                        const summary = colabData.sentiment_summary;
                                                        if (!summary) return null;
                                                        const neg = summary.negative_count || 0;
                                                        const pos = summary.positive_count || 0;
                                                        const total = colabData.total_count || 1;

                                                        if (neg > pos || neg > (total * 0.2)) {
                                                            return (
                                                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
                                                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="font-bold">ネガティブな問い合わせが増加しています</p>
                                                                        <p className="text-sm">
                                                                            ネガティブ判定のメールが全体の {(neg / total * 100).toFixed(1)}% ({neg}件) 検出されました。
                                                                            対応の優先度を見直すことをお勧めします。
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}

                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100">
                                                            <div className="text-xs text-gray-500 mb-1">ポジティブ平均</div>
                                                            <div className="text-xl font-bold text-green-600">
                                                                {(colabData.sentiment_summary?.average_scores?.positive ? colabData.sentiment_summary.average_scores.positive * 100 : 0).toFixed(1)}<span className="text-sm text-gray-400">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100">
                                                            <div className="text-xs text-gray-500 mb-1">ネガティブ平均</div>
                                                            <div className="text-xl font-bold text-red-600">
                                                                {(colabData.sentiment_summary?.average_scores?.negative ? colabData.sentiment_summary.average_scores.negative * 100 : 0).toFixed(1)}<span className="text-sm text-gray-400">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-md shadow-sm border border-slate-100">
                                                            <div className="text-xs text-gray-500 mb-1">ニュートラル平均</div>
                                                            <div className="text-xl font-bold text-slate-600">
                                                                {(colabData.sentiment_summary?.average_scores?.neutral ? colabData.sentiment_summary.average_scores.neutral * 100 : 0).toFixed(1)}<span className="text-sm text-gray-400">%</span>
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
                                            <h4 className="text-md font-bold mb-4 text-gray-700 flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    🔗 よくある相談パターン
                                                </div>
                                                <p className="text-xs text-gray-400 font-normal ml-6">
                                                    2つの単語がセットで使われるパターンです。例：「初診 → 予約」は、初診と予約が一緒に問い合わせされることが多いことを示します。
                                                </p>
                                            </h4>
                                            <div className="w-full h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={colabData.bigrams_top20.slice(0, 10).map(item => ({ name: item.words || item.word || "", value: item.count }))}
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
                                        <h4 className="text-md font-bold mb-4 text-gray-700 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                📊 参考：キーワード分析
                                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">※精度向上中</span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-normal ml-6">
                                                問い合わせメールで多く使われている単語のランキングです。数字は出現回数を表します。
                                            </p>
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
                                            <h4 className="text-md font-bold mb-4 text-gray-700 flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    📈 重要キーワード（TF-IDF）
                                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">※特徴的な単語を重視</span>
                                                </div>
                                                <p className="text-xs text-gray-400 font-normal ml-6">
                                                    他のクリニックと比べて、このクリニックの問い合わせで特に目立つ単語です。スコアが高いほど特徴的な単語です。
                                                </p>
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
                                                <h4 className="text-md font-bold text-gray-700 flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        🔍 キーワード関連分析
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-normal ml-6">
                                                        選択した単語と一緒に使われることが多い単語を表示します。例：「予約」を選ぶと、予約と一緒に使われる単語がわかります。
                                                    </p>
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

                        {/* Section 3: Google Maps Reviews Analysis */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
                            <div className="flex flex-col gap-1 mb-6 border-b border-gray-100 pb-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                        <MessageSquare className="h-6 w-6 text-green-600" />
                                        Googleマップ クチコミ分析
                                    </h3>
                                    {reviewSentiment && (
                                        <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                            最終更新: {new Date(reviewSentiment.updated_at).toLocaleString('ja-JP')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 ml-8">
                                    ※Googleマップに投稿された口コミデータの分析です
                                </p>
                            </div>

                            {loadingReviews ? (
                                <div className="flex justify-center items-center h-[200px] text-gray-500">
                                    読み込み中...
                                </div>
                            ) : !reviewStats ? (
                                <div className="flex justify-center items-center h-[200px] bg-gray-50 rounded-lg text-gray-500">
                                    口コミデータがありません。
                                </div>
                            ) : (
                                <div className="flex flex-col gap-8">
                                    {/* 1. Overview Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                                            <div className="text-sm text-orange-600 font-bold mb-2">総コミ件数</div>
                                            <div className="text-3xl font-bold text-gray-800">{reviewStats.count}件</div>
                                        </div>
                                        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 flex flex-col items-center justify-center">
                                            <div className="text-sm text-yellow-600 font-bold mb-2">平均評価</div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-4xl font-bold text-gray-800">{reviewStats.avgRating.toFixed(1)}</span>
                                                <div className="flex mb-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-5 h-5 ${i < Math.round(reviewStats.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Sentiment Summary Card */}
                                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center justify-center">
                                            <div className="text-sm text-blue-600 font-bold mb-2">AI感情分析</div>
                                            <div className="flex gap-4 text-center">
                                                <div>
                                                    <div className="text-xs text-gray-500">Pos</div>
                                                    <div className="text-xl font-bold text-green-600">
                                                        {reviewSentiment?.summary?.positive_count ||
                                                            reviewSentiment?.positive_count || 0}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500">Neg</div>
                                                    <div className="text-xl font-bold text-red-600">
                                                        {reviewSentiment?.summary?.negative_count ||
                                                            reviewSentiment?.negative_count || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Charts Row */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Star Distribution */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                <Star className="w-5 h-5 text-yellow-500" />
                                                評価分布（星の数）
                                            </h4>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={reviewStats.starData} layout="vertical" margin={{ left: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={40} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#666' }} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Sentiment Distribution */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                <AlertCircle className="w-5 h-5 text-blue-500" />
                                                感情分析（AI判定）
                                            </h4>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'ポジティブ', value: reviewSentiment?.summary?.positive_count || reviewSentiment?.positive_count || 0, color: '#22c55e' },
                                                                { name: 'ネガティブ', value: reviewSentiment?.summary?.negative_count || reviewSentiment?.negative_count || 0, color: '#ef4444' },
                                                                { name: 'ニュートラル', value: reviewSentiment?.summary?.neutral_count || reviewSentiment?.neutral_count || 0, color: '#94a3b8' },
                                                                { name: '混合', value: reviewSentiment?.summary?.mixed_count || reviewSentiment?.mixed_count || 0, color: '#eab308' },
                                                            ].filter(d => d.value > 0)}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {[
                                                                { name: 'ポジティブ', value: reviewSentiment?.summary?.positive_count || reviewSentiment?.positive_count || 0, color: '#22c55e' },
                                                                { name: 'ネガティブ', value: reviewSentiment?.summary?.negative_count || reviewSentiment?.negative_count || 0, color: '#ef4444' },
                                                                { name: 'ニュートラル', value: reviewSentiment?.summary?.neutral_count || reviewSentiment?.neutral_count || 0, color: '#94a3b8' },
                                                                { name: '混合', value: reviewSentiment?.summary?.mixed_count || reviewSentiment?.mixed_count || 0, color: '#eab308' },
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
                                    </div>

                                    {/* 3. Recent Reviews */}
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <Quote className="w-5 h-5 text-gray-500" />
                                            最新の口コミ
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {reviews.slice(0, 6).map((review) => (
                                                <div key={review.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-bold text-gray-800">{review.name || review.author || '匿名'}</div>
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                            <span className="font-bold">{review.rating}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-600 line-clamp-3 mb-2">
                                                        {review.text || <span className="text-gray-400 italic">(本文なし)</span>}
                                                    </p>
                                                    <div className="text-xs text-gray-400 text-right">
                                                        {review.date_text || review.date || '日付不明'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 4: Correlation Analysis */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
                            <div className="flex flex-col gap-1 mb-6 border-b border-gray-100 pb-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                        <ArrowRightLeft className="h-6 w-6 text-purple-600" />
                                        口コミ×メール相関分析
                                    </h3>
                                    {correlationData && (
                                        <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                            最終更新: {new Date(correlationData.updated_at).toLocaleString('ja-JP')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 ml-8">
                                    ※口コミとメールの共通傾向を分析し、改善ポイントを可視化します
                                </p>
                            </div>

                            {loadingReviews ? (
                                <div className="flex justify-center items-center h-[200px] text-gray-500">
                                    読み込み中...
                                </div>
                            ) : !correlationData ? (
                                <div className="flex justify-center items-center h-[200px] bg-gray-50 rounded-lg text-gray-500">
                                    相関分析データがありません。
                                </div>
                            ) : (
                                <div className="flex flex-col gap-8">
                                    {/* 1. Strength & Weakness Points */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Strength Points (Green) */}
                                        <div className="bg-green-50 p-6 rounded-xl border border-green-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Target className="w-32 h-32 text-green-600" />
                                            </div>
                                            <div className="relative z-10">
                                                <h4 className="text-lg font-bold text-green-700 flex items-center gap-2 mb-4">
                                                    <Lightbulb className="w-6 h-6 text-green-500 fill-green-500" />
                                                    強みポイント (AI分析)
                                                </h4>
                                                <p className="text-sm text-green-600 mb-4">
                                                    高評価口コミとメールで共通するキーワードです。これらは患者様に評価されているクリニックの強みです。
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {correlationData.strength_keywords && correlationData.strength_keywords.length > 0 ? (
                                                        correlationData.strength_keywords.map((item, i) => (
                                                            <span key={i} className="px-3 py-1 bg-white text-green-700 font-bold rounded-lg shadow-sm border border-green-100 text-sm flex items-center gap-1">
                                                                {item.word}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">データなし</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Weakness Points (Red) */}
                                        <div className="bg-red-50 p-6 rounded-xl border border-red-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <AlertCircle className="w-32 h-32 text-red-600" />
                                            </div>
                                            <div className="relative z-10">
                                                <h4 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
                                                    <Lightbulb className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                                    優先改善ポイント (AI分析)
                                                </h4>
                                                <p className="text-sm text-red-600 mb-4">
                                                    メールと低評価口コミの両方で頻出するキーワードです。主要な改善課題となる可能性があります。
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {correlationData.weakness_keywords && correlationData.weakness_keywords.length > 0 ? (
                                                        correlationData.weakness_keywords.map((item, i) => (
                                                            <span key={i} className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg shadow-sm border border-red-100 text-lg">
                                                                {item.word}
                                                            </span>
                                                        ))
                                                    ) : correlationData.improvement_suggestions && correlationData.improvement_suggestions.length > 0 ? (
                                                        correlationData.improvement_suggestions.map((word, i) => (
                                                            <span key={i} className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg shadow-sm border border-red-100 text-lg">
                                                                {word}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">特になし</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Keyword Comparison Charts */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Email TOP */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="text-sm font-bold text-gray-500 mb-4 text-center border-b pb-2">お問い合わせ (メール) TOP10</div>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={correlationData.email_top20.slice(0, 10).reverse()} layout="vertical" margin={{ left: 30 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="word" type="category" width={60} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        {/* All Reviews TOP */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="text-sm font-bold text-gray-500 mb-4 text-center border-b pb-2">口コミ (全体) TOP10</div>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={correlationData.review_top20.slice(0, 10).reverse()} layout="vertical" margin={{ left: 30 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="word" type="category" width={60} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={15} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        {/* Low Rating Reviews TOP */}
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="text-sm font-bold text-red-500 mb-4 text-center border-b pb-2">低評価口コミ (★1-2) TOP10</div>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={correlationData.low_rating_top20.slice(0, 10).reverse()} layout="vertical" margin={{ left: 30 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="word" type="category" width={60} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={15} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Correlation Scores & Common Words */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Correlation Scores */}
                                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                                            <h4 className="text-md font-bold text-gray-700 mb-4 flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                                                    相関スコア
                                                </div>
                                                <p className="text-xs text-gray-400 font-normal ml-7">
                                                    口コミとメールのキーワードがどれくらい似ているかを示します。25%以上であれば共通の課題がある可能性があります。
                                                </p>
                                            </h4>
                                            <div className="space-y-6">
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">メール × 全口コミ</span>
                                                        <span className="font-bold text-gray-800">{(correlationData.correlation_scores.email_review * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${correlationData.correlation_scores.email_review * 100}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-600">メール × 低評価口コミ</span>
                                                        <span className="font-bold text-red-600">{(correlationData.correlation_scores.email_low_rating * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${correlationData.correlation_scores.email_low_rating * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Common Words */}
                                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                <Target className="w-5 h-5 text-blue-500" />
                                                共通キーワード
                                            </h4>
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <span className="text-xs text-gray-500 mb-1 block">全データ共通</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {correlationData.common_all.slice(0, 10).map((word, i) => (
                                                            <span key={i} className="px-2 py-1 bg-white border border-gray-200 text-xs rounded text-gray-600">
                                                                {word}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-red-500 mb-1 block">メール＆低評価で共通</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {correlationData.common_email_low_rating.slice(0, 10).map((word, i) => (
                                                            <span key={i} className="px-2 py-1 bg-red-50 border border-red-100 text-xs rounded text-red-600 font-bold">
                                                                {word}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog >
    )
}
