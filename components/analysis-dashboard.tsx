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
import { BarChart3, Database } from "lucide-react"

interface AnalyzedWord {
    word: string;
    count: number;
}

interface ColabAnalysisData {
    updated_at: string;
    total_count: number;
    keywords_top20: AnalyzedWord[];
    disease: AnalyzedWord[];
    symptoms: AnalyzedWord[];
    concerns: AnalyzedWord[];
    inquiry_types: AnalyzedWord[];
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
                    setColabData(docSnap.data() as ColabAnalysisData);
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


                        {/* 6. Colab Detailed Analysis Section */}
                        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Database className="h-5 w-5 text-indigo-600" />
                                    Colab詳細分析（形態素解析）
                                </h3>
                                {colabData && (
                                    <span className="text-sm text-gray-500">
                                        最終更新: {new Date(colabData.updated_at).toLocaleString('ja-JP')}
                                    </span>
                                )}
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
                                <div className="flex flex-col gap-8">
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
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
