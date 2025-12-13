"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Email, Classification, Template } from "@/lib/types"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Copy, Loader2, Settings, X, Play, Filter, ArrowUpDown, BookOpen, BarChart3, Plus, LogOut, Check, Save, Sparkles, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { saveDraft, getApprovedDrafts, getSettings, saveSettings, saveEmails, getEmails, updateEmail, deleteAllEmails, getTemplates } from "@/lib/db"
import { TemplateManager } from "@/components/template-manager"
import { LearningDataManager } from "@/components/learning-data-manager"
import { AnalysisDashboard } from "@/components/analysis-dashboard"

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

import { User } from "firebase/auth"

interface DashboardProps {
    user: User | null;
    onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
    const [emails, setEmails] = useState<Email[]>([])
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
    const [generatedDraft, setGeneratedDraft] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Policy & Signature & Clinic Info State
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
    const [policy, setPolicy] = useState(DEFAULT_POLICY)
    const [signature, setSignature] = useState(DEFAULT_SIGNATURE)
    // New Clinic Info States
    const [reservationUrl, setReservationUrl] = useState("")
    const [clinicHours, setClinicHours] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [commonInfo, setCommonInfo] = useState("")

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

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [pendingUploadEmails, setPendingUploadEmails] = useState<Email[]>([])

    // Template State
    const [templates, setTemplates] = useState<Template[]>([])
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [isLearningDataManagerOpen, setIsLearningDataManagerOpen] = useState(false)

