import { useState } from 'react';
import { X, Plus, Search, Edit, Trash2 } from 'lucide-react';

interface ResponseTemplatesProps {
  onClose: () => void;
}

interface Template {
  id: string;
  category: string;
  patternName: string;
  content: string;
}

const categories = [
  { name: 'すべて表示', count: 0 },
  { name: '予約', count: 0 },
  { name: '症状相談', count: 0 },
  { name: '書類', count: 0 },
  { name: '料金', count: 0 },
  { name: 'クレーム', count: 0 },
  { name: 'その他', count: 0 },
];

const sampleTemplates: Template[] = [
  {
    id: '1',
    category: '予約',
    patternName: '初診予約の案内',
    content: 'お問い合わせありがとうございます\n\n当院は完全予約制としておりますので\nオンライン予約のうえご来院ください\n\n当院への新規予約について\n詳しくは下記ご参照いただけますでしょうか？\nhttps://toyano-mental.com/2021/06/21/139/\n\n以上よろしくお願いします\n\nとやのメンタルクリニック\ntoyano-mental.com'
  },
  {
    id: '2',
    category: '症状相談',
    patternName: '無診察診療に該当する相談への返信',
    content: 'お問い合わせありがとうございます\n\nご状況について承知しました\n\n診療に関する具体的な説明や医学的な判断をメールでお伝えすることは\n医師法で禁じられている無診察診療にあたる可能性がありますので\n次回診察時に改めてご相談ください\n\n安全な医療を提供するための重要な決まりごとですので\nご理解いただけますと幸いです\n\n以上よろしくお願いします\n\nとやのメンタルクリニック\ntoyano-mental.com'
  },
  {
    id: '3',
    category: '書類',
    patternName: '診断書発行の案内',
    content: 'お問い合わせありがとうございます\n\n診断書の発行は次回診察時に承ります\n\n診察時に医師にお申し出いただければ\n必要な書類を作成いたします\n\n以上よろしくお願いします\n\nとやのメンタルクリニック\ntoyano-mental.com'
  },
];

export function ResponseTemplates({ onClose }: ResponseTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState('すべて表示');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates] = useState<Template[]>(sampleTemplates);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'すべて表示' || template.category === selectedCategory;
    const matchesSearch = template.patternName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div>
            <h2 className="text-white text-xl flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              模範回答（テンプレート）管理
            </h2>
            <p className="text-gray-400 text-sm mt-1">問い合わせパターン別の模範回答を登録し、AIが既存の構造を向上させます。</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white shadow-md"
            >
              <Plus className="w-4 h-4" />
              新規登録
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左サイドバー：検索とカテゴリ */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* 検索 */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-gray-700 text-sm mb-3">検索</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="キーワード検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* カテゴリリスト */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-gray-700 text-sm mb-3">カテゴリ</h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.name
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：テンプレート一覧 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {filteredTemplates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 mb-4">テンプレートがありません。新規登録してください。</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* テーブルヘッダー */}
                <div className="sticky top-0 bg-gray-100 border-b-2 border-gray-300 px-6 py-3 grid grid-cols-12 gap-4 text-sm text-gray-700">
                  <div className="col-span-2">カテゴリ</div>
                  <div className="col-span-3">パターン名</div>
                  <div className="col-span-6">模範回答内容</div>
                  <div className="col-span-1 text-center">操作</div>
                </div>

                {/* テンプレート行 */}
                <div className="divide-y divide-gray-200">
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className="px-6 py-4 grid grid-cols-12 gap-4 hover:bg-gray-50 transition-colors">
                      <div className="col-span-2">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm border border-blue-200">
                          {template.category}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-gray-900 text-sm">{template.patternName}</span>
                      </div>
                      <div className="col-span-6">
                        <p className="text-gray-600 text-sm line-clamp-3 whitespace-pre-wrap">
                          {template.content}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-start justify-center gap-2">
                        <button
                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新規登録モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg">新規テンプレート登録</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 text-sm">カテゴリ</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option>予約</option>
                  <option>症状相談</option>
                  <option>書類</option>
                  <option>料金</option>
                  <option>クレーム</option>
                  <option>その他</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-sm">パターン名</label>
                <input
                  type="text"
                  placeholder="例: 初診予約の案内"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-sm">模範回答内容</label>
                <textarea
                  rows={10}
                  placeholder="模範回答を入力してください..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
                >
                  登録
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
