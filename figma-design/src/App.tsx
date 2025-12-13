import { useState } from 'react';
import { InquiryList } from './components/InquiryList';
import { InquiryDetail } from './components/InquiryDetail';
import { PolicyEditor } from './components/PolicyEditor';
import { DataAnalytics } from './components/DataAnalytics';
import { ResponseTemplates } from './components/ResponseTemplates';
import { Settings, BarChart3, BookOpen } from 'lucide-react';

export interface Inquiry {
  id: string;
  date: string;
  subject: string;
  content: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  response?: string;
}

// サンプルデータ（過去の問い合わせ例を参考に）
const sampleInquiries: Inquiry[] = [
  {
    id: '1',
    date: '2025-11-01 07:48',
    subject: '休職について相談したい',
    content: '今月14日に予約している伊佐です。\n\nお伝えしたいことがありメールしました。\n仕事を続ける方向で話を進めてましたが、状況が厳しくない、自分にだけ態度の接し方があからさまに違ったり、声のトーンがあからさまに違います。私が死ねばいいってことですかね。もう無理です。そのせいで物が食べれなくなり、匂いも気持ち悪い、テレビの音も気持ち悪く、頭の中で常に仕事なことが抜けず、頭痛吐き気で体調がいい状態ではなくなりました。まだ連絡していませんが4日火曜日は職場休みます。毎日動悸と涙が止まりません。\n\n辞めるか休職の方向に話を変更したいです。\n\n予定通り、14日伺います。\n突然のご連絡すみません、相談できる相手がいなくてこちらのフォーラムにご連絡致しました。',
    category: '休職・診断書',
    priority: 'high',
    response: 'お問い合わせありがとうございます\n\n状況について承知しました\n\n伊佐さんがつらい状況とのこと理解しましたが\n診療に関する具体的な説明や医学的な判断をメールでお伝えすることは\n医師法で禁じられている無診察診療にあたる可能性がありますので\n次回診察時に改めてご相談ください\n\n安全な医療を提供するための重要な決まりごとですので\nご理解いただけますと幸いです\n\n以上よろしくお願いします\n\nとやのメンタルクリニック\ntoyano-mental.com'
  },
  {
    id: '2',
    date: '2025-11-11 14:23',
    subject: '15歳の娘の受診について',
    content: '私ではなく，私の子供（15歳女子中学生）が「精神科に行きたい。診断つけてほしい。気分が沈むのを何とかする薬が欲しい」と言っています。\n新潟市の精神科・心療内科はほとんどが１６歳未満を受け付けてくれません。\nこちらでは対象としていただけますでしょうか。\nご検討の程，よろしくお願いいたします。',
    category: '初診予約',
    priority: 'medium',
    response: 'お問い合わせありがとうございます\n娘さんの状況について承知しました\n\n当院は15歳の方の診療にも対応しておりますが\nもし心理検査が必要な状態であった場合\n検査道具の関係から当院で実施できない検査あり\n小児精神科への転医をお勧めする可能性もあります\n\n上記ご了承いただいたうえ当院受診ご希望でしたら\n完全予約制としておりますので\nオンライン予約のうえご来院ください\n\n当院への新規予約について\n詳しくは下記ご参照いただけますでしょうか？\nhttps://toyano-mental.com/2021/06/21/139/\n\n以上よろしくお願いします\n\nとやのメンタルクリニック\ntoyano-mental.com'
  },
  {
    id: '3',
    date: '2025-11-24 22:30',
    subject: '紹介状は必要でしょうか',
    content: '１２月に初診で伺う者です。\n現在違う心療内科に通っているのですが、紹介状は必要でしょうか？',
    category: '初診予約',
    priority: 'low',
    response: 'お問い合わせありがとうございます\n12月に当院初診予定とのこと承知しました\n\n現在かかりつけの心療内科があるようでしたら\n紹介状（診療情報提供書）を主治医に依頼し\n当院初診時にご持参いただけますでしょうか？\n\nこれまでの診断と治療経過を把握することで\nより適切な診断と治療方針の検討が可能となるためです\n\n以上よろしくお願いします\n\nとやのメンタルクリニック\ntoyano-mental.com'
  },
  {
    id: '4',
    date: '2025-12-01 10:15',
    subject: '初診の予約について',
    content: 'はじめまして。最近不眠が続いており、心療内科の受診を考えています。\n初診の予約はどのようにすればよいでしょうか？',
    category: '初診予約',
    priority: 'low'
  },
  {
    id: '5',
    date: '2025-12-03 16:42',
    subject: '診断書の発行について',
    content: '現在通院中です。会社に提出する診断書を発行していただきたいのですが、次回の診察時にお願いできますでしょうか？',
    category: '診断書',
    priority: 'medium'
  }
];

export default function App() {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(sampleInquiries[0]);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [showDataAnalytics, setShowDataAnalytics] = useState(false);
  const [showResponseTemplates, setShowResponseTemplates] = useState(false);
  const [inquiries] = useState<Inquiry[]>(sampleInquiries);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* ヘッダー */}
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-white text-xl">問い合わせ管理システム</h1>
          <p className="text-gray-400 text-sm mt-0.5">とやのメンタルクリニック</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowResponseTemplates(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white shadow-md"
          >
            <BookOpen className="w-5 h-5" />
            <span>模範回答テンプレート</span>
          </button>
          <button
            onClick={() => setShowDataAnalytics(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white shadow-md"
          >
            <BarChart3 className="w-5 h-5" />
            <span>データ分析</span>
          </button>
          <button
            onClick={() => setShowPolicyEditor(!showPolicyEditor)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white shadow-md"
          >
            <Settings className="w-5 h-5" />
            <span>返信ポリシー設定</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左側：問い合わせ一覧 */}
        <div className="w-[400px] bg-blue-50 border-r-2 border-blue-200 flex flex-col">
          <div className="p-4 border-b-2 border-blue-300 bg-blue-100">
            <h2 className="text-blue-900">問い合わせ一覧</h2>
          </div>
          <InquiryList
            inquiries={inquiries}
            selectedInquiry={selectedInquiry}
            onSelectInquiry={setSelectedInquiry}
          />
        </div>

        {/* 右側：詳細と下書き */}
        <div className="flex-1 flex flex-col bg-white">
          {showPolicyEditor ? (
            <PolicyEditor onClose={() => setShowPolicyEditor(false)} />
          ) : selectedInquiry ? (
            <InquiryDetail inquiry={selectedInquiry} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              問い合わせを選択してください
            </div>
          )}
        </div>
      </div>

      {/* データ分析モーダル */}
      {showDataAnalytics && (
        <DataAnalytics onClose={() => setShowDataAnalytics(false)} />
      )}

      {/* 模範回答テンプレートモーダル */}
      {showResponseTemplates && (
        <ResponseTemplates onClose={() => setShowResponseTemplates(false)} />
      )}
    </div>
  );
}