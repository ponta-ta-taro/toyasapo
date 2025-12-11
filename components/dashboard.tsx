"use client"

import { useState, useRef } from "react"
import { Email } from "@/lib/types"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Copy, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function Dashboard() {
    const [emails, setEmails] = useState<Email[]>([])
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
    const [generatedDraft, setGeneratedDraft] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const selectedEmail = emails.find(e => e.id === selectedEmailId)

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
                body: JSON.stringify({ inquiry: selectedEmail.inquiry }),
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
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold mb-4">問い合わせメール一覧</h1>
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
        </div>
    )
}

