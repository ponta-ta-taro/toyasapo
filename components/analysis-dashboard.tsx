"use client"

import { useMemo } from "react"
import { Email } from "@/lib/types"
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
import { BarChart3 } from "lucide-react"

interface AnalysisDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    emails: Email[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const TIME_RANGES = ["0-6時", "6-12時", "12-18時", "18-24時"];

export function AnalysisDashboard({ isOpen, onClose, emails }: AnalysisDashboardProps) {

    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};

        emails.forEach(e => {
            const cat = e.classification?.category || "未分類";
            counts[cat] = (counts[cat] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [emails]);

    const timeData = useMemo(() => {
        const counts = [0, 0, 0, 0]; // 0-6, 6-12, 12-18, 18-24

        emails.forEach(e => {
            if (!e.datetime) return;
            const date = new Date(e.datetime);
            const hour = date.getHours();

            if (hour < 6) counts[0]++;
            else if (hour < 12) counts[1]++;
            else if (hour < 18) counts[2]++;
            else counts[3]++;
        });

        return TIME_RANGES.map((range, i) => ({ name: range, value: counts[i] }));
    }, [emails]);

    const dayData = useMemo(() => {
        const counts = Array(7).fill(0);

        emails.forEach(e => {
            if (!e.datetime) return;
            const date = new Date(e.datetime);
            const day = date.getDay();
            counts[day]++;
        });

        return DAYS.map((day, i) => ({ name: day, value: counts[i] }));
    }, [emails]);

    const monthData = useMemo(() => {
        const counts: Record<string, number> = {};

        emails.forEach(e => {
            if (!e.datetime) return;
            const date = new Date(e.datetime);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        return Object.entries(counts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, value]) => ({ name, value }));
    }, [emails]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
                <div className="p-6 border-b border-gray-200 shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                        問い合わせデータ分析
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                        全{emails.length}件の問い合わせデータの集計結果を表示しています。
                    </DialogDescription>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center">
                            <h3 className="text-lg font-bold mb-4 w-full text-left">カテゴリ別件数</h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Month Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
                                        <Legend />
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
                                        <Legend />
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
