import React from 'react';
import { X, Trash } from 'lucide-react';
import { LinksInput } from '../LinksInput';

export function SoftwareModal({ editingSoft, categories, currentCategory, onSave, onDelete, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-100 relative z-10 animate-modal-in max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="font-bold text-lg">{editingSoft ? '编辑软件' : '添加软件'}</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button>
                </div>
                <form id="softForm" onSubmit={onSave} className="p-6 overflow-y-auto">
                    <input type="hidden" name="id" defaultValue={editingSoft?.id} />
                    <div className="grid gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">名称</label>
                                <input name="name" required defaultValue={editingSoft?.name} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">分类</label>
                                <select name="categoryId" defaultValue={editingSoft ? editingSoft._catId : (currentCategory !== 'all' ? currentCategory : categories[0]?.id)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black">
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">官网</label>
                                <input name="website" defaultValue={editingSoft?.website} placeholder="https://" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">图标地址 (可选)</label>
                                <input name="iconUrl" defaultValue={editingSoft?.iconUrl} placeholder="https://example.com/icon.png" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">描述</label>
                            <input name="description" defaultValue={editingSoft?.description} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" />
                        </div>
                        <LinksInput id="dl-inputs" label="下载链接" initialValues={editingSoft?.downloadUrls} />
                        <LinksInput id="blog-inputs" label="博客/教程链接" initialValues={editingSoft?.blogUrls} />
                    </div>
                </form>
                <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-xl">
                    {editingSoft ? 
                        <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-md transition-colors">删除</button> 
                        : <div></div>
                    }
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black">取消</button>
                        <button type="submit" form="softForm" className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md shadow-sm">保存</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
