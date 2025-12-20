import React, { useState } from 'react';
import { Cloud, GitBranch, Info, X, Eye, EyeOff, CloudDownload, CloudUpload } from 'lucide-react';

export function SettingsModal({ config, setConfig, onSync, onClose, onUpdateRepo }) {
    const [activeTab, setActiveTab] = useState('webdav');
    const [showPass, setShowPass] = useState(false);

    const handleSaveConfig = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
    };

    const tabs = [
        { id: 'webdav', label: 'WebDAV', icon: Cloud },
        { id: 'admin', label: '仓库管理', icon: GitBranch },
        { id: 'about', label: '关于', icon: Info },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] border border-gray-100 relative z-10 animate-modal-in flex overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 border-r border-gray-100 flex flex-col">
                    <div className="p-5 font-bold text-lg tracking-tight">设置</div>
                    <div className="flex-1 space-y-1 p-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-black z-20"><X size={20}/></button>
                    
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'webdav' && (
                            <div className="space-y-5 max-w-sm">
                                <h3 className="font-bold text-lg mb-4">WebDAV 同步</h3>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">服务器地址</label>
                                    <input type="text" value={config.url} onChange={e => handleSaveConfig('url', e.target.value)} placeholder="https://dav.example.com/" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">用户名</label>
                                    <input type="text" value={config.user} onChange={e => handleSaveConfig('user', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">密码 (应用密码)</label>
                                    <div className="relative">
                                        <input type={showPass ? "text" : "password"} value={config.pass} onChange={e => handleSaveConfig('pass', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black pr-8 transition-colors"/>
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="checkbox" checked={config.autoSync || false} onChange={e => {
                                            const isAuto = e.target.checked;
                                            if (isAuto) setConfig({ ...config, autoSync: true, remember: true });
                                            else handleSaveConfig('autoSync', false);
                                        }} className="accent-black"/>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">自动同步</div>
                                            <div className="text-xs text-gray-400">变动后自动推送，启动时自动拉取</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input type="checkbox" checked={config.remember} disabled={config.autoSync} onChange={e => handleSaveConfig('remember', e.target.checked)} className="accent-black"/>
                                        <div className="text-sm font-medium text-gray-700">记住密码</div>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-4">
                                    <button onClick={() => onSync('pull')} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors text-blue-600">
                                        <CloudDownload size={16}/> 立即拉取
                                    </button>
                                    <button onClick={() => onSync('push')} className="flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">
                                        <CloudUpload size={16}/> 立即推送
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'admin' && (
                            <div className="max-w-sm">
                                <h3 className="font-bold text-lg mb-2">仓库管理</h3>
                                <p className="text-sm text-gray-500 mb-6">作为站长，你可以将当前网页上的最新数据（initialData.json）回写到 GitHub 仓库，从而更新新用户的默认列表。</p>
                                
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                                    <h4 className="text-xs font-bold text-amber-800 mb-1 uppercase tracking-wider">要求</h4>
                                    <p className="text-xs text-amber-700 leading-relaxed">服务端需配置 <code className="bg-white px-1 rounded">GITHUB_TOKEN</code>, <code className="bg-white px-1 rounded">GITHUB_REPO</code> 和 <code className="bg-white px-1 rounded">ADMIN_PASSWORD</code>。</p>
                                </div>

                                <button onClick={onUpdateRepo} className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm rounded-lg text-sm font-medium transition-all">
                                    <GitBranch size={16} /> 更新仓库初始数据
                                </button>
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className="max-w-sm">
                                <h3 className="font-bold text-lg mb-4">关于 Boxy</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">Boxy 是一个开源的、注重隐私的个人软件导航页。你的数据完全掌握在自己手中。</p>
                                
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <svg height="24" width="24" viewBox="0 0 16 16" className="fill-black shrink-0"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
                                    <div className="overflow-hidden">
                                        <div className="text-xs text-gray-500 font-medium">开源仓库</div>
                                        <a href="https://github.com/Airlur/boxy" target="_blank" rel="noreferrer" className="text-sm font-bold hover:underline truncate block">https://github.com/Airlur/boxy</a>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-100 text-xs text-gray-400">
                                    Version 1.0.0
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
