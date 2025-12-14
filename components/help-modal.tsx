"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Bot, Mail, BookOpen, FileText, PenTool, BarChart3, HelpCircle } from "lucide-react"

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b border-gray-100 shrink-0 bg-gradient-to-r from-indigo-50 to-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                        <HelpCircle className="h-6 w-6 text-indigo-600" />
                        操作ヘルプ・ガイド
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-gray-600">
                        アプリの仕組みや設定方法、効果的な使い方について解説します。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <Accordion type="single" collapsible className="w-full space-y-4">

                        {/* Section 1: AI Reference Info */}
                        <AccordionItem value="item-1" className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <Bot className="h-5 w-5 text-indigo-600" />
                                    <div>
                                        <div className="font-bold text-gray-800">AIが参照する情報</div>
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">AIはどの情報を参照して返信を作成する？</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6 px-1">
                                <p className="mb-4 text-gray-700">AIは以下の情報を組み合わせて、最適な返信を生成します。</p>
                                <div className="overflow-hidden border rounded-lg bg-white">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold">優先度</th>
                                                <th className="px-4 py-3 text-left font-bold">項目</th>
                                                <th className="px-4 py-3 text-left font-bold">役割</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            <tr>
                                                <td className="px-4 py-3 text-red-600 font-bold">★★★</td>
                                                <td className="px-4 py-3 font-bold">返信ポリシー</td>
                                                <td className="px-4 py-3">AIの「性格・ルール」（無診察診療禁止、ですます調など）</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 text-red-600 font-bold">★★★</td>
                                                <td className="px-4 py-3 font-bold">クリニック情報</td>
                                                <td className="px-4 py-3">基礎情報（予約URL、診療時間など）。常に参照されます。</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 text-orange-500 font-bold">★★☆</td>
                                                <td className="px-4 py-3 font-bold">模範解答</td>
                                                <td className="px-4 py-3">「情報の教科書」。全リストから関連するものを自動選択します。</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 text-yellow-500 font-bold">★☆☆</td>
                                                <td className="px-4 py-3 font-bold">学習データ</td>
                                                <td className="px-4 py-3">「口調・雰囲気の見本」。最新5件のみ参照されます。</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 p-3 bg-yellow-50 text-yellow-900 rounded text-xs flex gap-2 items-center">
                                    <span className="font-bold">NOTE:</span>
                                    <span>署名はAIには渡されず、生成完了後にシステムが自動で追記します。</span>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Section 2: Usage Guide */}
                        <AccordionItem value="item-2" className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <BookOpen className="h-5 w-5 text-teal-600" />
                                    <div>
                                        <div className="font-bold text-gray-800">使い分けガイド</div>
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">どこに何を登録すればいい？</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6 px-1">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <span className="w-2 h-6 bg-red-400 rounded-full" />
                                            返信ポリシー
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-2">クリニックの基本ルールを登録します。</p>
                                        <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                                            <li>です・ます調で統一したい</li>
                                            <li>無診察診療はしない</li>
                                            <li>緊急時は救急ダイヤルを案内する</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <span className="w-2 h-6 bg-red-400 rounded-full" />
                                            クリニック情報
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-2">基本データを登録します。</p>
                                        <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                                            <li>予約ページのURL</li>
                                            <li>電話番号</li>
                                            <li>診療時間、休診日</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <span className="w-2 h-6 bg-blue-500 rounded-full" />
                                            模範解答
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-2">正確な回答パターンを登録します。</p>
                                        <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                                            <li>診断書の発行手順</li>
                                            <li>料金一覧</li>
                                            <li>初診の流れ</li>
                                        </ul>
                                        <div className="mt-2 text-xs font-bold text-blue-600">※「内容」優先ならこちら</div>
                                    </div>

                                    <div className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <span className="w-2 h-6 bg-yellow-400 rounded-full" />
                                            学習データ
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-2">過去の良い返信を保存します。</p>
                                        <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                                            <li>挨拶のバリエーション</li>
                                            <li>クッション言葉の使い方</li>
                                            <li>文章のリズム、長さ</li>
                                        </ul>
                                        <div className="mt-2 text-xs font-bold text-yellow-600">※「雰囲気」優先ならこちら</div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Section 3: Learning Data vs Model Answers */}
                        <AccordionItem value="item-3" className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <div className="font-bold text-gray-800">学習データと模範解答の違い</div>
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">どっちを使えばいいの？</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6 px-1">
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <div className="shrink-0 font-bold text-3xl text-blue-300">A</div>
                                        <div>
                                            <h4 className="font-bold text-blue-900 mb-1">模範解答 ＝ 「情報の教科書」</h4>
                                            <p className="text-sm text-blue-800 leading-relaxed mb-2">
                                                クリニックの公式な回答として、正確な手順やルールを登録します。AIはこれを<strong>最優先</strong>で参照します。
                                            </p>
                                            <div className="text-xs bg-white p-2 rounded text-gray-600">
                                                例：診断書の発行料は〇〇円、手続きは受付で...
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <div className="shrink-0 font-bold text-3xl text-yellow-300">B</div>
                                        <div>
                                            <h4 className="font-bold text-yellow-900 mb-1">学習データ ＝ 「話し方の先生」</h4>
                                            <p className="text-sm text-yellow-800 leading-relaxed mb-2">
                                                過去のやり取りから、クリニックらしい口調や雰囲気を学ばせるために使います。<strong>最新5件</strong>のみ参照されます。
                                            </p>
                                            <div className="text-xs bg-white p-2 rounded text-gray-600">
                                                例：冒頭の「こんにちは」は使わず「お世話になっております」を使う、など
                                            </div>
                                            <div className="mt-2 text-xs font-bold text-yellow-700">
                                                💡 ずっと使いたい返信内容は「模範解答」に移してください。
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Section 4: Email Import */}
                        <AccordionItem value="item-4" className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <Mail className="h-5 w-5 text-pink-600" />
                                    <div>
                                        <div className="font-bold text-gray-800">メールの取り込み</div>
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">Gmail取込と手動入力</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6 px-1">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <Badge variant="outline">方法1</Badge>
                                            Gmail取込（GAS連携）
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-2 pl-2">
                                            画面左上の「<span className="font-bold">Gmail取込</span>」ボタンをクリックすると、Gmailから未対応メールを取得します。
                                        </p>
                                        <p className="text-xs text-red-500 pl-2">
                                            ※事前にGoogle Apps Script (GAS) の設定が必要です。
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <Badge variant="outline">方法2</Badge>
                                            手動入力
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-2 pl-2">
                                            電話や口頭での相談記録を残したい場合に使います。
                                        </p>
                                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 pl-2">
                                            <li>「新規作成」ボタンをクリック</li>
                                            <li>「件名」と「内容」を入力</li>
                                            <li>「AIドラフト生成」をクリック</li>
                                        </ol>
                                        <p className="text-xs text-gray-500 mt-2 pl-2">
                                            ※作成された記録は一覧に<Badge variant="secondary" className="text-[10px] mx-1">手動入力</Badge>として保存されます。
                                        </p>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Section 5: AI Generation & Notes */}
                        <AccordionItem value="item-5" className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <PenTool className="h-5 w-5 text-indigo-600" />
                                    <div>
                                        <div className="font-bold text-gray-800">AI返信生成と注意点</div>
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">どうやって作られる？どこを見ればいい？</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6 px-1">
                                <div className="mb-4">
                                    <h4 className="font-bold text-gray-800 mb-2">生成プロセス</h4>
                                    <ol className="space-y-2 text-sm text-gray-600 border-l-2 border-gray-100 pl-4 py-1">
                                        <li><span className="font-bold text-gray-700">Step 1:</span> 返信ポリシーで「性格」をセット</li>
                                        <li><span className="font-bold text-gray-700">Step 2:</span> クリニック情報で基礎知識を確認</li>
                                        <li><span className="font-bold text-gray-700">Step 3:</span> 模範解答から関連テンプレートを検索</li>
                                        <li><span className="font-bold text-gray-700">Step 4:</span> 学習データで口調を調整</li>
                                        <li><span className="font-bold text-gray-700">Step 5:</span> 返信文を生成し、最後に署名を追記</li>
                                    </ol>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2">生成時の注意点（AIからのコメント）</h4>
                                    <p className="text-sm text-gray-600 mb-2">
                                        下書きの下に表示される「生成のポイント」には、AIが工夫した点が書かれています。
                                    </p>
                                    <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 italic">
                                        ・患者様の予約変更のご要望に対応しました<br />
                                        ・丁寧な敬語を使用しています
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Section 6: Data Analysis */}
                        <AccordionItem value="item-6" className="bg-white border rounded-lg px-4 shadow-sm">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3 text-left">
                                    <BarChart3 className="h-5 w-5 text-green-600" />
                                    <div>
                                        <div className="font-bold text-gray-800">データ分析</div>
                                        <div className="text-xs text-gray-500 font-normal mt-0.5">分析機能で何がわかる？</div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-6 px-1">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-1">口コミ分析</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            <li>高評価（★4-5） → クリニックの「強み」を発見</li>
                                            <li>低評価（★1-3） → 「改善ポイント」を発見</li>
                                            <li>メールとの共通点 → 患者さんの隠れたニーズを把握</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-1">AI経営アドバイザー（チャット）</h4>
                                        <p className="text-sm text-gray-600">
                                            分析結果を見ながら、AIに相談できます。「待ち時間についての不満が多いけど、どうすればいい？」などと聞けば、具体的な改善案を提案してくれます。
                                        </p>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                    </Accordion>
                </div>
            </DialogContent>
        </Dialog>
    )
}
