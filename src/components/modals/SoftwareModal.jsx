import React from 'react';
import { X, Trash, Upload } from 'lucide-react';
import { LinksInput } from '../LinksInput';

export function SoftwareModal({ editingSoft, categories, currentCategory, onSave, onDelete, onClose, showToast }) {
    
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. 文件类型检查
        if (!file.type.startsWith('image/')) {
            showToast('请选择图片文件', 'error');
            return;
        }

        // 2. 文件大小预检查 (限制 50KB)
        if (file.size > 50 * 1024) {
            showToast('图片太大，请选择 50KB 以内的文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 限制最大尺寸 128x128
                const maxSize = 128;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/png', 0.8);
                
                // 3. 转换后大小警告 (base64字符串长度>30000，对应实际文件大小 ≈ 22KB)
                if (base64.length > 30000) {
                    showToast('图标文件较大，可能会影响同步速度', 'info');
                }

                const input = document.getElementById('iconUrlInput');
                if (input) {
                    input.value = base64;
                    // 触发 React 可能需要的事件（虽然目前非受控，但是个好习惯）
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                showToast('图标已转换并填入');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

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
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">图标地址 (支持 URL 或 Base64)</label>
                                <div className="relative">
                                    <input id="iconUrlInput" name="iconUrl" defaultValue={editingSoft?.iconUrl} placeholder="https://... 或粘贴 Base64" className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" />
                                    <button type="button" onClick={() => document.getElementById('iconUpload').click()} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black" title="上传图片转Base64">
                                        <Upload size={16} />
                                    </button>
                                    <input type="file" id="iconUpload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
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
