"use client"

import { useState, useEffect } from "react"
import { Draft, Template } from "@/lib/types"
import { getLearningData, deleteDraft } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Trash2, BookOpen, Search, Eye, Copy } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LearningDataManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToTemplate?: (data: Partial<Template>) => void;
}

export function LearningDataManager({ isOpen, onClose, onAddToTemplate }: LearningDataManagerProps) {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getLearningData();
        setDrafts(data);
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？\n削除するとAIの学習対象から除外されます。")) return;
        try {
            await deleteDraft(id);
            toast.success("学習データを削除しました");
            loadData();
        } catch (e) {
            console.error(e);
            toast.error("削除に失敗しました");
        }
    };

    const filteredDrafts = drafts.filter(d => {
        const q = searchQuery.toLowerCase();
        return d.inquiry.toLowerCase().includes(q) ||
            (d.finalResponse || d.generatedDraft).toLowerCase().includes(q);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDate = (val: any) => {
        if (!val) return "-";
        // Handle Firestore timestamp or Date string
        const date = val.toDate ? val.toDate() : new Date(val);
        return date.toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                    <div className="p-6 border-b border-gray-200 shrink-0">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 mb-2">
                            <BookOpen className="h-6 w-6 text-indigo-600" />
                            学習データ管理
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 space-y-2">
                            <p>学習データは、AI返信生成時に参考例として使用されます。</p>
                            <div className="bg-indigo-50 p-3 rounded-md text-indigo-900 text-sm space-y-2">
                                <p>
                                    保存されたデータの中から、<strong>最新5件</strong>が優先的にAIに提示されます。<br />
                                    AIはクリニックらしい「口調や雰囲気（話し方）」を学び、返信を生成します。<br />
                                    <span className="text-xs text-indigo-700">※内容も参考にするため、正確で書きぶりも良い返信を保存してください。</span>
                                </p>
                                <p className="flex items-start gap-2 font-bold text-indigo-700 bg-white/50 p-2 rounded">
                                    <span className="text-lg leading-none">💡</span>
                                    <span className="text-xs">ずっと使いたい返信例は「模範解答」に移すと、常にAIが参照するようになります。</span>
                                </p>
                            </div>
                        </DialogDescription>
                    </div>

                    <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="キーワード検索..."
                            className="max-w-xs bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="ml-auto text-sm text-gray-500">
                            全 {drafts.length} 件
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[180px]">保存日時</TableHead>
                                    <TableHead className="min-w-[200px]">問い合わせ内容（抜粋）</TableHead>
                                    <TableHead className="min-w-[200px]">返信内容（抜粋）</TableHead>
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
                                ) : filteredDrafts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                                            学習データがありません。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDrafts.map(draft => (
                                        <TableRow key={draft.id} className="group hover:bg-gray-50">
                                            <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                                                {formatDate(draft.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="line-clamp-2 text-sm text-gray-700">
                                                    {draft.inquiry}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="line-clamp-2 text-sm text-gray-700">
                                                    {draft.finalResponse || draft.generatedDraft}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSelectedDraft(draft)}
                                                        title="詳細を確認"
                                                    >
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(draft.id)}
                                                        title="学習データから削除"
                                                    >
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
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={!!selectedDraft} onOpenChange={(open) => !open && setSelectedDraft(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>詳細確認</DialogTitle>
                        <div className="text-sm text-gray-500">
                            保存日時: {selectedDraft ? formatDate(selectedDraft.createdAt) : '-'}
                        </div>
                    </DialogHeader>
                    {selectedDraft && (
                        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0 py-4">
                            <div className="flex flex-col min-h-0">
                                <div className="font-bold mb-2 text-gray-700 bg-gray-100 p-2 rounded">問い合わせ</div>
                                <ScrollArea className="flex-1 border rounded-md p-4 bg-gray-50">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {selectedDraft.inquiry}
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="flex flex-col min-h-0">
                                <div className="font-bold mb-2 text-indigo-700 bg-indigo-50 p-2 rounded">保存された返信</div>
                                <ScrollArea className="flex-1 border rounded-md p-4 bg-white">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {selectedDraft.finalResponse || selectedDraft.generatedDraft}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                        {onAddToTemplate && selectedDraft && (
                            <Button
                                onClick={() => {
                                    if (!selectedDraft) return;
                                    onAddToTemplate({
                                        category: "その他", // Default, user can change
                                        pattern: "学習データからの追加",
                                        response: selectedDraft.generatedDraft || selectedDraft.finalResponse || "",
                                        source: 'learning_data'
                                    });
                                }}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                模範回答に追加
                            </Button>
                        )}
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (selectedDraft && confirm("本当に削除しますか？")) {
                                    handleDelete(selectedDraft.id);
                                    setSelectedDraft(null);
                                }
                            }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            削除
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
