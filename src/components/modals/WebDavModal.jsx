import React, { useState } from 'react';
import { CloudDownload, CloudUpload, X, Eye, EyeOff } from 'lucide-react';

export function WebDavModal({ config, setConfig, onSync, onClose }) {
    const [showPass, setShowPass] = useState(false);

    const handleSaveConfig = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-100 relative z-10 animate-modal-in">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">WebDAV 同步</h3>
                    <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-black"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label>
                        <input type="text" value={config.url} onChange={e => handleSaveConfig('url', e.target.value)} placeholder="https://dav.example.com/" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
                        <input type="text" value={config.user} onChange={e => handleSaveConfig('user', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">密码 (应用密码)</label>
                        <div className="relative">
                            <input type={showPass ? "text" : "password"} value={config.pass} onChange={e => handleSaveConfig('pass', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black pr-8"/>
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                        </div>
                    </div>
                    
                        <div className="flex flex-col gap-2 pt-2">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="wd-autosync" 
                                    checked={config.autoSync || false} 
                                    onChange={e => {
                                        const isAuto = e.target.checked;
                                        // 如果开启自动同步，强制开启记住密码
                                        if (isAuto) {
                                            setConfig({ ...config, autoSync: true, remember: true });
                                        } else {
                                            handleSaveConfig('autoSync', false);
                                        }
                                    }} 
                                />
                                <label htmlFor="wd-autosync" className="text-xs text-gray-500 select-none cursor-pointer">开启自动同步 (需记住密码)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="wd-remember" 
                                    checked={config.remember} 
                                    disabled={config.autoSync} // 开启自动同步时禁用取消
                                    onChange={e => handleSaveConfig('remember', e.target.checked)} 
                                />
                                <label htmlFor="wd-remember" className={`text-xs select-none cursor-pointer ${config.autoSync ? 'text-gray-400' : 'text-gray-500'}`}>
                                    记住密码 (保存在本地) {config.autoSync && <span className="text-[10px]">(自动同步必须)</span>}
                                </label>
                            </div>
                        </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button onClick={() => onSync('pull')} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                            <CloudDownload size={16} className="text-blue-600"/> 立即拉取
                        </button>
                        <button onClick={() => onSync('push')} className="flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">
                            <CloudUpload size={16}/> 立即推送
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
