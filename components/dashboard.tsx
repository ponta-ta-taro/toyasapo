"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Email, Classification, Template } from "@/lib/types"
import Papa from "papaparse"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Copy, Loader2, Settings, X, Play, Filter, BookOpen, BarChart3, Plus, LogOut, Check, Save, Sparkles, Mail, Search, Trash2, Undo2, Ban, RefreshCw, AlertCircle, Clock, ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { saveDraft, getApprovedDrafts, getSettings, saveSettings, saveEmails, getEmails, updateEmail, deleteAllEmails, getTemplates, getGmailImports, markGmailProcessed, deleteEmail, restoreEmail, hardDeleteEmail, checkDraftExists, updateDraft } from "@/lib/db"
import { TemplateManager } from "@/components/template-manager"
import { LearningDataManager } from "@/components/learning-data-manager"
import { AnalysisDashboard } from "@/components/analysis-dashboard"

import { Label } from "@/components/ui/label"

const DEFAULT_POLICY = `あなたは「とやのメンタルクリニック」のメール返信アシスタントです。
以下のポリシーに従って、問い合わせへの返信を作成してください。
【返信ポリシー】

メールで診断や治療方針の確定はしない。無診察診療に該当する内容は避ける
薬休職診断書の可否をメールで判断しない。診察時の相談に誘導する
初診/紹介状の案内は明確に。必要なら「紹介状を持参してください」と伝える
未成年の場合、受け入れ可否と心理検査の制限を案内し、必要なら小児精神科の可能性に言及
希死念慮/強い危険が疑われる場合は、救急案内や相談窓口を促す文を含める
トーン：まず共感次に案内。優しいが事務的に明確な文体

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

    // Firebase / Approval State

    const [isDraftSaved, setIsDraftSaved] = useState(false)

    // Refine & Manual Input State
    const [refineInstructions, setRefineInstructions] = useState("")
    const [isManualInput, setIsManualInput] = useState(false)
    const [manualInquiry, setManualInquiry] = useState("")

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [pendingUploadEmails, setPendingUploadEmails] = useState<Email[]>([])

    // Overwrite Dialog State
    const [isOverwriteAlertOpen, setIsOverwriteAlertOpen] = useState(false)
    const [existingDraftId, setExistingDraftId] = useState<string | null>(null)
    const [pendingDraftData, setPendingDraftData] = useState<{ emailId: string, inquiry: string, generatedDraft: string } | null>(null)

    // Template State
    const [templates, setTemplates] = useState<Template[]>([])
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [templateInitialData, setTemplateInitialData] = useState<Partial<Template> | undefined>(undefined)
    const [isLearningDataManagerOpen, setIsLearningDataManagerOpen] = useState(false)

    // --- Search & Filter State ---
    const [searchQuery, setSearchQuery] = useState("")
    const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'priority-desc' | 'priority-asc'>('date-desc')
    const [filterCategories, setFilterCategories] = useState<string[]>([])
    const [filterPriorities, setFilterPriorities] = useState<number[]>([])
    const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
    const [filterNewOnly, setFilterNewOnly] = useState(false)
    const [filterTrash, setFilterTrash] = useState(false)


    // Analysis State
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)

    // Generation Notes State
    const [generationNotes, setGenerationNotes] = useState<string[]>([])
    // Removed popup state: const [isGenerationResultOpen, setIsGenerationResultOpen] = useState(false)

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
                if (email.id) {
                    updateEmail(email.id, { classification: cachedData[hash] });
                }

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
                    if (newEmails[i].id) {
                        updateEmail(newEmails[i].id, { classification });
                    }

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
            // Also check if signature is already included to avoid duplication
            if (signature && !isRefine && !finalDraft.includes(signature)) {
                finalDraft += `\n\n${signature}`;
            }

            setGeneratedDraft(finalDraft);
            setGenerationNotes(data.notes || []); // Store notes
            // Removed popup trigger: setIsGenerationResultOpen(true); 

            // Reset refine instructions after success
            if (isRefine) setRefineInstructions("");

            // Reset saved status since content changed
            setIsDraftSaved(false);

            // Toast removed to avoid cluttering with the modal, or keep as background info
            // toast.success(isRefine ? "返信を再生成しました" : "返信下書きを生成しました");

            // Mark as processed if it's a new Gmail import
            if (selectedEmailId && selectedEmail?.source === 'gmail' && !selectedEmail.isProcessed) {
                // Update local
                setEmails(prev => prev.map(e => e.id === selectedEmailId ? { ...e, isProcessed: true } : e));
                // Update DB
                updateEmail(selectedEmailId, { isProcessed: true }).catch(err => console.error("Failed to mark processed", err));
            }
        } catch (error) {
            console.error(error);
            toast.error("生成に失敗しました");
        } finally {
            setIsGenerating(false);
        }
    };



    const handleSaveToTraining = async () => {
        if (!generatedDraft) return;

        const inquiryText = isManualInput ? manualInquiry : emails.find(e => e.id === selectedEmailId)?.inquiry || "";
        const emailDate = isManualInput ? new Date().toISOString() : emails.find(e => e.id === selectedEmailId)?.datetime || new Date().toISOString();
        const emailId = generateEmailHash(emailDate, inquiryText);

        const dataToSave = {
            emailId: emailId,
            inquiry: inquiryText,
            generatedDraft: generatedDraft,
        };

        // Check for duplicates
        const existingId = await checkDraftExists(emailId);
        if (existingId) {
            setExistingDraftId(existingId);
            setPendingDraftData(dataToSave);
            setIsOverwriteAlertOpen(true);
            return;
        }

        const draftId = await saveDraft({
            ...dataToSave,
            isApproved: true // Direct save implies approval for learning
        });

        if (draftId) {
            setIsDraftSaved(true);
            toast.success("学習データとして保存しました");
        } else {
            toast.error("保存に失敗しました(Firebase設定を確認してください)");
        }
    };

    const handleOverwriteDraft = async () => {
        if (!existingDraftId || !pendingDraftData) return;

        try {
            await updateDraft(existingDraftId, {
                inquiry: pendingDraftData.inquiry,
                generatedDraft: pendingDraftData.generatedDraft,
                isApproved: true
            });
            setIsDraftSaved(true);
            toast.success("学習データを上書き保存しました");
        } catch (e) {
            console.error(e);
            toast.error("上書き保存に失敗しました");
        } finally {
            setIsOverwriteAlertOpen(false);
            setExistingDraftId(null);
            setPendingDraftData(null);
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
            toast.success("設定を保存共有しました")
        } catch (e) {
            console.error(e)
            toast.warning("設定は保存されましたが、共有に失敗しました")
        }

        setIsPolicyModalOpen(false)
    }



    const [isGmailLoading, setIsGmailLoading] = useState(false);
    const handleImportGmail = async () => {
        setIsGmailLoading(true);
        try {
            const imports = await getGmailImports();
            if (imports.length === 0) {
                toast.info("新着メールはありません");
                setIsGmailLoading(false);
                return;
            }

            const newEmails: Email[] = imports.map((item) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const recv = item.receivedAt as any;
                const date = recv?.toDate ? recv.toDate() : new Date();
                const datetimeStr = date.toLocaleString('ja-JP', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });

                // Combine subject and body for inquiry
                const inquiryContent = `【件名】${item.subject || '(件名なし)'}\n\n${item.body || ''}`;

                return {
                    id: generateEmailHash(datetimeStr, inquiryContent), // Generate consistent ID
                    datetime: datetimeStr,
                    inquiry: inquiryContent,
                    response: "",
                    source: 'gmail',
                    isProcessed: false
                };
            });

            // Save to emails collection
            await saveEmails(newEmails);

            // Mark as processed
            await markGmailProcessed(imports.map((i) => i.id));

            // Reload state
            const storedEmails = await getEmails();
            setEmails(storedEmails);

            toast.success(`${newEmails.length}件のメールを取り込みました`);

        } catch (e) {
            console.error("Gmail import failed:", e);
            toast.error("Gmail取込に失敗しました");
        } finally {
            setIsGmailLoading(false);
        }
    };

    // Format date for display: MM/DD HH:mm




    const filteredEmails = useMemo(() => {
        let result = [...emails];


        // 0. Filter Trash (Soft Delete)
        if (filterTrash) {
            result = result.filter(e => e.isDeleted);
        } else {
            result = result.filter(e => !e.isDeleted);
        }

        // 1. Search
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(e => e.inquiry.toLowerCase().includes(lowerQ));
        }

        // 2. Filter: Categories
        if (filterCategories.length > 0) {
            result = result.filter(e => e.classification?.category && filterCategories.includes(e.classification.category));
        }

        // 3. Filter: Priorities
        if (filterPriorities.length > 0) {
            result = result.filter(e => e.classification?.priority && filterPriorities.includes(e.classification.priority));
        }

        // 4. Filter: Date Range
        if (filterDateRange !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            result = result.filter(e => {
                const d = new Date(e.datetime);
                if (isNaN(d.getTime())) return false;
                const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const diffTime = today.getTime() - target.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (filterDateRange === 'today') return diffDays === 0;
                if (filterDateRange === 'week') return diffDays <= 7;
                if (filterDateRange === 'month') return diffDays <= 30;
                return true;
            });
        }

        // 5. Filter: New Only
        if (filterNewOnly) {
            result = result.filter(e => e.source === 'gmail' && !e.isProcessed);
        }

        // 6. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.datetime).getTime();
            const dateB = new Date(b.datetime).getTime();
            const prioA = a.classification?.priority || 0;
            const prioB = b.classification?.priority || 0;

            switch (sortOption) {
                case 'date-desc': return dateB - dateA;
                case 'date-asc': return dateA - dateB;
                case 'priority-desc': return prioB - prioA;
                case 'priority-asc': return prioA - prioB;
                default: return 0;
            }
        });

        return result;
    }, [emails, searchQuery, filterCategories, filterPriorities, filterDateRange, filterNewOnly, sortOption, filterTrash]);

    // Alias for backward compatibility
    const derivedEmails = filteredEmails;
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
                            onClick={() => setIsPolicyModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border-0 shadow-md"
                        >
                            <Settings className="w-4 h-4" />
                            <span>設定</span>
                        </Button>
                        <Button
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border-0 shadow-md"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>模範回答</span>
                        </Button>
                        <Button
                            onClick={() => setIsLearningDataManagerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border-0 shadow-md"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>学習データ管理</span>
                        </Button>
                        <Button
                            onClick={() => setIsAnalysisModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border-0 shadow-md"
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>分析</span>
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
                {/* Left Column：問い合わせ一覧 (w-[400px]) - Refactored based on Figma */}
                <div className="w-[400px] bg-blue-50 border-r-2 border-blue-200 flex flex-col shrink-0">
                    <div className="p-4 border-b-2 border-blue-300 bg-blue-100">
                        <h2 className="text-blue-900 font-bold text-lg">問い合わせ一覧</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* アクションボタンエリア */}
                        <div className="p-3 space-y-2 border-b-2 border-blue-200 bg-white">
                            {/* Classification Status */}
                            {isClassifying && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded text-sm text-slate-600 mb-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    分類中... {classificationProgress?.current}/{classificationProgress?.total}
                                </div>
                            )}

                            {/* 上段：Gmail取り込み + 新規作成 */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleImportGmail}
                                    disabled={isGmailLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border-2 border-red-400 rounded-lg transition-colors text-red-600 shadow-sm disabled:opacity-50"
                                >
                                    {isGmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    <span className="text-sm">Gmail取込</span>
                                </button>
                                <button
                                    onClick={startManualInput}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-lg transition-all text-white shadow-md"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-sm">新規作成</span>
                                </button>

                                {/* CSV Upload Trigger (using SlidersHorizontal icon as placeholder for "More Actions" / Upload) */}
                                <input
                                    type="file"
                                    accept=".csv"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-lg transition-colors text-gray-600 shadow-sm"
                                    title="CSV取込"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                            </div>

                            {/* 中段：検索窓 + フィルターボタン */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="検索..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Filter Menu Trigger */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={cn("flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 border-2 border-blue-400 rounded-lg transition-colors text-blue-600 shadow-sm", (filterCategories.length > 0 || filterPriorities.length > 0 || filterDateRange !== 'all' || filterNewOnly) && "bg-blue-100 ring-2 ring-blue-300")}>
                                            <Filter className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>絞り込み</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setFilterNewOnly(!filterNewOnly)}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filterNewOnly ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className={cn("h-4 w-4")} />
                                            </div>
                                            <span>新着（未処理）のみ</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setFilterTrash(!filterTrash)}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filterTrash ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className={cn("h-4 w-4")} />
                                            </div>
                                            <span>ゴミ箱 (削除済み)</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>日付範囲</DropdownMenuLabel>
                                        {(['all', 'today', 'week', 'month'] as const).map((range) => (
                                            <DropdownMenuItem key={range} onClick={() => setFilterDateRange(range)}>
                                                {filterDateRange === range && <Check className="w-4 h-4 mr-2" />}
                                                {range === 'all' && 'すべて'}
                                                {range === 'today' && '今日'}
                                                {range === 'week' && '今週'}
                                                {range === 'month' && '今月'}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>カテゴリ</DropdownMenuLabel>
                                        {["予約", "症状相談", "書類", "料金", "クレーム", "その他"].map(cat => (
                                            <DropdownMenuCheckboxItem
                                                key={cat}
                                                checked={filterCategories.includes(cat)}
                                                onCheckedChange={(checked) => setFilterCategories(checked ? [...filterCategories, cat] : filterCategories.filter(c => c !== cat))}
                                            >
                                                {cat}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>優先度</DropdownMenuLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={filterPriorities.includes(5)}
                                            onCheckedChange={(checked) => setFilterPriorities(checked ? [...filterPriorities, 5] : filterPriorities.filter(p => p !== 5))}
                                        >
                                            最高 (5)
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuCheckboxItem
                                            checked={filterPriorities.includes(4)}
                                            onCheckedChange={(checked) => setFilterPriorities(checked ? [...filterPriorities, 4] : filterPriorities.filter(p => p !== 4))}
                                        >
                                            高 (4)
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Sort Menu Trigger - Using SlidersHorizontal/ListFilter generic icon */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 border-2 border-blue-400 rounded-lg transition-colors text-blue-600 shadow-sm">
                                            <ListFilter className="w-4 h-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSortOption('date-desc')}>
                                            {sortOption === 'date-desc' && <Check className="w-4 h-4 mr-2" />}
                                            日付 (新しい順)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortOption('date-asc')}>
                                            {sortOption === 'date-asc' && <Check className="w-4 h-4 mr-2" />}
                                            日付 (古い順)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortOption('priority-desc')}>
                                            {sortOption === 'priority-desc' && <Check className="w-4 h-4 mr-2" />}
                                            優先度 (高い順)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortOption('priority-asc')}>
                                            {sortOption === 'priority-asc' && <Check className="w-4 h-4 mr-2" />}
                                            優先度 (低い順)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* AI Classify Trigger */}
                                <button
                                    onClick={handleClassify}
                                    disabled={emails.length === 0 || isClassifying}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all text-white shadow-md disabled:opacity-50"
                                >
                                    <Play className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 問い合わせリスト */}
                        <div className="p-3 space-y-2">
                            {derivedEmails.map((email) => {
                                const isSelected = selectedEmailId === email.id;
                                const priority = email.classification?.priority || 1;

                                // Priority Configuration Logic
                                let config = {
                                    bg: 'bg-green-50',
                                    border: 'border-green-200',
                                    text: 'text-green-700',
                                    label: '低',
                                    icon: Clock
                                };
                                if (priority >= 4) { // High (4, 5)
                                    config = { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '高', icon: AlertCircle };
                                } else if (priority === 3) { // Medium (3)
                                    config = { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: '中', icon: Clock };
                                }
                                const Icon = config.icon;

                                return (
                                    <button
                                        key={email.id}
                                        onClick={() => {
                                            setSelectedEmailId(email.id);
                                            setIsManualInput(false);
                                        }}
                                        className={cn(
                                            "w-full p-4 rounded-lg text-left transition-all",
                                            isSelected
                                                ? 'bg-white shadow-lg border-2 border-teal-400 ring-2 ring-teal-200'
                                                : 'bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* 優先度インジケーター */}
                                            <div className={cn("flex-shrink-0 w-1.5 h-full rounded-full min-h-[4rem]", isSelected ? 'bg-teal-500' : config.bg.replace('bg-', 'bg-').replace('-50', '-500'))} />

                                            <div className="flex-1 min-w-0">
                                                {/* 日時と優先度 */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-gray-500 text-xs font-mono">{email.datetime}</span>
                                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border", config.bg, config.text, config.border)}>
                                                        <Icon className="w-3 h-3" />
                                                        優先度: {config.label}
                                                    </span>
                                                    {priority >= 5 && <Loader2 className="w-3 h-3 animate-pulse text-red-500" />}
                                                </div>

                                                {/* 件名 */}
                                                <div className={cn("mb-2 truncate font-bold", isSelected ? 'text-gray-900' : 'text-gray-800')}>
                                                    {email.inquiry.slice(0, 100) || "件名なし"}
                                                </div>

                                                {/* カテゴリ */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {email.classification?.category && (
                                                        <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs border border-blue-200 whitespace-nowrap">
                                                            {email.classification.category}
                                                        </span>
                                                    )}
                                                    {email.response && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium whitespace-nowrap">
                                                            <Check className="w-3 h-3" />
                                                            下書き生成済み
                                                        </span>
                                                    )}
                                                    {email.source === 'gmail' && !email.isProcessed && (
                                                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded font-bold animate-pulse whitespace-nowrap">
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 内容のプレビュー */}
                                                <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                                                    {email.inquiry}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            {emails.length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    メールがありません。<br />CSVアップロードか取込を行ってください。
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area (Layout) */}

                {/* Main Content (Center + Right Columns) */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedEmail || isManualInput ? (
                        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
                            {/* Unified Header Area */}
                            <div className="bg-white border-b px-6 py-4 shadow-sm flex-shrink-0">
                                {isManualInput ? (
                                    <div className="text-gray-500 font-bold text-lg">新規作成モード</div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {/* Row 1: Title & Meta */}
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">
                                                    {selectedEmail?.inquiry.slice(0, 40)}...
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                                    <span className="font-mono text-gray-500">{selectedEmail?.datetime}</span>
                                                    {selectedEmail?.classification?.category && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200 text-xs">
                                                            {selectedEmail.classification.category}
                                                        </span>
                                                    )}
                                                    {selectedEmail?.classification?.priority && (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded border text-xs",
                                                            selectedEmail.classification.priority >= 4 ? "bg-red-50 text-red-700 border-red-200" :
                                                                selectedEmail.classification.priority >= 3 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                    "bg-green-50 text-green-700 border-green-200"
                                                        )}>
                                                            優先度: {selectedEmail.classification.priority >= 4 ? "高" : selectedEmail.classification.priority >= 3 ? "中" : "低"}
                                                        </span>
                                                    )}

                                                    {/* Actions (Moved here) */}
                                                    <div className="flex items-center gap-2 ml-2">
                                                        {filterTrash ? (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs px-2"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (!selectedEmailId) return;
                                                                        await restoreEmail(selectedEmailId);
                                                                        setEmails(prev => prev.map(em => em.id === selectedEmailId ? { ...em, isDeleted: false } : em));
                                                                        toast.success("メールを復元しました");
                                                                        setSelectedEmailId(null);
                                                                    }}
                                                                >
                                                                    <Undo2 className="w-3 h-3 mr-1" /> 復元
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs px-2"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (!selectedEmailId) return;
                                                                        if (!confirm("本当に完全に削除しますか？この操作は取り消せません。")) return;
                                                                        await hardDeleteEmail(selectedEmailId);
                                                                        setEmails(prev => prev.filter(em => em.id !== selectedEmailId));
                                                                        toast.success("メールを完全に削除しました");
                                                                        setSelectedEmailId(null);
                                                                    }}
                                                                >
                                                                    <Ban className="w-3 h-3 mr-1" /> 完全削除
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-6 px-2 text-xs"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!selectedEmailId) return;
                                                                    if (!confirm("このメールをゴミ箱に移動しますか？")) return;
                                                                    await deleteEmail(selectedEmailId);
                                                                    setEmails(prev => prev.map(em => em.id === selectedEmailId ? { ...em, isDeleted: true } : em));
                                                                    toast.success("メールをゴミ箱に移動しました");
                                                                    setSelectedEmailId(null);
                                                                }}
                                                            >
                                                                <Trash2 className="w-3 h-3 mr-1" /> 削除
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>


                                        </div>

                                        {/* Warning Area */}
                                        {selectedEmail?.classification?.priority === 5 && (
                                            <div className="w-full bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-3">
                                                <Loader2 className="w-5 h-5 text-red-600 animate-pulse mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-bold text-red-800">緊急性が高い内容が含まれています</p>
                                                    <p className="text-xs text-red-600">希死念慮や自傷行為を示唆する言葉、または早急な対応が必要な内容が検出されました。</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Main Content: 2 Columns Fixed Height */}
                            <div className="flex-1 p-6 overflow-hidden">
                                <div className="grid grid-cols-2 gap-6 h-full">

                                    {/* Left Column: Inquiry Body */}
                                    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-blue-600" />
                                            <h3 className="text-blue-900 font-bold text-sm">問い合わせ内容</h3>
                                        </div>
                                        <ScrollArea className="flex-1 p-4">
                                            {isManualInput ? (
                                                <Textarea
                                                    className="w-full min-h-[400px] resize-none border-0 text-[16px] leading-[1.8] focus-visible:ring-0 p-0"
                                                    placeholder="ここに問い合わせ内容を入力または貼り付けてください..."
                                                    value={manualInquiry}
                                                    onChange={(e) => setManualInquiry(e.target.value)}
                                                />
                                            ) : (
                                                <div className="text-gray-800 leading-[1.8] whitespace-pre-wrap text-[16px]">
                                                    {selectedEmail?.inquiry}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>

                                    {/* Right Column: Draft & Actions */}
                                    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-2 bg-teal-50 border-b border-teal-100 flex justify-between items-center">
                                            <div className="flex items-center gap-2 px-2">
                                                <Settings className="w-5 h-5 text-teal-600" />
                                                <h3 className="text-teal-900 font-bold text-sm">返信下書き</h3>
                                            </div>

                                            {/* Action Buttons moved to Header */}
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs gap-1"
                                                    onClick={() => handleGenerate(false)}
                                                    disabled={isGenerating || !isReadyToGenerate}
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    {isGenerating ? "生成中..." : "AI生成"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs gap-1"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedDraft);
                                                        toast.success("コピーしました");
                                                    }}
                                                    disabled={!generatedDraft}
                                                >
                                                    <Copy className="w-3 h-3" /> コピー
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                                                    onClick={handleSaveToTraining}
                                                    disabled={!generatedDraft || isDraftSaved}
                                                >
                                                    <Save className="w-3 h-3" /> 学習用に保存
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col relative">
                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center">
                                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-2"></div>
                                                    <p className="text-sm text-gray-500 font-medium animate-pulse">AIが返信を生成中...</p>
                                                </div>
                                            )}
                                            <Textarea
                                                className="flex-1 w-full h-full resize-none border-0 p-4 text-[16px] leading-[1.8] focus-visible:ring-0 font-mono"
                                                placeholder="AI生成ボタンを押すと、ここに返信案が作成されます。"
                                                value={generatedDraft}
                                                onChange={(e) => setGeneratedDraft(e.target.value)}
                                            />
                                        </div>

                                        {/* Generation Notes (Inline) */}
                                        {generationNotes.length > 0 && (
                                            <div className="bg-blue-50 border-t border-b border-blue-100 p-3 shrink-0">
                                                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                                                    <Sparkles className="w-4 h-4" />
                                                    生成時の注意点
                                                </h4>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {generationNotes.map((note, index) => (
                                                        <li key={index} className="text-xs text-gray-700 leading-snug">{note}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="p-2 border-t bg-gray-50 flex gap-2 items-center">
                                            <Textarea
                                                className="flex-1 min-h-[44px] h-[44px] resize-none py-2 px-3 text-[15px] bg-white border-gray-300"
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
                                </div>
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
                {
                    isPolicyModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                            <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col max-h-[95vh]">
                                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                    <h2 className="text-xl font-bold text-gray-800">設定（返信ポリシー署名）</h2>
                                    <Button variant="ghost" size="icon" onClick={() => setIsPolicyModalOpen(false)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                                <div className="p-6 flex-1 overflow-auto flex flex-col gap-6">

                                    {/* Clinic Info Section */}
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col gap-4">
                                        <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                            クリニック情報 (AIが参照します)
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                            ここに登録した情報は、AIが返信を生成する際に自動的に参照されます。例えば「予約したい」という問い合わせには予約ページURLを、「診療時間を知りたい」には診療時間を含んだ返信が生成されます。よく問い合わせがある内容を登録しておくと、正確で一貫性のある返信が作成できます。
                                        </p>
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
                                        <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                                            ここに記載したルールに従って、AIが返信文を生成します。挨拶の仕方、結論の伝え方、共感の度合いなど、クリニックの対応方針に合わせて調整できます。
                                        </p>
                                        <Textarea
                                            className="w-full font-mono text-sm leading-relaxed min-h-[300px] text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                                            value={policy}
                                            onChange={(e) => setPolicy(e.target.value)}
                                            placeholder="返信ポリシーを入力..."
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-2 block font-bold text-gray-700">署名 (Signature)</Label>
                                        <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                                            生成された返信の末尾に自動で追加されます。
                                        </p>
                                        <Textarea
                                            className="w-full font-mono text-sm leading-relaxed min-h-[150px] text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                                            value={signature}
                                            onChange={(e) => setSignature(e.target.value)}
                                            placeholder="署名を入力..."
                                        />
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
                    )
                }

                {/* CSV Upload Confirmation Modal */}
                {
                    isUploadModalOpen && (
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
                                            <span className="text-xl"></span>
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
                    )
                }
            </div>
            {/* Template Manager Modal */}
            <TemplateManager
                isOpen={isTemplateModalOpen}
                onClose={() => {
                    setIsTemplateModalOpen(false)
                    setTemplateInitialData(undefined) // Reset on close
                }}
                initialData={templateInitialData}
            />

            {/* Learning Data Manager Modal */}
            <LearningDataManager
                isOpen={isLearningDataManagerOpen}
                onClose={() => setIsLearningDataManagerOpen(false)}
                onAddToTemplate={(data) => {
                    setTemplateInitialData(data)
                    setIsLearningDataManagerOpen(false) // Close learning manager
                    setTimeout(() => setIsTemplateModalOpen(true), 100) // Open template manager (slight delay for smooth transition)
                }}
            />

            {/* Overwrite Confirmation Dialog */}
            <Dialog open={isOverwriteAlertOpen} onOpenChange={setIsOverwriteAlertOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>学習データの重複</DialogTitle>
                        <DialogDescription>
                            この問い合わせの学習データは既に存在します。上書きしますか？
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOverwriteAlertOpen(false)}>キャンセル</Button>
                        <Button onClick={handleOverwriteDraft} className="bg-blue-600 hover:bg-blue-700 text-white">上書き</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Analysis Dashboard Modal */}
            <AnalysisDashboard isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} emails={emails} />
        </div>
    )
}