    // Analysis State
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)

    // Reset states when switching emails
    useEffect(() => {
        if (selectedEmailId) {
            setIsManualInput(false)
        }
        setGeneratedDraft("")

        setIsDraftSaved(false)
        setRefineInstructions("")
    }, [selectedEmailId])

    // Load settings from Firestore (with LocalStorage fallback)
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await getSettings();
                if (settings) {
                    setPolicy(settings.policy || DEFAULT_POLICY);
                    setSignature(settings.signature || DEFAULT_SIGNATURE);
                    setReservationUrl(settings.reservationUrl || "");
                    setClinicHours(settings.clinicHours || "");
                    setPhoneNumber(settings.phoneNumber || "");
                    setCommonInfo(settings.commonInfo || "");

                    // Update LocalStorage cache
                    localStorage.setItem("response_policy", settings.policy || "");
                    localStorage.setItem("response_signature", settings.signature || "");
                    localStorage.setItem("clinic_reservation_url", settings.reservationUrl || "");
                    localStorage.setItem("clinic_hours", settings.clinicHours || "");
                    localStorage.setItem("clinic_phone", settings.phoneNumber || "");
                    localStorage.setItem("clinic_common_info", settings.commonInfo || "");
                    return;
                }
            } catch (error) {
                console.error("Firestore load failed, using local storage", error);
            }

            // Fallback to LocalStorage
            const savedPolicy = localStorage.getItem("response_policy")
            if (savedPolicy) setPolicy(savedPolicy)

            const savedSignature = localStorage.getItem("response_signature")
            if (savedSignature) setSignature(savedSignature)

            setReservationUrl(localStorage.getItem("clinic_reservation_url") || "")
            setClinicHours(localStorage.getItem("clinic_hours") || "")
            setPhoneNumber(localStorage.getItem("clinic_phone") || "")
            setCommonInfo(localStorage.getItem("clinic_common_info") || "")
        };

        loadSettings();
    }, [])

    // New: Load emails from Firestore
    useEffect(() => {
        const loadEmails = async () => {
            try {
                const storedEmails = await getEmails();
                if (storedEmails && storedEmails.length > 0) {
                    setEmails(storedEmails);
                }
            } catch (error) {
                console.error("Failed to load emails from Firestore:", error);
                toast.error("データの読み込みに失敗しました");
            }
        };
        loadEmails();
    }, []);

    // Load Templates
    useEffect(() => {
        const loadTemplatesFunc = async () => {
            try {
                const t = await getTemplates();
                setTemplates(t);
            } catch (e) {
                console.error("Failed to load templates:", e);
            }
        };
        loadTemplatesFunc();
    }, []);

    // Load cached classifications on email load
    useEffect(() => {
        if (emails.length === 0) return;

        const cachedDataStr = localStorage.getItem("email_classifications");
        if (!cachedDataStr) return;

        try {
            const cachedData = JSON.parse(cachedDataStr) as Record<string, Classification>;
            // Note: If we loaded from Firestore, emails might already have classification. 
            // LocalStorage cache might be outdated or useful only if firestore load failed or for new CSVs.
            // Let's rely on Firestore data if present, only enhance if missing.

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
            complete: async (results) => {
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

                // Handle Overwrite / Append
                if (emails.length > 0) {
                    // Simple confirm for MVP
                    if (window.confirm("既存のデータがあります。「OK」で追加、「キャンセル」で上書き（既存データ削除）しますか？\n\nOK: 追加モード\nキャンセル: 上書きモード")) {
                        // Append
                        try {
                            await saveEmails(newEmails);
                            setEmails(prev => [...prev, ...newEmails]);
                            toast.success(`${newEmails.length}件を追加しました`);
                        } catch (e) {
                            console.error(e);
                            toast.error("保存に失敗しました");
                        }
                    } else {
                        // Overwrite
                        try {
                            await deleteAllEmails(); // Clear DB
                            await saveEmails(newEmails); // Save new
                            setEmails(newEmails);
                            toast.success(`${newEmails.length}件で上書きしました`);
                        } catch (e) {
                            console.error(e);
                            toast.error("保存に失敗しました");
                        }
                    }
                } else {
                    // Initial load
                    try {
                        await saveEmails(newEmails);
                        setEmails(newEmails);
                        toast.success(`${newEmails.length}件のメールを読み込みました`);
                    } catch (e) {
                        console.error(e);
                        toast.error("保存に失敗しました");
                    }
                }

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

    const handleMergeChoice = async (mode: 'append' | 'overwrite') => {
        const newEmails = pendingUploadEmails;

        if (mode === 'append') {
            try {
                await saveEmails(newEmails);
                // Re-sort combined list purely by date desc
                const combined = [...emails, ...newEmails].sort((a, b) =>
                    new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
                );
                setEmails(combined);
                toast.success(`${newEmails.length}件を追加しました`);
            } catch (e) {
                console.error(e);
                toast.error("保存に失敗しました");
            }
        } else {
            try {
                await deleteAllEmails(); // Clear DB
                await saveEmails(newEmails); // Save new
                setEmails(newEmails);
                toast.success(`${newEmails.length}件で上書きしました`);
            } catch (e) {
                console.error(e);
                toast.error("保存に失敗しました");
            }
        }

        setIsUploadModalOpen(false);
        setPendingUploadEmails([]);
    };



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
                // Also update Firestore if it was just loaded from cache but not in DB? 
                // Ideally we update DB.
                await updateEmail(newEmails[i]);

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

                    // Save to Firestore immediately
                    await updateEmail(newEmails[i]);

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
            const pastResponses = await getApprovedDrafts(5);

            // Filter templates based on current email category
            const currentCategory = isManualInput ? null : selectedEmail?.classification?.category;
            const relevantTemplates = currentCategory
                ? templates.filter(t => t.category === currentCategory)
                : [];

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inquiry: inquiryText,
                    policy: policy,
                    pastResponses,
                    templates: relevantTemplates, // Add templates to payload
                    mode: isRefine ? "refine" : "create",
                    currentDraft: isRefine ? generatedDraft : undefined,
                    instructions: isRefine ? refineInstructions : undefined,
                    clinicInfo: {
                        reservationUrl,
                        clinicHours,
                        phoneNumber,
                        commonInfo
                    }
                }),
            });

            if (!res.ok) throw new Error("Generation failed");

            const data = await res.json();

            // Append signature
            let finalDraft = data.draft;
            // Refine mode usually preserves the signature from the previous draft, so we only append it for new creations
            if (signature && !isRefine) {
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
        // 1. Save to LocalStorage (Immediate feedback & Fallback)
        localStorage.setItem("response_policy", policy)
        localStorage.setItem("response_signature", signature)
        localStorage.setItem("clinic_reservation_url", reservationUrl)
        localStorage.setItem("clinic_hours", clinicHours)
        localStorage.setItem("clinic_phone", phoneNumber)
        localStorage.setItem("clinic_common_info", commonInfo)

        // 2. Save to Firestore (Shared)
        try {
            await saveSettings({
                policy,
                signature,
                reservationUrl,
                clinicHours,
                phoneNumber,
                commonInfo
            });
            toast.success("設定を保存・共有しました")
        } catch (e) {
            console.error(e)
            toast.warning("設定は保存されましたが、共有に失敗しました")
        }

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
        <div className="flex h-screen flex-col bg-gray-100 text-[#1f2937]">
            <header className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-lg relative z-20">
                <div>
                    <h1 className="text-white text-xl font-bold">問い合わせ管理システム</h1>
                    <p className="text-gray-400 text-sm mt-0.5">とやのメンタルクリニック</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Action Buttons */}
                    <div className="flex gap-3 mr-4">
                        <Button
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border-0 shadow-md"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>模範回答</span>
                        </Button>
                        <Button
                            onClick={() => setIsAnalysisModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border-0 shadow-md"
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>分析</span>
                        </Button>
                        <Button
                            onClick={() => setIsLearningDataManagerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-md"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>学習データ管理</span>
                        </Button>
                        <Button
                            onClick={() => setIsPolicyModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border-0 shadow-md"
                        >
                            <Settings className="w-4 h-4" />
                            <span>設定</span>
                        </Button>
                    </div>

                    <div className="h-8 w-px bg-gray-600 mx-2" />

                    {/* User Profile */}
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {user.photoURL && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-gray-500" />
                                )}
                                <div className="text-sm">
                                    <p className="font-bold text-gray-200">{user.displayName || "ユーザー"}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onLogout} className="text-gray-400 hover:text-white hover:bg-gray-700">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : null}
                </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column：問い合わせ一覧 (w-[400px]) */}
                <div className="w-[400px] bg-blue-50 border-r-2 border-blue-200 flex flex-col shrink-0">
                    <div className="p-4 border-b-2 border-blue-300 bg-blue-100">
                        <h2 className="text-blue-900 font-bold text-lg">問い合わせ一覧</h2>
                    </div>

                    {/* Action Area */}
                    <div className="p-3 space-y-2 border-b-2 border-blue-200 bg-white">
                        {/* Classification Status */}
                        {isClassifying && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-sm text-slate-600 mb-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                分類中... {classificationProgress?.current}/{classificationProgress?.total}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={startManualInput}
                                className={cn("flex-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md border-0 h-10")}
                            >
                                <Plus className="mr-2 h-4 w-4" /> 新規作成
                            </Button>
                            <Button
                                onClick={handleClassify}
                                disabled={emails.length === 0 || isClassifying}
                                className={cn("flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md border-0 h-10")}
                            >
                                <Play className="mr-2 h-4 w-4" /> AI分類
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 h-9">
                                        <Filter className="mr-2 h-3 w-3" />
                                        {filterCategory || "カテゴリ"}
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
                                variant="outline"
                                size="sm"
                                className={cn("flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 h-9", isSortingByPriority && "bg-blue-100")}
                                onClick={() => setIsSortingByPriority(!isSortingByPriority)}
                            >
                                <ArrowUpDown className="mr-2 h-3 w-3" />
                                優先度
                            </Button>

                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-blue-400 text-blue-600 hover:bg-gray-50 h-9"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mr-2 h-3 w-3" />
                                CSV
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 bg-blue-50">
                        <div className="p-3 space-y-2">
                            {derivedEmails.map((email) => {
                                const isSelected = selectedEmailId === email.id;
                                const priority = email.classification?.priority || 1;
                                // Priority Styles
                                let pStyles = { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", label: "低" };
                                if (priority >= 4) pStyles = { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "高" };
                                else if (priority >= 3) pStyles = { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", label: "中" };

                                return (
                                    <button
                                        key={email.id}
                                        onClick={() => {
                                            setSelectedEmailId(email.id);
                                            setIsManualInput(false);
                                        }}
                                        className={cn(
                                            "w-full p-4 rounded-lg text-left transition-all relative",
                                            isSelected
                                                ? "bg-white shadow-lg border-2 border-blue-500 ring-2 ring-blue-100 z-10"
                                                : "bg-white hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Priority Dot */}
                                            <div className={cn("flex-shrink-0 w-1.5 h-full rounded-full min-h-[3rem]", isSelected ? "bg-blue-500" : pStyles.bg.replace("bg-", "bg-slate-400 opacity-50"))} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-gray-500 text-sm font-mono">{formatListDate(email.datetime)}</span>
                                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm border", pStyles.bg, pStyles.text, pStyles.border)}>
                                                        優先度: {pStyles.label}
                                                    </span>
                                                </div>

                                                <div className={cn("mb-2 text-base font-bold truncate", isSelected ? "text-gray-900" : "text-gray-800")}>
                                                    {email.inquiry.slice(0, 30) || "件名なし"}...
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {email.classification?.category && (
                                                        <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-sm border border-blue-200">
                                                            {email.classification.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {emails.length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    メールがありません。<br />CSVアップロードか直接入力を選択してください。
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Main Content Area (Layout) */}

                {/* Main Content (Center + Right Columns) */}
                <div className="flex-1 bg-gray-50 flex flex-col min-w-0">
                    {selectedEmail || isManualInput ? (
                        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-y-auto">
                            {/* Center Column: 問い合わせ内容 */}
                            <div className="flex flex-col gap-4">
                                {/* Header Info */}
                                <div className="p-6 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                                    {isManualInput ? (
                                        <div className="text-gray-500 font-bold text-lg">新規作成モード</div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <h2 className="text-2xl font-bold text-gray-900">{selectedEmail?.classification?.category || "未分類"} に関する問い合わせ</h2>
                                                <div className="flex gap-2">
                                                    {selectedEmail?.classification?.priority === 5 && (
                                                        <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-base font-bold flex items-center gap-1">
                                                            <Loader2 className="w-4 h-4 text-red-600 animate-pulse" /> 重要
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-base text-gray-500 flex gap-4">
                                                <span>{selectedEmail?.datetime}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Inquiry Body */}
                                <div className="flex-1 flex flex-col">
                                    <div className="p-3 bg-blue-500 rounded-t-lg shadow-md">
                                        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                                            <BookOpen className="w-6 h-6" /> 問い合わせ内容
                                        </h3>
                                    </div>
                                    <div className="flex-1 bg-white border-x-2 border-b-2 border-blue-300 rounded-b-lg p-6 shadow-sm">
                                        {isManualInput ? (
                                            <Textarea
                                                className="w-full h-full min-h-[400px] resize-none border-0 text-lg leading-relaxed focus-visible:ring-0 p-0"
                                                placeholder="ここに問い合わせ内容を入力または貼り付けてください..."
                                                value={manualInquiry}
                                                onChange={(e) => setManualInquiry(e.target.value)}
                                            />
                                        ) : (
                                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                                                {selectedEmail?.inquiry}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: 返信下書き */}
                            <div className="flex flex-col gap-4">
                                <div className="flex-1 flex flex-col">
                                    <div className="p-3 bg-teal-600 rounded-t-lg shadow-md flex justify-between items-center">
                                        <h3 className="text-white font-bold flex items-center gap-2 text-lg whitespace-nowrap">
                                            <Settings className="w-6 h-6" /> 返信下書き
                                        </h3>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm h-9 px-4 text-base"
                                                onClick={() => handleGenerate(false)}
                                                disabled={isGenerating || !isReadyToGenerate}
                                            >
                                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                                                <span className="hidden lg:inline">AI生成</span>
                                                <span className="lg:hidden">生成</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-slate-600 hover:bg-slate-700 text-white border-none shadow-sm h-9 px-4 text-base"
                                                onClick={handleCopy}
                                                disabled={!generatedDraft}
                                            >
                                                <Copy className="w-4 h-4 mr-1" />
                                                <span className="hidden xl:inline">コピー</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-teal-700 hover:bg-teal-800 text-white border-none shadow-sm h-9 px-4 text-base"
                                                onClick={handleSaveToTraining}
                                                disabled={!generatedDraft || isDraftSaved}
                                            >
                                                {isDraftSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4 mr-1" />}
                                                <span className="hidden xl:inline">学習用に保存</span>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white border-x-2 border-b-2 border-teal-400 rounded-b-lg p-0 shadow-sm flex flex-col relative min-h-[400px]">
                                        {generatedDraft ? (
                                            <>
                                                <Textarea
                                                    className="flex-1 p-6 resize-none border-0 focus-visible:ring-0 text-base leading-relaxed"
                                                    value={generatedDraft}
                                                    onChange={(e) => {
                                                        setGeneratedDraft(e.target.value)
                                                        setIsDraftSaved(false)
                                                    }}
                                                />
                                                {/* Refine Area */}
                                                <div className="p-4 bg-slate-50 border-t border-gray-200">
                                                    <div className="flex gap-2">
                                                        <Textarea
                                                            className="flex-1 min-h-[44px] h-[44px] resize-none py-2 px-3 text-base bg-white border-gray-300"
                                                            placeholder="追加指示（例：もっと丁寧に、URLを追記して...）"
                                                            value={refineInstructions}
                                                            onChange={(e) => setRefineInstructions(e.target.value)}
                                                        />
                                                        <Button
                                                            className="bg-slate-700 hover:bg-slate-800 text-white shrink-0 text-base h-[44px]"
                                                            onClick={() => handleGenerate(true)}
                                                            disabled={isGenerating || !refineInstructions.trim()}
                                                        >
                                                            <RefreshCw className="w-5 h-5 mr-1" /> 再生成
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                                <Sparkles className="w-12 h-12 opacity-20" />
                                                <p>「AI生成」ボタンを押して下書きを作成してください</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Hint Box */}
                                {generatedDraft && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex gap-3">
                                        <div className="font-bold shrink-0">ヒント:</div>
                                        <div>
                                            生成された下書きは、返信ポリシーと過去の対応履歴に基づいています。必要に応じて編集してからご使用ください。
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <p className="text-xl mb-2">問い合わせを選択してください</p>
                                <p className="text-sm">左側のリストから選択するか、新規作成を行ってください</p>
                            </div>
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

                                {/* Clinic Info Section */}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col gap-4">
                                    <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                        🏥 クリニック情報 (AIが参照します)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="mb-1 block text-sm font-medium">予約ページURL</Label>
                                            <input
                                                className="w-full px-3 py-2 border rounded text-sm"
                                                value={reservationUrl}
                                                onChange={(e) => setReservationUrl(e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1 block text-sm font-medium">電話番号</Label>
                                            <input
                                                className="w-full px-3 py-2 border rounded text-sm"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="03-xxxx-xxxx"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="mb-1 block text-sm font-medium">診療時間</Label>
                                            <input
                                                className="w-full px-3 py-2 border rounded text-sm"
                                                value={clinicHours}
                                                onChange={(e) => setClinicHours(e.target.value)}
                                                placeholder="月〜土 9:00-18:00 (日祝休)"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="mb-1 block text-sm font-medium">よく案内する情報 (FAQなど)</Label>
                                            <Textarea
                                                className="min-h-[80px] text-sm bg-white"
                                                value={commonInfo}
                                                onChange={(e) => setCommonInfo(e.target.value)}
                                                placeholder="初診は予約必須です、駐車場は3台あります...など"
                                            />
                                        </div>
                                    </div>
                                </div>

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

                {/* CSV Upload Confirmation Modal */}
                {isUploadModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md bg-white rounded-lg shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800">データの読み込みオプション</h2>
                            </div>
                            <div className="p-6 flex flex-col gap-4">
                                <p className="text-gray-600">
                                    既に <span className="font-bold text-gray-900">{emails.length}件</span> のデータが存在します。<br />
                                    新しく読み込む <span className="font-bold text-gray-900">{pendingUploadEmails.length}件</span> のデータをどのように扱いますか？
                                </p>

                                <div className="flex flex-col gap-3 mt-2">
                                    <Button
                                        className="w-full justify-between h-auto py-3 px-4 bg-blue-600 hover:bg-blue-700"
                                        onClick={() => handleMergeChoice('append')}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-base">追加する (Append)</span>
                                            <span className="text-xs font-normal text-blue-100">既存のデータに残し、新しいデータを追加します</span>
                                        </div>
                                        <span className="text-xl">＋</span>
                                    </Button>

                                    <Button
                                        variant="destructive"
                                        className="w-full justify-between h-auto py-3 px-4 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                                        onClick={() => handleMergeChoice('overwrite')}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-bold text-base">上書きする (Overwrite)</span>
                                            <span className="text-xs font-normal text-red-500">既存のデータを全て削除し、入れ替えます</span>
                                        </div>
                                        <span className="text-xl">↺</span>
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-200 flex justify-center">
                                <Button
                                    variant="ghost"
                                    className="text-gray-500"
                                    onClick={() => setIsUploadModalOpen(false)}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Template Manager Modal */}
            <TemplateManager isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} />

            {/* Learning Data Manager Modal */}
            <LearningDataManager isOpen={isLearningDataManagerOpen} onClose={() => setIsLearningDataManagerOpen(false)} />

            {/* Analysis Dashboard Modal */}
            <AnalysisDashboard isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} emails={emails} />
        </div>
    )
}
