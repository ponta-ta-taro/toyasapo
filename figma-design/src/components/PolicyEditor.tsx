import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface PolicyEditorProps {
  onClose: () => void;
}

const defaultPolicy = `【とやのメンタルクリニック メール返信ポリシー】

1. メールで診断や治療方針の確定はしない・無診察診療に該当する内容は避ける

2. 薬・休職・診断書の可否をメールで判断しない。診察時の相談に誘導する

3. 初診/紹介状の案内は明確に。必要なら「紹介状を持参してください」と伝える

4. 未成年の場合、受け入れ可否と心理検査の制限を案内し必要なら小児精神科の可能性に言及

5. 希死念慮/強い危険が疑われる場合 priority=高 とし、救急案内や相談窓口を促す文を含める

6. トーン：まず共感→次に案内。優しいが事務的に明確な文体`;

export function PolicyEditor({ onClose }: PolicyEditorProps) {
  const [policy, setPolicy] = useState(defaultPolicy);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // 実際にはここでバックエンドに保存する処理が入る
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-gray-900">返信ポリシー設定</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? '保存しました' : '保存'}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* エディタエリア */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl">
          <p className="text-gray-600 mb-4">
            AI が返信を生成する際に参照する基本的な方針を設定できます。
            この内容は過去の対応履歴やホームページ情報と組み合わせて使用されます。
          </p>
          
          <textarea
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            className="w-full h-[500px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="返信ポリシーを入力してください..."
          />

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-gray-900 mb-2">ポリシー設定のヒント</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>明確で具体的な指示を書くことで、より適切な返信が生成されます</li>
              <li>必ず避けるべき内容（無診察診療など）を明記してください</li>
              <li>優先度判定の基準（キーワードなど）を含めると効果的です</li>
              <li>トーンや文体の指定も可能です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
