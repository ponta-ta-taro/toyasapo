import { useState } from 'react';
import { Inquiry } from '../App';
import { Copy, Check, RefreshCw, Sparkles, Save } from 'lucide-react';

interface InquiryDetailProps {
  inquiry: Inquiry;
}

export function InquiryDetail({ inquiry }: InquiryDetailProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftResponse, setDraftResponse] = useState(inquiry.response || '');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateDraft = () => {
    setIsGenerating(true);
    // モックアップ用のシミュレーション
    setTimeout(() => {
      setDraftResponse(
        'お問い合わせありがとうございます\n\n' +
        'ご質問の内容について承知しました\n\n' +
        '詳細につきましては診察時に改めてご相談させていただきたく存じます\n' +
        '安全で適切な医療を提供するための重要な決まりごとですので\n' +
        'ご理解いただけますと幸いです\n\n' +
        '以上よろしくお願いします\n\n' +
        'とやのメンタルクリニック\n' +
        'toyano-mental.com'
      );
      setIsGenerating(false);
    }, 1500);
  };

  const handleSaveForLearning = () => {
    setIsSaving(true);
    // モックアップ用のシミュレーション
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const priorityColors = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-6 border-b-2 border-gray-300 bg-gray-50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-gray-900 mb-2">{inquiry.subject}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{inquiry.date}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <span className={`px-4 py-2 rounded-lg border-2 ${priorityColors[inquiry.priority]} shadow-sm`}>
              優先度: {inquiry.priority === 'high' ? '高' : inquiry.priority === 'medium' ? '中' : '低'}
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg border-2 border-blue-300 shadow-sm">
              {inquiry.category}
            </span>
          </div>
        </div>

        {inquiry.priority === 'high' && (
          <div className="mt-3 p-4 bg-red-100 border-2 border-red-400 rounded-lg flex items-start gap-3 shadow-sm">
            <Sparkles className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>重要：</strong>希死念慮や緊急性の高い内容が検出されました。優先的に対応してください。
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="grid grid-cols-2 gap-6 p-6">
          {/* 左側：問い合わせ内容 */}
          <div>
            <div className="mb-3 p-3 bg-blue-400 border-b-3 border-blue-500 rounded-t-lg shadow">
              <h3 className="text-white">問い合わせ内容</h3>
            </div>
            <div className="bg-white rounded-lg p-5 border-2 border-blue-300 shadow">
              <p className="text-gray-700 whitespace-pre-wrap">{inquiry.content}</p>
            </div>
          </div>

          {/* 右側：返信下書き */}
          <div>
            <div className="mb-3 p-3 bg-teal-500 border-b-3 border-teal-600 rounded-t-lg shadow flex items-center justify-between">
              <h3 className="text-white"><strong>返信下書き</strong></h3>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI生成
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!draftResponse || isGenerating}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      コピーしました
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      コピー
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveForLearning}
                  disabled={!draftResponse || isGenerating || isSaving}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      保存済み
                    </>
                  ) : isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      学習用に保存
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {draftResponse ? (
              <div className="bg-white rounded-lg p-5 border-2 border-teal-300 shadow">
                <p className="text-gray-700 whitespace-pre-wrap">{draftResponse}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-8 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center shadow">
                <Sparkles className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 mb-4">
                  「AI生成」ボタンをクリックして<br />
                  返信下書きを生成してください
                </p>
              </div>
            )}

            {/* 追加指示 */}
            <div className="mt-5">
              <label className="block text-gray-700 mb-2 text-sm">
                追加指示（例：もっと丁寧に、URLを追記してなど）
              </label>
              <div className="flex gap-3">
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="追加指示を入力してください..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  rows={1}
                />
                <button
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                  className="px-5 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap shadow"
                >
                  再生成
                </button>
              </div>
            </div>

            {draftResponse && (
              <div className="mt-5 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>ヒント：</strong>生成された下書きは、返信ポリシーと過去の対応履歴に基づいています。必要に応じて編集してからご使用ください。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}