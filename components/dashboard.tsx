"use client"

import { useState, useRef, useEffect } from "react"
import { Email } from "@/lib/types"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Copy, Loader2, Settings, X } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_POLICY = `あなたは「とやのメンタルクリニック」のメール返信アシスタントです。
以下のポリシーに従って、問い合わせへの返信を作成してください。
【返信ポリシー】

メールで診断や治療方針の確定はしない。無診察診療に該当する内容は避ける
薬・休職・診断書の可否をメールで判断しない。診察時の相談に誘導する
初診/紹介状の案内は明確に。必要なら「紹介状を持参してください」と伝える
未成年の場合、受け入れ可否と心理検査の制限を案内し、必要なら小児精神科の可能性に言及
希死念慮/強い危険が疑われる場合は、救急案内や相談窓口を促す文を含める
トーン：まず共感→次に案内。優しいが事務的に明確な文体

【返信テンプレート構造】

挨拶: 「お問い合わせありがとうございます」
共感: 状況を理解していることを示す
案内: 具体的な対応方法を明示
締め: 「以上よろしくお願いします」
署名: 「とやのメンタルクリニック\ntoyano-mental.com」`;

export function Dashboard() {
    const [emails, setEmails] = useState<Email[]>([])
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
    const [generatedDraft, setGeneratedDraft] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Policy Editor State
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
    const [policy, setPolicy] = useState(DEFAULT_POLICY)

    const selectedEmail = emails.find(e => e.id === selectedEmailId)

    // Load policy from localStorage on mount
    useEffect(() => {
        const savedPolicy = localStorage.getItem("response_policy")
        if (savedPolicy) {
            setPolicy(savedPolicy)
        }
    }, [])

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (file.type && file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            // Lenient check
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: "greedy",
            complete: (results) => {
                if (results.errors.length > 0) {
                    // handle errors
                }

                const parsedData = results.data as Record<string, string>[]

                const newEmails: Email[] = parsedData
                    .filter(row => row["問い合わせ内容"] && row["問い合わせ内容"].trim() !== "")
                    .map(row => ({
                        id: crypto.randomUUID(),
                        datetime: row["日時"] || "",
                        inquiry: row["問い合わせ内容"] || "",
                        response: row["返信内容"] || "",
                    }))
                    .sort((a, b) => {
                        return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
                    })

                if (newEmails.length === 0) {
                    toast.error("有効なデータが見つかりませんでした")
                    return
                }

                setEmails(newEmails)
                toast.success(`${newEmails.length}件のメールを読み込みました`)

                if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                }
            },
            error: (error) => {
                console.error(error)
                toast.error("CSVの読み込みに失敗しました")
            }
        })
    }

    const handleGenerateDraft = async () => {
        if (!selectedEmail) return;

        setIsGenerating(true);
        setGeneratedDraft(""); // Reset previous draft

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inquiry: selectedEmail.inquiry,
                    policy: policy // Fixed: Send policy in request
                }),
            });

            if (!res.ok) {
                throw new Error("Generation failed");
            }

            const data = await res.json();
            setGeneratedDraft(data.draft);
            toast.success("返信下書きを生成しました");
        } catch (error) {
            console.error(error);
            toast.error("生成に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!generatedDraft) return;
        navigator.clipboard.writeText(generatedDraft);
        toast.success("クリップボードにコピーしました");
    };

    const handleSavePolicy = () => {
        localStorage.setItem("response_policy", policy)
        toast.success("ポリシーを保存しました")
        setIsPolicyModalOpen(false)
    }

    // Format date for display: MM/DD HH:mm
    const formatListDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return dateStr
            const month = (d.getMonth() + 1).toString().padStart(2, '0')
            const day = d.getDate().toString().padStart(2, '0')
            const hours = d.getHours().toString().padStart(2, '0')
            const mins = d.getMinutes().toString().padStart(2, '0')
            return `${month}/${day} ${hours}:${mins}`
        } catch {
            return dateStr
        }
    }

    return (
        <div className="flex h-screen w-full bg-[#f9fafb] text-[#1f2937]">
            {/* Left Column (w-2/5) */}
            <div className="w-2/5 flex flex-col border-r border-gray-200 h-full bg-white">
                <div className="p-6 border-b border-gray-200 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">問い合わせメール一覧</h1>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsPolicyModalOpen(true)}
                            className="text-gray-500 hover:text-gray-700"
                            title="設定"
                        >
                            <Settings className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button
                            className="w-full bg-[#3B82F6] hover:bg-[#2563eb] text-lg py-6"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-5 w-5" />
                            CSVアップロード
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {emails.map((email) => (
                            <div
                                key={email.id}
                                className={cn(
                                    "p-5 border-b border-gray-100 cursor-pointer transition-colors hover:bg-slate-50 relative",
                                    selectedEmailId === email.id ? "bg-blue-50 hover:bg-blue-50" : ""
                                )}
                                onClick={() => {
                                    setSelectedEmailId(email.id)
                                    setGeneratedDraft("") // Reset draft when switching emails
                                }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-base text-gray-500 font-medium">
                                        {formatListDate(email.datetime)}
                                    </span>
                                </div>
                                <p className="text-base text-gray-700 line-clamp-2 leading-relaxed">
                                    {email.inquiry}
                                </p>
                            </div>
                        ))}
                        {emails.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-lg">
                                メールがありません。<br />CSVをアップロードしてください。
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Column (w-3/5) */}
            <div className="w-3/5 flex flex-col h-full bg-[#f9fafb]">
                {selectedEmail ? (
                    <div className="flex flex-col h-full">
                        {/* Detail View Area (Top Half) */}
                        <div className="h-1/2 p-6 pb-3 flex flex-col">
                            <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-gray-200">
                                <div className="p-6 pb-4 border-b border-gray-100 bg-white">
                                    <div className="text-xl font-bold text-gray-800 mb-1">
                                        {selectedEmail.datetime}
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 bg-white">
                                    <div className="p-8 text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                                        {selectedEmail.inquiry}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>

                        {/* Action Area & Draft (Bottom Half) */}
                        <div className="h-1/2 px-6 pb-6 pt-0 flex flex-col">
                            <div className="flex justify-center my-4 shrink-0">
                                <Button
                                    size="lg"
                                    className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-12 py-6 text-xl shadow-md min-w-[320px]"
                                    onClick={handleGenerateDraft}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                            生成中...
                                        </>
                                    ) : (
                                        "返信下書きを生成"
                                    )}
                                </Button>
                            </div>

                            {/* Draft Area */}
                            <Card className="flex-1 relative shadow-sm border-gray-200 flex flex-col overflow-hidden">
                                <Textarea
                                    className="flex-1 p-6 resize-none border-0 focus-visible:ring-0 text-lg leading-relaxed"
                                    placeholder="ここに返信案が生成されます..."
                                    value={generatedDraft}
                                    onChange={(e) => setGeneratedDraft(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="absolute top-4 right-4 bg-white/80 hover:bg-slate-100 z-10"
                                    onClick={handleCopy}
                                    disabled={!generatedDraft}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    コピー
                                </Button>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                        左側のリストからメールを選択してください
                    </div>
                )}
            </div>

            {/* Policy Editor Modal */}
            {isPolicyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">返信ポリシー編集</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsPolicyModalOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6 flex-1 overflow-auto">
                            <Textarea
                                className="w-full font-mono text-sm leading-relaxed min-h-[500px] text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                                value={policy}
                                onChange={(e) => setPolicy(e.target.value)}
                                placeholder="返信ポリシーを入力してください..."
                                rows={20}
                            />
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                            <Button
                                variant="outline"
                                onClick={() => setIsPolicyModalOpen(false)}
                                className="px-6"
                            >
                                キャンセル
                            </Button>
                            <Button
                                className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-8"
                                onClick={handleSavePolicy}
                            >
                                保存
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
