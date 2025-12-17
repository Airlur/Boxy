import React from 'react';
import { X } from 'lucide-react';

export function CategoryModal({ editingCat, onSave, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 relative z-10 animate-modal-in">
                <h3 className="font-bold text-lg mb-4">{editingCat ? '编辑分类' : '新增分类'}</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const name = e.target.catName.value;
                    if (!name) return;
                    onSave(name);
                }}>
                    <div className="mb-5">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">分类名称</label>
                        <input name="catName" defaultValue={editingCat?.name} autoFocus className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-black outline-none" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600">取消</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800">保存</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
