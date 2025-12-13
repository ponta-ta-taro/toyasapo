import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';

interface DataAnalyticsProps {
  onClose: () => void;
}

// カテゴリ別件数データ
const categoryData = [
  { name: '症状相談', value: 556, percentage: 41, color: '#0ea5e9' }, // sky-500
  { name: '予約', value: 542, percentage: 40, color: '#14b8a6' }, // teal-500
  { name: '料金', value: 108, percentage: 8, color: '#f59e0b' }, // amber-500
  { name: 'その他', value: 81, percentage: 6, color: '#ef4444' }, // red-500
  { name: '未分類', value: 41, percentage: 3, color: '#6366f1' }, // indigo-500
  { name: '料金', value: 27, percentage: 2, color: '#eab308' }, // yellow-500
];

// 月別推移データ
const monthlyData = [
  { month: '2020-06', count: 18 },
  { month: '2020-09', count: 25 },
  { month: '2020-12', count: 22 },
  { month: '2021-03', count: 28 },
  { month: '2021-06', count: 35 },
  { month: '2021-09', count: 42 },
  { month: '2021-12', count: 38 },
  { month: '2022-03', count: 33 },
  { month: '2022-06', count: 45 },
  { month: '2022-09', count: 30 },
  { month: '2022-12', count: 25 },
  { month: '2023-03', count: 28 },
  { month: '2023-06', count: 22 },
  { month: '2023-09', count: 18 },
  { month: '2023-12', count: 15 },
  { month: '2024-03', count: 12 },
  { month: '2024-06', count: 10 },
  { month: '2024-09', count: 8 },
  { month: '2024-12', count: 5 },
];

// 時間帯別件数データ
const timeSlotData = [
  { timeSlot: '0-6時', count: 45 },
  { timeSlot: '6-12時', count: 1150 },
  { timeSlot: '12-18時', count: 98 },
  { timeSlot: '18-24時', count: 62 },
];

// 曜日別件数データ
const weekdayData = [
  { day: '日', count: 35 },
  { day: '月', count: 195 },
  { day: '火', count: 168 },
  { day: '水', count: 205 },
  { day: '木', count: 185 },
  { day: '金', count: 210 },
  { day: '土', count: 147 },
];

export function DataAnalytics({ onClose }: DataAnalyticsProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-gray-800 text-white px-6 py-4 flex items-center justify-between rounded-t-xl shadow-md z-10">
          <div>
            <h2 className="text-white text-xl flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              問い合わせデータ分析
            </h2>
            <p className="text-gray-400 text-sm mt-1">全1,104件の問い合わせデータの統計情報を表示しています。</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* グラフコンテンツ */}
        <div className="p-6 grid grid-cols-2 gap-6">
          {/* カテゴリ別件数 */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5 shadow">
            <h3 className="text-gray-900 mb-4">カテゴリ別件数</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {categoryData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-700">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 月別推移 */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5 shadow">
            <h3 className="text-gray-900 mb-4">月別推移</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                  name="件数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 時間帯別件数 */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5 shadow">
            <h3 className="text-gray-900 mb-4">時間帯別件数</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSlotData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="timeSlot" />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="count" fill="#14b8a6" name="件数" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 曜日別件数 */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5 shadow">
            <h3 className="text-gray-900 mb-4">曜日別件数</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" name="件数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 統計サマリー */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
            <h3 className="text-blue-900 mb-3">統計サマリー</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-gray-600 text-sm">総問い合わせ数</div>
                <div className="text-2xl text-blue-600 mt-1">1,355</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-gray-600 text-sm">月平均</div>
                <div className="text-2xl text-teal-600 mt-1">23</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-gray-600 text-sm">最多カテゴリ</div>
                <div className="text-lg text-gray-800 mt-1">症状相談</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-gray-600 text-sm">最多時間帯</div>
                <div className="text-lg text-gray-800 mt-1">6-12時</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}