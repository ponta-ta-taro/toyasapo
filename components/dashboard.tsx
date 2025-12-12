"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Email, Classification } from "@/lib/types"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Copy, Loader2, Settings, X, Play, Filter, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { saveDraft, savePolicy, getApprovedDrafts } from "@/lib/db"

import { Label } from "@/components/ui/label"

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
締め: 「以上よろしくお願いします」`;

const DEFAULT_SIGNATURE = `--------------------------------------------------
とやのメンタルクリニック
〒000-0000 〇〇県〇〇市〇〇町1-1
Tel: 00-0000-0000
URL: https://toyano-mental.com
--------------------------------------------------`;

// Generate a simple hash for email content to identify unique emails
const generateEmailHash = (datetime: string, inquiry: string) => {
    return btoa(unescape(encodeURIComponent(`${datetime}|${inquiry}`))).slice(0, 32);
};

export function Dashboard() {
    const [emails, setEmails] = useState<Email[]>([])
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
    const [generatedDraft, setGeneratedDraft] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Policy & Signature State
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
    const [policy, setPolicy] = useState(DEFAULT_POLICY)
    const [signature, setSignature] = useState(DEFAULT_SIGNATURE)

    // Classification State
    const [isClassifying, setIsClassifying] = useState(false)
    const [classificationProgress, setClassificationProgress] = useState<{ current: number, total: number } | null>(null)
    const [filterCategory, setFilterCategory] = useState<string | null>(null)
    const [isSortingByPriority, setIsSortingByPriority] = useState(false)

    // Firebase / Approval State

    const [isDraftSaved, setIsDraftSaved] = useState(false)

    // Refine & Manual Input State
    const [refineInstructions, setRefineInstructions] = useState("")
    const [isManualInput, setIsManualInput] = useState(false)
    const [manualInquiry, setManualInquiry] = useState("")

    // Reset states when switching emails
    useEffect(() => {
        if (selectedEmailId) {
            setIsManualInput(false)
        }
        setGeneratedDraft("")

        setIsDraftSaved(false)
        setRefineInstructions("")
    }, [selectedEmailId])

    // Load policy/signature from localStorage
    useEffect(() => {
        const savedPolicy = localStorage.getItem("response_policy")
        if (savedPolicy) setPolicy(savedPolicy)

        const savedSignature = localStorage.getItem("response_signature")
        if (savedSignature) setSignature(savedSignature)
    }, [])

    // Load cached classifications on email load
    useEffect(() => {
        if (emails.length === 0) return;

        const cachedDataStr = localStorage.getItem("email_classifications");
        if (!cachedDataStr) return;

        try {
            const cachedData = JSON.parse(cachedDataStr) as Record<string, Classification>;
            const updatedEmails = emails.map(email => {
                const hash = generateEmailHash(email.datetime, email.inquiry);
                if (cachedData[hash] && !email.classification) {
                    return { ...email, classification: cachedData[hash] };
                }
                return email;
            });

            // Only update if there are changes
            const hasChanges = updatedEmails.some((e, i) => e.classification !== emails[i].classification);
            if (hasChanges) {
                setEmails(updatedEmails);
            }
        } catch (e) {
            console.error("Failed to load cached classifications", e);
        }
    }, [emails]);

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

    const handleClassify = async () => {
        setIsClassifying(true);
        setClassificationProgress({ current: 0, total: emails.length });

        const cachedDataStr = localStorage.getItem("email_classifications");
        const cachedData = cachedDataStr ? JSON.parse(cachedDataStr) as Record<string, Classification> : {};

        const newEmails = [...emails];

        for (let i = 0; i < newEmails.length; i++) {
            const email = newEmails[i];
            const hash = generateEmailHash(email.datetime, email.inquiry);

            if (email.classification) {
                setClassificationProgress({ current: i + 1, total: emails.length });
                continue;
            }

            if (cachedData[hash]) {
                newEmails[i] = { ...email, classification: cachedData[hash] };
                setClassificationProgress({ current: i + 1, total: emails.length });
                continue;
            }

            try {
                const res = await fetch("/api/classify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inquiry: email.inquiry }),
                });

                if (res.ok) {
                    const classification: Classification = await res.json();
                    newEmails[i] = { ...email, classification };
                    cachedData[hash] = classification;
                } else {
                    console.error(`Failed to classify email index ${i}`);
                }
            } catch (error) {
                console.error(`Error classifying email index ${i}`, error);
            }

            setClassificationProgress({ current: i + 1, total: emails.length });

            // Periodically update state to show progress in UI
            if (i % 5 === 0 || i === newEmails.length - 1) {
                setEmails([...newEmails]);
                localStorage.setItem("email_classifications", JSON.stringify(cachedData));
            }
        }

        setIsClassifying(false);
        setClassificationProgress(null);
        toast.success("AI分類が完了しました");
    };

    const startManualInput = () => {
        setSelectedEmailId(null)
        setIsManualInput(true)
        setManualInquiry("")
        setGeneratedDraft("")

        setIsDraftSaved(false)
    }

    const handleGenerate = async (isRefine = false) => {
        const selectedEmail = emails.find(e => e.id === selectedEmailId);
        const inquiryText = isManualInput ? manualInquiry : selectedEmail?.inquiry;

        if (!inquiryText) {
            toast.error("問い合わせ内容がありません")
            return;
        }

        setIsGenerating(true);

        // Don't reset draft if refining, to allow smooth transition or simple overwrite
        // But for UX, maybe show loading state clearly

        try {
            const pastResponses = await getApprovedDrafts(3);

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inquiry: inquiryText,
                    policy: policy,
                    pastResponses,
                    mode: isRefine ? "refine" : "create",
                    currentDraft: isRefine ? generatedDraft : undefined,
                    instructions: isRefine ? refineInstructions : undefined
                }),
            });

            if (!res.ok) throw new Error("Generation failed");

            const data = await res.json();

            // Append signature
            let finalDraft = data.draft;
            if (signature) {
                finalDraft += `\n\n${signature}`;
            }

            setGeneratedDraft(finalDraft);

            // Reset refine instructions after success
            if (isRefine) setRefineInstructions("");

            // Reset saved status since content changed
            setIsDraftSaved(false);
            ;

            toast.success(isRefine ? "返信を再生成しました" : "返信下書きを生成しました");
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

    const handleSaveToTraining = async () => {
        if (!generatedDraft) return;

        const inquiryText = isManualInput ? manualInquiry : emails.find(e => e.id === selectedEmailId)?.inquiry || "";
        const emailDate = isManualInput ? new Date().toISOString() : emails.find(e => e.id === selectedEmailId)?.datetime || new Date().toISOString();

        const draftId = await saveDraft({
            emailId: generateEmailHash(emailDate, inquiryText),
            inquiry: inquiryText,
            generatedDraft: generatedDraft,
            isApproved: true // Direct save implies approval for learning
        });

        if (draftId) {

            setIsDraftSaved(true);
            toast.success("学習データとして保存しました");
        } else {
            toast.error("保存に失敗しました(Firebase設定を確認してください)");
        }
    };

    const handleSavePolicy = async () => {
        localStorage.setItem("response_policy", policy)
        localStorage.setItem("response_signature", signature)

        // Also save to Firestore
        await savePolicy(policy);

        toast.success("設定を保存しました")
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

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case "予約": return "bg-blue-100 text-blue-800 border-blue-200";
            case "症状相談": return "bg-green-100 text-green-800 border-green-200";
            case "書類": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "料金": return "bg-orange-100 text-orange-800 border-orange-200";
            case "クレーム": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    }

    const derivedEmails = useMemo(() => {
        let result = [...emails];

        if (filterCategory) {
            result = result.filter(e => e.classification?.category === filterCategory);
        }

        if (isSortingByPriority) {
            result.sort((a, b) => {
                const pA = a.classification?.priority || 0;
                const pB = b.classification?.priority || 0;
                return pB - pA;
            });
        }

        return result;
    }, [emails, filterCategory, isSortingByPriority]);

    const selectedEmail = emails.find(e => e.id === selectedEmailId);

    // Determine active view mode
    const isReadyToGenerate = (selectedEmailId && selectedEmail) || (isManualInput && manualInquiry.length > 5);

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

                    {/* Add Direct Input Button */}
                    <Button
                        variant={isManualInput ? "default" : "outline"}
                        className={cn("w-full justify-start", isManualInput ? "bg-green-600 hover:bg-green-700" : "text-green-700 border-green-200 bg-green-50")}
                        onClick={startManualInput}
                    >
                        <span className="mr-2 text-lg">+</span> メール直接入力（新規作成）
                    </Button>

                    {/* Classification Controls */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            {isClassifying ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-sm text-slate-600">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    分類中... {classificationProgress?.current}/{classificationProgress?.total}
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-slate-600 hover:text-slate-900 border-slate-300"
                                    onClick={handleClassify}
                                    disabled={emails.length === 0}
                                >
                                    <Play className="mr-2 h-4 w-4 text-purple-600" />
                                    AI分類を実行
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter & Sort */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex-1 justify-between">
                                    <div className="flex items-center">
                                        <Filter className="mr-2 h-3 w-3" />
                                        {filterCategory || "カテゴリ"}
                                    </div>
                                    {filterCategory && <X className="h-3 w-3 ml-2" onClick={(e) => { e.stopPropagation(); setFilterCategory(null); }} />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setFilterCategory(null)}>全て</DropdownMenuItem>
                                {["予約", "症状相談", "書類", "料金", "クレーム", "その他"].map(cat => (
                                    <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)}>
                                        {cat}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant={isSortingByPriority ? "secondary" : "outline"}
                            size="sm"
                            className={cn("flex-1", isSortingByPriority && "bg-blue-50 text-blue-700 border-blue-200")}
                            onClick={() => setIsSortingByPriority(!isSortingByPriority)}
                        >
                            <ArrowUpDown className="mr-2 h-3 w-3" />
                            優先度順
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
                            className="w-full bg-[#3B82F6] hover:bg-[#2563eb] py-4"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-5 w-5" />
                            CSVアップロード
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {derivedEmails.map((email) => (
                            <div
                                key={email.id}
                                className={cn(
                                    "p-5 border-b border-gray-100 cursor-pointer transition-colors hover:bg-slate-50 relative",
                                    selectedEmailId === email.id ? "bg-blue-50 hover:bg-blue-50" : "",
                                    email.classification?.priority === 5 ? "border-l-4 border-l-red-500" : ""
                                )}
                                onClick={() => {
                                    setSelectedEmailId(email.id)
                                    // Reset manual input mode implicitly via useEffect or logic
                                }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm text-gray-500 font-medium">
                                            {formatListDate(email.datetime)}
                                        </span>
                                        {email.classification && (
                                            <div className="flex gap-2 items-center mt-1">
                                                <Badge variant="outline" className={cn("font-normal border", getCategoryBadgeColor(email.classification.category))}>
                                                    {email.classification.category}
                                                </Badge>
                                                <div className="flex text-yellow-500 text-xs">
                                                    {Array.from({ length: email.classification.priority }).map((_, i) => (
                                                        <span key={i}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-base text-gray-700 line-clamp-2 leading-relaxed mt-1">
                                    {email.inquiry}
                                </p>
                            </div>
                        ))}
                        {emails.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-lg">
                                メールがありません。<br />CSVアップロードか直接入力を選択してください。
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Column (w-3/5) */}
            <div className="w-3/5 flex flex-col h-full bg-[#f9fafb]">
                {selectedEmail || isManualInput ? (
                    <div className="flex flex-col h-full">
                        {/* Detail View Area (Top Half) */}
                        <div className="h-1/2 p-6 pb-3 flex flex-col">
                            <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-gray-200 bg-white">
                                {isManualInput ? (
                                    <>
                                        <div className="p-4 border-b border-green-100 bg-green-50 text-green-800 font-bold">
                                            メール本文（直接入力）
                                        </div>
                                        <Textarea
                                            className="flex-1 p-6 resize-none border-0 text-lg leading-relaxed focus-visible:ring-0"
                                            placeholder="ここに返信したいメール本文を貼り付けてください"
                                            value={manualInquiry}
                                            onChange={(e) => setManualInquiry(e.target.value)}
                                        />
                                    </>
                                ) : (
                                    selectedEmail && (
                                        <>
                                            <div className="p-6 pb-4 border-b border-gray-100 bg-white">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-xl font-bold text-gray-800 mb-1">
                                                        {selectedEmail.datetime}
                                                    </div>
                                                    {selectedEmail.classification && (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge variant="outline" className={getCategoryBadgeColor(selectedEmail.classification.category)}>
                                                                {selectedEmail.classification.category}
                                                            </Badge>
                                                            <div className="text-xs text-gray-500">
                                                                優先度: <span className="font-bold">{selectedEmail.classification.priority}</span>
                                                                <span className="ml-2 text-gray-400">({selectedEmail.classification.reason})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ScrollArea className="flex-1 bg-white">
                                                <div className="p-8 text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                                                    {selectedEmail.inquiry}
                                                </div>
                                            </ScrollArea>
                                        </>
                                    )
                                )}
                            </Card>
                        </div>

                        {/* Action Area & Draft (Bottom Half) */}
                        <div className="h-1/2 px-6 pb-6 pt-0 flex flex-col">
                            <div className="flex justify-center my-4 shrink-0">
                                <Button
                                    size="lg"
                                    className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-12 py-6 text-xl shadow-md min-w-[320px]"
                                    onClick={() => handleGenerate(false)}
                                    disabled={isGenerating || !isReadyToGenerate}
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
                            <Card className="flex-1 relative shadow-sm border-gray-200 flex flex-col overflow-hidden bg-white">
                                <Textarea
                                    className="flex-1 p-6 resize-none border-0 focus-visible:ring-0 text-lg leading-relaxed"
                                    placeholder="ここに返信案が生成されます..."
                                    value={generatedDraft}
                                    onChange={(e) => {
                                        setGeneratedDraft(e.target.value)
                                        setIsDraftSaved(false)
                                    }}
                                />
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-white/80 hover:bg-slate-100"
                                        onClick={handleCopy}
                                        disabled={!generatedDraft}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        コピー
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={isDraftSaved ? "secondary" : "default"}
                                        className={cn("transition-colors", isDraftSaved ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-purple-600 hover:bg-purple-700 text-white")}
                                        onClick={handleSaveToTraining}
                                        disabled={!generatedDraft || isDraftSaved}
                                    >
                                        {isDraftSaved ? "保存済み ✓" : "この返信を学習保存"}
                                    </Button>
                                </div>

                                {/* Regeneration Area (Inside Draft Card at bottom) */}
                                {generatedDraft && (
                                    <div className="p-3 border-t border-gray-100 bg-slate-50 flex items-center gap-2">
                                        <Textarea
                                            className="min-h-[40px] h-[40px] resize-none py-2 px-3 text-sm"
                                            placeholder="追加指示（例：もっと丁寧に、URLを追加して...）"
                                            value={refineInstructions}
                                            onChange={(e) => setRefineInstructions(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            className="shrink-0 bg-slate-700 hover:bg-slate-800 text-white h-[40px]"
                                            onClick={() => handleGenerate(true)}
                                            disabled={isGenerating || !refineInstructions.trim()}
                                        >
                                            再生成
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                        左側のリストからメールを選択するか、<br />「メール直接入力」ボタンを押してください
                    </div>
                )}
            </div>

            {/* Policy Editor Modal */}
            {isPolicyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col max-h-[95vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">設定（返信ポリシー・署名）</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsPolicyModalOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6 flex-1 overflow-auto flex flex-col gap-6">
                            <div>
                                <Label className="mb-2 block font-bold text-gray-700">返信ポリシー (System Prompt)</Label>
                                <Textarea
                                    className="w-full font-mono text-sm leading-relaxed min-h-[300px] text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                                    value={policy}
                                    onChange={(e) => setPolicy(e.target.value)}
                                    placeholder="返信ポリシーを入力..."
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block font-bold text-gray-700">署名 (Signature)</Label>
                                <Textarea
                                    className="w-full font-mono text-sm leading-relaxed min-h-[150px] text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    placeholder="署名を入力..."
                                />
                                <p className="text-xs text-gray-500 mt-1">※生成された返信の末尾に自動的に付与されます</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                            <Button variant="outline" onClick={() => setIsPolicyModalOpen(false)} className="px-6">
                                キャンセル
                            </Button>
                            <Button className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-8" onClick={handleSavePolicy}>
                                保存
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
