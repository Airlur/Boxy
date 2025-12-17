import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, Layers, Folder, Plus, Search, X, Edit3, Trash2, 
  PlusSquare, Upload, Download, Cloud, ExternalLink, Ghost, 
  AlertCircle, CheckCircle, RotateCw
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';

import { initialData } from './data/initialData';
import { SortableItem } from './components/SortableItem';
import { WebDavModal } from './components/modals/WebDavModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { SoftwareModal } from './components/modals/SoftwareModal';

export default function App() {
  // --- State ---
  const [data, setData] = useState(initialData);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals
  const [modals, setModals] = useState({ software: false, category: false, webdav: false });
  const [editingSoft, setEditingSoft] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  
  // WebDAV Config
  const [wdConfig, setWdConfig] = useState({ url: '', user: '', pass: '', remember: false, autoSync: false });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Toast
  const [toast, setToast] = useState(null);

  // Debounce Timer Ref for Auto-Sync
  const autoSyncTimer = useRef(null);

  // --- Helpers ---
  const showToast = (msg, type = 'success', duration = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  };

  const getDomain = (soft) => {
    let domain = '';
    try { if (soft.website) domain = new URL(soft.website).hostname; } catch(e){}
    if (!domain && soft.downloadUrls?.[0]) try { domain = new URL(soft.downloadUrls[0]).hostname; } catch(e){}
    return domain;
  };

  // --- Core Data Logic ---
  
  // 统一保存入口：更新 State -> 更新 LocalStorage -> (可选) 触发自动同步
  const saveData = (newData, skipAutoSync = false) => {
    // 更新时间戳
    const dataWithTs = { ...newData, updatedAt: Date.now() };
    
    setData(dataWithTs);
    localStorage.setItem('boxy_data', JSON.stringify(dataWithTs));

    // Auto-Sync Logic
    if (!skipAutoSync && wdConfig.autoSync && wdConfig.url) {
        if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        
        // 防抖 2秒：用户停止操作2秒后，自动推送
        autoSyncTimer.current = setTimeout(() => {
            console.log('Triggering Auto-Sync Push...');
            handleWebDav('push', dataWithTs, true); 
        }, 2000);
    }
  };

  // --- Initialization ---
  useEffect(() => {
    // 1. Load Local Data
    const local = localStorage.getItem('boxy_data');
    let currentLocalData = initialData;
    if (local) {
      try { 
          currentLocalData = JSON.parse(local);
          setData(currentLocalData); 
      } catch (e) { showToast('本地数据损坏', 'error'); }
    }

    // 2. Load WebDAV Config & Auto Pull
    const savedWd = localStorage.getItem('boxy_webdav_config');
    if (savedWd) {
        const config = JSON.parse(savedWd);
        setWdConfig(config);

        // 如果开启了自动同步，启动时尝试拉取
        if (config.autoSync && config.url && config.user && config.pass) {
            handleWebDav('pull', currentLocalData, true, config);
        }
    }

    // Keyboard Shortcuts
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyE')) {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save WebDAV Config when changed
  useEffect(() => {
    if (wdConfig.remember) {
        localStorage.setItem('boxy_webdav_config', JSON.stringify(wdConfig));
    } else {
        localStorage.removeItem('boxy_webdav_config');
    }
  }, [wdConfig]);


  // --- WebDAV Operations ---
  
  /**
   * @param {'push'|'pull'} type 
   * @param {Object} currentData - 当前数据，用于对比
   * @param {boolean} silent - 是否静默模式（不弹 Toast，除非出错）
   * @param {Object} overrideConfig - 可选，用于在 State 更新前使用的配置
   */
  const handleWebDav = async (type, currentData = data, silent = false, overrideConfig = wdConfig) => {
    const config = overrideConfig;

    if (!config.url) {
        if(!silent) showToast('请输入服务器地址', 'error');
        return;
    }

    let url = config.url.replace(/\/+$/, '');
    if (!url.endsWith('/Boxy')) url += '/Boxy';
    const targetEndpoint = url + '/boxy_data.json';

    if (!silent) showToast(type === 'push' ? '正在上传...' : '正在下载...', 'info');
    setIsSyncing(true);

    try {
      const res = await fetch('/api/webdav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: targetEndpoint,
          username: config.user,
          password: config.pass,
          method: type === 'push' ? 'PUT' : 'GET',
          data: type === 'push' ? currentData : undefined
        })
      });

      const result = await res.json();
      
      // Handle 404 on Pull (First time user)
      if (type === 'pull' && res.status === 404) {
         if(!silent) showToast('云端暂无数据，请先推送', 'info');
         setIsSyncing(false);
         return;
      }

      if (!res.ok) throw new Error(result.error || res.statusText);

      if (type === 'pull') {
        const cloudData = result;
        const localTs = currentData.updatedAt || 0;
        const cloudTs = cloudData.updatedAt || 0;

        // 智能合并策略：如果云端数据更新，才覆盖
        if (cloudTs > localTs) {
            saveData(cloudData, true); // skip auto-sync to avoid loop
            if (!silent) showToast('已同步云端最新数据');
            else console.log('Auto-Pull: Local data updated from cloud.');
        } else {
            if (!silent) showToast('本地数据已是最新');
            else console.log('Auto-Pull: Local data is up to date.');
        }
      } else {
        // Push Success
        if (!silent) showToast('✅ 推送成功');
        else console.log('Auto-Push: Success.');
      }
      
      if (!silent) setModals(prev => ({ ...prev, webdav: false }));

    } catch (e) {
      console.error(e);
      if (!silent || e.message !== 'Failed to fetch') showToast(`同步失败: ${e.message}`, 'error');
    } finally {
        setIsSyncing(false);
    }
  };


  // --- Drag & Drop ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 1. Categories
    const isCategoryDrag = data.categories.some(c => c.id === active.id);
    if (isCategoryDrag) {
        const oldIndex = data.categories.findIndex(c => c.id === active.id);
        const newIndex = data.categories.findIndex(c => c.id === over.id);
        const newCats = arrayMove(data.categories, oldIndex, newIndex).map((c, i) => ({ ...c, sort: i + 1 }));
        saveData({ ...data, categories: newCats });
        return;
    } 
    
    // 2. Software
    if (currentCategory === 'all' || searchQuery) return;
    
    const catIndex = data.categories.findIndex(c => c.id === currentCategory);
    if (catIndex === -1) return;
    
    const cat = data.categories[catIndex];
    const oldIndex = cat.software.findIndex(s => s.id === active.id);
    const newIndex = cat.software.findIndex(s => s.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
        const newSoftware = arrayMove(cat.software, oldIndex, newIndex).map((s, i) => ({ ...s, sort: i + 1 }));
        const newCats = [...data.categories];
        newCats[catIndex] = { ...cat, software: newSoftware };
        saveData({ ...data, categories: newCats });
    }
  };

  // --- Event Handlers ---
  
  // Save Software (Add/Edit)
  const handleSaveSoftware = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    const newSoft = {
      id: fd.get('id') || 's_' + Date.now(),
      name: fd.get('name'),
      website: fd.get('website'),
      description: fd.get('description'),
      downloadUrls: fd.getAll('dl-inputs[]').map(v => v.trim()).filter(Boolean),
      blogUrls: fd.getAll('blog-inputs[]').map(v => v.trim()).filter(Boolean),
      sort: 999
    };

    if(!newSoft.name) return showToast('请输入名称', 'error');

    let newCats = [...data.categories];
    // Remove old if editing
    if (fd.get('id')) {
        newCats.forEach(c => {
            const idx = c.software.findIndex(s => s.id === newSoft.id);
            if(idx > -1) { 
                newSoft.sort = c.software[idx].sort;
                c.software.splice(idx, 1); 
            }
        });
    }
    
    // Add to new category
    const targetCat = newCats.find(c => c.id === fd.get('categoryId'));
    if(targetCat) {
        targetCat.software.push(newSoft);
    } else {
        return showToast('分类无效', 'error');
    }
    
    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('保存成功');
  };

  // Delete Software
  const handleDeleteSoftware = () => {
    if(!confirm('确认删除？') || !editingSoft) return;
    let newCats = [...data.categories];
    newCats.forEach(c => {
        c.software = c.software.filter(s => s.id !== editingSoft.id);
    });
    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('已删除');
  };

  // Save Category
  const handleSaveCategory = (name) => {
      if(editingCat) { 
          saveData({...data, categories: data.categories.map(c => c.id === editingCat.id ? {...c, name} : c)}); 
      } else { 
          saveData({...data, categories: [...data.categories, {id: 'c_'+Date.now(), name, sort: 99, software: []}]}); 
      }
      setModals({...modals, category: false});
  };


  // --- Data Calculations ---
  const countTotal = () => data.categories.reduce((acc, c) => acc + c.software.length, 0);

  const displayedItems = useMemo(() => {
    let items = [];
    const sortedCats = [...data.categories].sort((a, b) => a.sort - b.sort);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sortedCats.forEach(cat => {
        cat.software.forEach(soft => {
          if (soft.name.toLowerCase().includes(q) || soft.description.toLowerCase().includes(q) || (soft.website||'').includes(q)) {
            items.push({ ...soft, _catName: cat.name, _catId: cat.id });
          }
        });
      });
    } else if (currentCategory === 'all') {
      sortedCats.forEach(cat => {
        const sortedSoft = [...cat.software].sort((a, b) => a.sort - b.sort);
        sortedSoft.forEach(soft => items.push({ ...soft, _catName: cat.name, _catId: cat.id }));
      });
    } else {
      const cat = data.categories.find(c => c.id === currentCategory);
      if (cat) {
        items = [...cat.software].sort((a, b) => a.sort - b.sort).map(s => ({ ...s, _catName: cat.name, _catId: cat.id }));
      }
    }
    return items;
  }, [data, currentCategory, searchQuery]);


  // --- Render ---
  return (
    <div className="flex h-screen overflow-hidden text-sm bg-[#f5f5f5] text-[#171717] font-sans">
      
      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col z-20 transition-transform duration-300 fixed md:relative h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-14 flex items-center px-5 border-b border-gray-100 shrink-0 gap-3">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white shadow-md"><Box size={14} /></div>
          <h1 className="font-bold text-lg tracking-tight">Boxy</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <div className="mb-1">
            <div 
              onClick={() => { setCurrentCategory('all'); setSearchQuery(''); setIsSidebarOpen(false); }}
              className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${currentCategory === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center"><Layers size={16} className="mr-3"/><span>全部软件</span></div>
              <span className={`text-[10px] rounded-full ${currentCategory === 'all' ? 'bg-white/20 text-white w-5 h-5 flex items-center justify-center' : 'w-5 h-5 flex items-center justify-center text-gray-400'}`}>{countTotal()}</span>
            </div>
          </div>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={data.categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {[...data.categories].sort((a,b)=>a.sort-b.sort).map(cat => (
                <SortableItem key={cat.id} id={cat.id} className="group mb-1">
                  <div 
                    onClick={() => { setCurrentCategory(cat.id); setSearchQuery(''); setIsSidebarOpen(false); }}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${currentCategory === cat.id ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
                  >
                    <div className="flex items-center truncate">
                      <Folder size={16} className={`mr-3 ${currentCategory === cat.id ? 'text-gray-300' : 'text-gray-400'}`} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={`text-[10px] opacity-60 ml-2 rounded-full w-5 h-5 flex items-center justify-center ${currentCategory === cat.id ? 'bg-white/20' : ''}`}>{cat.software.length}</span>
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="p-3 border-t border-gray-100">
          <button onClick={() => { setEditingCat(null); setModals({...modals, category: true}); }} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-gray-500 hover:text-black hover:bg-gray-50 rounded-md transition-colors border border-dashed border-gray-300 hover:border-gray-400">
            <Plus size={14} /><span>新增分类</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 z-10 gap-4">
          <button className="md:hidden p-1.5 hover:bg-gray-100 rounded-md" onClick={() => setIsSidebarOpen(true)}><Search size={20} className="text-gray-600" /></button>
          
          <div className="flex-1 max-w-lg relative group">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              id="search-input"
              type="text" 
              placeholder="搜索软件 (Ctrl + E)" 
              className="w-full h-9 pl-9 pr-9 bg-gray-100 border-transparent focus:bg-white focus:border-gray-300 focus:ring-4 focus:ring-gray-50 rounded-md text-sm transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>}
          </div>

          {/* Sync Status Indicator */}
          {wdConfig.autoSync && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
                  {isSyncing ? <RotateCw size={12} className="animate-spin text-blue-500"/> : <Cloud size={12} />}
                  <span>{isSyncing ? '同步中...' : '已开启同步'}</span>
              </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 relative">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {searchQuery ? `搜索: "${searchQuery}"` : (currentCategory === 'all' ? '全部软件' : data.categories.find(c => c.id === currentCategory)?.name)}
              </h2>
              <p className="text-gray-500 mt-1 text-xs">
                {searchQuery ? '跨分类结果' : (currentCategory === 'all' ? `共收录 ${countTotal()} 个应用` : `${data.categories.find(c => c.id === currentCategory)?.software.length} 个应用`)}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                {currentCategory !== 'all' && !searchQuery && (
                    <div className="flex gap-1 border-r border-gray-100 pr-2 mr-2">
                        <button onClick={() => { setEditingCat(data.categories.find(c => c.id === currentCategory)); setModals({...modals, category: true}); }} className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 transition-colors" data-tip="编辑分类"><Edit3 size={16} /></button>
                        <button onClick={() => { if(confirm('确认删除？')) { saveData({...data, categories: data.categories.filter(c => c.id !== currentCategory)}); setCurrentCategory('all'); }}} className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-red-500 hover:text-red-600 transition-colors" data-tip="删除分类"><Trash2 size={16} /></button>
                    </div>
                )}
                <button onClick={() => { setEditingSoft(null); setModals({...modals, software: true}); }} className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors" data-tip="新增软件"><PlusSquare size={18} /></button>
                <button onClick={() => document.getElementById('json-import').click()} className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors" data-tip="导入数据"><Upload size={18} /></button>
                <button onClick={() => { 
                    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `boxy_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
                }} className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors" data-tip="导出备份"><Download size={18} /></button>
                <button onClick={() => setModals({...modals, webdav: true})} className={`tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${wdConfig.autoSync ? 'text-blue-600' : 'text-gray-700 hover:text-black'}`} data-tip="WebDAV 同步"><Cloud size={18} /></button>
                <input type="file" id="json-import" className="hidden" accept=".json" onChange={(e) => {
                    const reader = new FileReader(); reader.onload = (ev) => { try { saveData(JSON.parse(ev.target.result)); showToast('导入成功'); } catch(err) { showToast('格式错误', 'error'); } };
                    if(e.target.files[0]) reader.readAsText(e.target.files[0]); e.target.value = '';
                }}/>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayedItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {displayedItems.map(soft => {
                    const domain = getDomain(soft);
                    const proxyUrl = domain ? `/api/favicon?domain=${domain}` : null;
                    const googleUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
                    const firstChar = soft.name.charAt(0).toUpperCase();
                    const isDragDisabled = currentCategory === 'all' || !!searchQuery;
                    
                    return (
                        <SortableItem key={soft.id} id={soft.id} className="h-full" disabled={isDragDisabled}>
                            <div className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all duration-200 relative flex flex-col h-full select-none">
                                <div className="flex justify-between items-start mb-3" onClick={() => { setEditingSoft(soft); setModals({...modals, software: true}); }}>
                                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-800 font-bold text-lg overflow-hidden group-hover:scale-110 transition-transform duration-300">
                                        {domain ? (
                                            <img 
                                                src={proxyUrl} 
                                                loading="lazy" 
                                                alt={soft.name} 
                                                className="w-full h-full object-contain p-1" 
                                                onError={(e) => {
                                                    if (e.target.src.includes('/api/favicon')) {
                                                        e.target.src = googleUrl;
                                                    } else {
                                                        e.target.onerror = null; 
                                                        e.target.style.display = 'none'; 
                                                        e.target.parentElement.innerText = firstChar;
                                                    }
                                                }} 
                                            />
                                        ) : firstChar}
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full font-medium tracking-wide group-hover:bg-gray-100 transition-colors">{soft._catName}</span>
                                </div>
                                <div className="flex-grow cursor-pointer" onClick={() => { setEditingSoft(soft); setModals({...modals, software: true}); }}>
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">{soft.name}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{soft.description}</p>
                                </div>
                                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 group-hover:border-gray-100 transition-colors">
                                    <button disabled={!soft.downloadUrls?.[0]} onClick={(e) => { e.stopPropagation(); window.open(soft.downloadUrls[0], '_blank', 'noopener,noreferrer'); }} className="tooltip-wrap flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-default" data-tip={soft.downloadUrls?.[0] ? '快速下载' : '无链接'}>
                                        <Download size={14} /> <span className="font-medium">{soft.downloadUrls?.length || 0}</span>
                                    </button>
                                    <button disabled={!soft.blogUrls?.[0]} onClick={(e) => { e.stopPropagation(); window.open(soft.blogUrls[0], '_blank', 'noopener,noreferrer'); }} className="tooltip-wrap flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 px-2 py-1 rounded hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-default" data-tip={soft.blogUrls?.[0] ? '查看教程' : '无链接'}>
                                        <ExternalLink size={14} /> <span className="font-medium">{soft.blogUrls?.length || 0}</span>
                                    </button>
                                </div>
                            </div>
                        </SortableItem>
                    );
                })}
              </div>
            </SortableContext>
          </DndContext>
          {displayedItems.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Ghost size={32} className="text-gray-400" /></div><h3 className="text-gray-900 font-medium mb-1">空空如也</h3></div>}
        </main>
      </div>

      {/* Toast */}
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none animate-modal-in"><div className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium text-white flex items-center gap-2 ${toast.type==='error'?'bg-red-500':'bg-black'}`}>{toast.type==='error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />} {toast.msg}</div></div>}

      {/* Modals */}
      {modals.webdav && (
        <WebDavModal 
            config={wdConfig} 
            setConfig={setWdConfig} 
            onSync={(type) => handleWebDav(type)} 
            onClose={() => setModals({...modals, webdav: false})} 
        />
      )}
      
      {modals.category && (
        <CategoryModal 
            editingCat={editingCat} 
            onSave={handleSaveCategory} 
            onClose={() => setModals({...modals, category: false})} 
        />
      )}
      
      {modals.software && (
        <SoftwareModal 
            editingSoft={editingSoft} 
            categories={data.categories} 
            currentCategory={currentCategory}
            onSave={handleSaveSoftware}
            onDelete={handleDeleteSoftware}
            onClose={() => setModals({...modals, software: false})} 
        />
      )}
    </div>
  );
}
