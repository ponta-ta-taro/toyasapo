"use client"

import { useState, useEffect } from "react"
import { Template } from "@/lib/types"
import { saveTemplate, getTemplates, updateTemplate, deleteTemplate } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Edit2, Search, BookOpen, Settings, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { getSettings, saveSettings } from "@/lib/db"

interface TemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<Template>;
}

const DEFAULT_CATEGORIES = ["予約", "症状相談", "書類", "料金", "クレーム", "その他"];

export function TemplateManager({ isOpen, onClose, initialData }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string | "all">("all");


    const [searchQuery, setSearchQuery] = useState("");
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

    // Category Management State
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        category: "その他",
        pattern: "",
        response: ""
    });

    // Check for initial data when opening
    useEffect(() => {
        if (isOpen && initialData) {
            // Assuming these setters exist or formData should be used
            // For now, faithfully applying the provided snippet.
            // If `setInputCategory`, `setInputPattern`, `setInputResponse`, `setIsEditing`, `setViewMode` are not defined,
            // this will cause a compilation error.
            // A more robust change would be to use setFormData:
            // setFormData({
            //     category: initialData.category || "その他",
            //     pattern: initialData.pattern || "",
            //     response: initialData.response || ""
            // });
            // setEditingId(null); // It's a new entry based on data, not editing an existing one
            // setIsFormOpen(true); // Open the form with initial data
            // However, following the strict instruction to apply the code as given.
            // The following lines are placeholders for the user's intended state variables.
            // setInputCategory(initialData.category || "その他")
            // setInputPattern(initialData.pattern || "")
            // setInputResponse(initialData.response || "")
            // setIsEditing(false) // It's a new entry based on data
            // setEditingId(null)
            // setViewMode('edit')

            // To make it syntactically correct with existing state:
            setFormData({
                category: initialData.category || "その他",
                pattern: initialData.pattern || "",
                response: initialData.response || ""
            });
            setEditingId(null); // It's a new entry based on data
            setIsFormOpen(true); // Open the form for a new entry
        }
    }, [isOpen, initialData])

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        const [tpls, settings] = await Promise.all([
            getTemplates(),
            getSettings()
        ]);
        setTemplates(tpls);
        if (settings?.templateCategories && settings.templateCategories.length > 0) {
            setCategories(settings.templateCategories);
        }
        setIsLoading(false);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        if (categories.includes(newCategoryName.trim())) {
            toast.error("既にあるカテゴリです");
            return;
        }
        const updated = [...categories, newCategoryName.trim()];
        setCategories(updated);
        setNewCategoryName("");

        // Persist
        try {
            const currentSettings = await getSettings();
            if (currentSettings) {
                await saveSettings({ ...currentSettings, templateCategories: updated });
                toast.success("カテゴリを追加しました");
            }
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        }
    };

    const handleDeleteCategory = async (cat: string) => {
        if (!confirm(`カテゴリ「${cat}」を削除しますか？`)) return;
        const updated = categories.filter(c => c !== cat);
        setCategories(updated);

        // Persist
        try {
            const currentSettings = await getSettings();
            if (currentSettings) {
                await saveSettings({ ...currentSettings, templateCategories: updated });
                toast.success("カテゴリを削除しました");
            }
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        }
    };

    const handleSave = async () => {
        if (!formData.pattern || !formData.response) {
            toast.error("必須項目を入力してください");
            return;
        }

        try {
            if (editingId) {
                await updateTemplate(editingId, formData);
                toast.success("テンプレートを更新しました");
            } else {
                await saveTemplate(formData);
                toast.success("テンプレートを作成しました");
            }
            setIsFormOpen(false);
            resetForm();
            loadData();
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;
        try {
            await deleteTemplate(id);
            toast.success("テンプレートを削除しました");
            loadData();
        } catch (e) {
            console.error(e);
            toast.error("削除に失敗しました");
        }
    };

    const startEdit = (t: Template) => {
        setEditingId(t.id);
        setFormData({
            category: t.category,
            pattern: t.pattern,
            response: t.response
        });
        setIsFormOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            category: "その他",
            pattern: "",
            response: ""
        });
    };

    const filteredTemplates = templates.filter(t => {
        const matchCategory = filterCategory === "all" || t.category === filterCategory;
        const matchSearch = t.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.response.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <BookOpen className="h-6 w-6 text-blue-600" />
                                模範回答（テンプレート）管理
                            </DialogTitle>
                            <DialogDescription className="mt-1 space-y-3">
                                <p>
                                    模範解答は、AI返信生成時に<strong className="text-blue-700">最優先で参照</strong>されます。<br />
                                    クリニックのルールや正しい手順など「正確な情報」を登録してください。<br />
                                    AIは問い合わせ内容に関連する模範解答を自動で見つけ出し、回答に使用します。
                                </p>
                                <div className="bg-blue-50 p-3 rounded-md text-blue-900 text-xs shadow-sm">
                                    <p className="font-bold border-b border-blue-200 pb-1 mb-1">📌 使い分け</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        <li><span className="font-bold">模範解答</span>：住所、料金、予約URL、診断書の手順など「正しい情報」</li>
                                        <li><span className="font-bold">学習データ</span>：挨拶の仕方、断り方など「話し方の見本」</li>
                                    </ul>
                                </div>
                            </DialogDescription>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)} className="gap-2">
                                <Settings className="h-4 w-4" /> カテゴリ管理
                            </Button>
                            <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                新規登録
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-1 min-h-0">
                        {/* Sidebar / Filter (Left) */}
                        <div className="w-64 border-r border-gray-200 p-4 bg-gray-50 flex flex-col gap-4 overflow-y-auto">
                            <div>
                                <Label className="text-xs font-bold text-gray-500 mb-2 block">検索</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="キーワード検索..."
                                        className="pl-8 bg-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-500 mb-2 block">カテゴリ</Label>
                                <div className="flex flex-col gap-1">
                                    <Button
                                        variant={filterCategory === "all" ? "secondary" : "ghost"}
                                        className="justify-start font-normal"
                                        onClick={() => setFilterCategory("all")}
                                    >
                                        すべて表示 ({templates.length})
                                    </Button>
                                    {categories.map(cat => (
                                        <Button
                                            key={cat}
                                            variant={filterCategory === cat ? "secondary" : "ghost"}
                                            className="justify-start font-normal"
                                            onClick={() => setFilterCategory(cat)}
                                        >
                                            {cat} ({templates.filter(t => t.category === cat).length})
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Main Content (Right) */}
                        <div className="flex-1 overflow-y-auto p-0">
                            <Table>
                                <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[120px]">カテゴリ</TableHead>
                                        <TableHead className="w-[200px]">パターン名</TableHead>
                                        <TableHead>模範回答内容</TableHead>
                                        <TableHead className="w-[100px] text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                                                読み込み中...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTemplates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                                                テンプレートがありません。新規登録してください。
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTemplates.map(t => (
                                            <TableRow key={t.id} className="group">
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal bg-white">
                                                        {t.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium align-top pt-4">
                                                    {t.pattern}
                                                </TableCell>
                                                <TableCell className="align-top pt-4">
                                                    <div className="whitespace-pre-wrap text-sm text-gray-600 line-clamp-3 overflow-hidden text-ellipsis h-[4.5em]">
                                                        {t.response}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right align-top pt-3">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" onClick={() => startEdit(t)}>
                                                            <Edit2 className="h-4 w-4 text-gray-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Edit/Create Modal (Nested) */}
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingId ? "テンプレート編集" : "テンプレート新規登録"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>カテゴリ</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="カテゴリを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>パターン名（問い合わせ概要）</Label>
                                    <Input
                                        placeholder="例：初診の紹介状について"
                                        value={formData.pattern}
                                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>模範回答（返信文面）</Label>
                                    <Textarea
                                        placeholder="ここに理想的な返信文を入力してください..."
                                        className="min-h-[200px]"
                                        value={formData.response}
                                        onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsFormOpen(false)}>キャンセル</Button>
                                <Button onClick={handleSave}>保存</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </DialogContent>
            </Dialog>

            {/* Category Manager Dialog */}
            <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>カテゴリ管理</DialogTitle>
                        <DialogDescription>テンプレートの分類カテゴリを追加・削除します。</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="新しいカテゴリ名"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>追加</Button>
                        </div>
                        <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                            {categories.map(cat => (
                                <div key={cat} className="flex justify-between items-center p-3">
                                    <span>{cat}</span>
                                    {/* Prevent deleting default/In-use? For now just allow delete */}
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat)} className="text-red-500 h-8 w-8 p-0">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
