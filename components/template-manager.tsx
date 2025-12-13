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
import { Plus, Trash2, Edit2, Search, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface TemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = ["予約", "症状相談", "書類", "料金", "クレーム", "その他"];

export function TemplateManager({ isOpen, onClose }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        category: "その他",
        pattern: "",
        response: ""
    });

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setIsLoading(true);
        const data = await getTemplates();
        setTemplates(data);
        setIsLoading(false);
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
            loadTemplates();
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
            loadTemplates();
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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="h-6 w-6 text-blue-600" />
                            模範回答（テンプレート）管理
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            問い合わせパターン別の模範回答を登録し、AI生成の精度を向上させます。
                        </DialogDescription>
                    </div>
                    <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                        新規登録
                    </Button>
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
                                {CATEGORIES.map(cat => (
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
                                                <div className="whitespace-pre-wrap text-sm text-gray-600 max-h-[100px] overflow-hidden group-hover:max-h-none transition-all">
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
                                        {CATEGORIES.map(c => (
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
    )
}
