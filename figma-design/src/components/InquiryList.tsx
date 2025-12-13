import { Inquiry } from '../App';
import { AlertCircle, Clock, Plus, Play, Upload, Filter, ArrowUpDown } from 'lucide-react';

interface InquiryListProps {
  inquiries: Inquiry[];
  selectedInquiry: Inquiry | null;
  onSelectInquiry: (inquiry: Inquiry) => void;
}

const priorityConfig = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    label: '高',
    icon: AlertCircle
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    label: '中',
    icon: Clock
  },
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    label: '低',
    icon: Clock
  }
};

export function InquiryList({ inquiries, selectedInquiry, onSelectInquiry }: InquiryListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* アクションボタンエリア */}
      <div className="p-3 space-y-2 border-b-2 border-blue-200 bg-white">
        {/* 上段：メール直接入力 + AI分類実行 */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-lg transition-all text-white shadow-md">
            <Plus className="w-4 h-4" />
            <span className="text-sm">メール直接入力（新規作成）</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all text-white shadow-md">
            <Play className="w-4 h-4" />
            <span className="text-sm">AI分類を実行</span>
          </button>
        </div>

        {/* 下段：カテゴリ + 優先度順 + CSVアップロード */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 border-2 border-blue-300 rounded-lg transition-colors text-blue-700 text-sm shadow-sm">
            <Filter className="w-4 h-4" />
            カテゴリ
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 border-2 border-blue-300 rounded-lg transition-colors text-blue-700 text-sm shadow-sm">
            <ArrowUpDown className="w-4 h-4" />
            優先度順
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border-2 border-blue-400 rounded-lg transition-colors text-blue-600 text-sm shadow-sm">
            <Upload className="w-4 h-4" />
            <span className="text-sm">CSV</span>
          </button>
        </div>
      </div>

      {/* 問い合わせリスト */}
      <div className="p-3 space-y-2">
        {inquiries.map((inquiry) => {
          const config = priorityConfig[inquiry.priority];
          const Icon = config.icon;
          const isSelected = selectedInquiry?.id === inquiry.id;

          return (
            <button
              key={inquiry.id}
              onClick={() => onSelectInquiry(inquiry)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                isSelected 
                  ? 'bg-white shadow-lg border-2 border-teal-400 ring-2 ring-teal-200' 
                  : 'bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* 優先度インジケーター */}
                <div className={`flex-shrink-0 w-1.5 h-full ${isSelected ? 'bg-teal-500' : config.bg} rounded-full`} />
                
                <div className="flex-1 min-w-0">
                  {/* 日時と優先度 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500 text-xs">{inquiry.date}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${config.bg} ${config.text} border ${config.border}`}>
                      <Icon className="w-3 h-3" />
                      優先度: {config.label}
                    </span>
                  </div>

                  {/* 件名 */}
                  <div className={`mb-2 truncate ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                    {inquiry.subject}
                  </div>

                  {/* カテゴリ */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs border border-blue-200">
                      {inquiry.category}
                    </span>
                    {inquiry.response && (
                      <span className="inline-flex items-center gap-1 text-xs text-teal-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        下書き生成済み
                      </span>
                    )}
                  </div>

                  {/* 内容のプレビュー */}
                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                    {inquiry.content}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}