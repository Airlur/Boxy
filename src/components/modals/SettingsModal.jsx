import React, { useState, useEffect } from 'react';
import { 
  Cloud, GitBranch, Info, X, Eye, EyeOff, 
  CloudDownload, CloudUpload, History, RotateCcw, Trash2, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';

export function SettingsModal({ 
  config, setConfig, onSync, onClose, onUpdateRepo, onTestConnection,
  backups = [], onFetchBackups, onRestore, onDeleteBackup, syncStatus 
}) {
  const [activeTab, setActiveTab] = useState('webdav');
  const [webDavSubTab, setWebDavSubTab] = useState('config'); // 'config' | 'history'
  const [showPass, setShowPass] = useState(false);

  // 切换到 History 标签页时自动刷新列表
  useEffect(() => {
    if (activeTab === 'webdav' && webDavSubTab === 'history' && onFetchBackups) {
      onFetchBackups();
    }
  }, [activeTab, webDavSubTab, onFetchBackups]);

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
          
          <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
            {activeTab === 'webdav' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">WebDAV 同步</h3>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setWebDavSubTab('config')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${webDavSubTab === 'config' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}>配置</button>
                    <button onClick={() => setWebDavSubTab('history')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${webDavSubTab === 'history' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}>历史版本</button>
                  </div>
                </div>

                {webDavSubTab === 'config' && (
                  <div className="space-y-5 animate-fade-in pb-4">
                    
                    {/* 服务器配置卡片 */}
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">服务器配置</span>
                        <button 
                          onClick={onTestConnection}
                          disabled={syncStatus === 'syncing'}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all border ${
                            syncStatus === 'success' ? 'bg-green-50 border-green-200 text-green-600' :
                            syncStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600' :
                            'bg-white border-gray-200 text-gray-600 hover:border-gray-400 active:scale-95'
                          }`}
                        >
                          {syncStatus === 'syncing' ? <Loader2 size={10} className="animate-spin"/> : 
                           syncStatus === 'success' ? <CheckCircle2 size={10}/> : 
                           syncStatus === 'error' ? <AlertCircle size={10}/> : null}
                          {syncStatus === 'syncing' ? '正在连接...' : 
                           syncStatus === 'success' ? '连接成功' : 
                           syncStatus === 'error' ? '连接失败' : '测试连接'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">服务器地址</label>
                          <input type="text" value={config.url} onChange={e => handleSaveConfig('url', e.target.value)} placeholder="https://dav.example.com/" className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">用户名</label>
                            <input type="text" value={config.user} onChange={e => handleSaveConfig('user', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-black transition-colors"/>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">应用密码</label>
                            <div className="relative">
                              <input type={showPass ? "text" : "password"} value={config.pass} onChange={e => handleSaveConfig('pass', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-black pr-8 transition-colors"/>
                              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPass ? <EyeOff size={12}/> : <Eye size={12}/>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 同步策略卡片 */}
                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">同步策略</span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={config.autoSync || false} onChange={e => {
                            const isAuto = e.target.checked;
                            if (isAuto) setConfig({ ...config, autoSync: true, remember: true });
                            else handleSaveConfig('autoSync', false);
                          }} className="accent-black w-4 h-4 rounded"/>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 group-hover:text-black">自动同步</div>
                            <div className="text-[10px] text-gray-400">操作后延迟触发同步</div>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={config.remember} disabled={config.autoSync} onChange={e => handleSaveConfig('remember', e.target.checked)} className="accent-black w-4 h-4 rounded"/>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700 group-hover:text-black">记住密码</div>
                            <div className="text-[10px] text-gray-400">保存在浏览器本地</div>
                          </div>
                        </label>
                      </div>

                      {config.autoSync && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 animate-fade-in">
                          <div className="flex items-center gap-2">
                             <div className="text-sm font-medium text-gray-700">同步延迟</div>
                             <div className="tooltip-wrap" data-tip="停止操作后多少秒开始同步">
                               <Info size={14} className="text-gray-400 cursor-help"/>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-gray-200">
                            <input 
                               type="number" min="1" max="3600" 
                               value={config.syncDelay || 2} 
                               onChange={(e) => {
                                 let val = parseInt(e.target.value);
                                 if (isNaN(val)) return;
                                 if (val < 1) val = 1;
                                 if (val > 3600) val = 3600;
                                 handleSaveConfig('syncDelay', val);
                               }}
                               className="w-10 text-center text-sm font-bold bg-transparent outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-gray-400 font-medium">秒</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => onSync('pull')} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors text-blue-600">
                        <CloudDownload size={16}/> 立即拉取
                      </button>
                      <button onClick={() => onSync('push')} className="flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-all shadow-lg shadow-black/5">
                        <CloudUpload size={16}/> 立即推送
                      </button>
                    </div>
                  </div>
                )}

                {/* 子标签：历史版本 */}
                {webDavSubTab === 'history' && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* 备份设置 */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                       <div className="text-xs text-gray-500">
                         <span className="font-bold text-gray-700 block mb-0.5">自动备份数量限制</span>
                         <span>每次推送时生成新备份，超出限制自动清理旧文件。</span>
                         <span className="block text-gray-400 mt-0.5">(最少 5 个，最多 50 个)</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <input 
                           type="number" 
                           min="5" 
                           max="50" 
                           value={config.backupLimit || 10} 
                           onChange={(e) => {
                             let val = parseInt(e.target.value);
                             if (isNaN(val)) return;
                             if (val < 5) val = 5;
                             if (val > 50) val = 50;
                             handleSaveConfig('backupLimit', val);
                           }}
                           className="w-16 px-2 py-1 text-center bg-white border border-gray-200 rounded text-sm outline-none focus:border-black appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                         />
                         <span className="text-xs text-gray-400">个</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <h4 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                        <History size={16} className="text-gray-400"/> 备份列表
                      </h4>
                      <button 
                        onClick={() => onFetchBackups && onFetchBackups(false)} 
                        className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                      >
                        刷新列表
                      </button>
                    </div>
                    
                    {backups.length > 0 ? (
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-gray-100">
                          {backups.map((backup) => (
                            <div key={backup.name} className="flex items-center justify-between p-3 text-sm hover:bg-gray-50 transition-colors group">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-700 tabular-nums">{backup.time}</span>
                                <span className="text-[10px] text-gray-400 font-mono group-hover:text-gray-500">{backup.name}</span>
                              </div>
                              <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => onRestore(backup.name)}
                                  data-tip="从此版本恢复"
                                  className="tooltip-wrap tooltip-left p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <RotateCcw size={14} />
                                </button>
                                <button 
                                  onClick={() => onDeleteBackup(backup.name)}
                                  data-tip="删除此备份"
                                  className="tooltip-wrap tooltip-left p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-lg">
                        <p className="text-xs text-gray-400">暂无历史备份</p>
                        <p className="text-[10px] text-gray-300 mt-1">执行一次推送后将自动生成</p>
                      </div>
                    )}
                  </div>
                )}
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