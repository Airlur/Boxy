import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Layers, Folder, Plus, Search, X, Edit3, Trash2, 
  PlusSquare, Upload, Download, Cloud, ExternalLink, Trash,
  Ghost, AlertCircle, CheckCircle, CloudDownload, CloudUpload, Eye, EyeOff
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { initialData } from './data/initialData';

// --- 组件：SortableItem ---
function SortableItem({ id, children, className, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id,
    disabled // 禁用选中 全部软件 时的拖拽功能
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
    touchAction: 'none'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
      {children}
    </div>
  );
}

// --- 辅助组件：动态链接输入 ---
function LinksInput({ id, label, initialValues = [] }) {
    const [links, setLinks] = useState(initialValues.length ? initialValues : ['']);
    
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500">{label}</label>
                <button type="button" onClick={() => setLinks([...links, ''])} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={12} /> 添加</button>
            </div>
            <div id={id} className="space-y-2">
                {links.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input name={`${id}[]`} defaultValue={link} placeholder="https://" className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:border-black outline-none" />
                        <button type="button" onClick={(e) => e.target.closest('div').remove()} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function App() {
  const [data, setData] = useState(initialData);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // 模态框
  const [modals, setModals] = useState({ software: false, category: false, webdav: false });
  const [editingSoft, setEditingSoft] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  
  // WebDAV
  const [wdConfig, setWdConfig] = useState({ url: '', user: '', pass: '', remember: false });
  const [showPass, setShowPass] = useState(false);
  
  // Toast
  const [toast, setToast] = useState(null);

  // 初始化
  useEffect(() => {
    const local = localStorage.getItem('boxy_data');
    if (local) {
      try { setData(JSON.parse(local)); } catch (e) { showToast('本地数据损坏', 'error'); }
    }
    const savedWd = localStorage.getItem('boxy_webdav_config');
    if (savedWd) setWdConfig(JSON.parse(savedWd));

    // 快捷键 Ctrl + E
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyE')) {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveData = (newData) => {
    setData(newData);
    localStorage.setItem('boxy_data', JSON.stringify(newData));
  };

  const countTotal = () => data.categories.reduce((acc, c) => acc + c.software.length, 0);

  // --- 拖拽逻辑 ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 1. 侧边栏拖拽
    const isCategoryDrag = data.categories.some(c => c.id === active.id);
    if (isCategoryDrag) {
        const oldIndex = data.categories.findIndex(c => c.id === active.id);
        const newIndex = data.categories.findIndex(c => c.id === over.id);
        const newCats = arrayMove(data.categories, oldIndex, newIndex).map((c, i) => ({ ...c, sort: i + 1 }));
        saveData({ ...data, categories: newCats });
        return;
    } 
    
    // 2. 软件拖拽 (如果在"全部"或"搜索"模式下，SortableItem 已禁用，理论上不会触发这里，但做个双重保险)
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

  // --- WebDAV 逻辑 ---
  const handleWebDav = async (type) => {
    if (!wdConfig.url) return showToast('请输入服务器地址', 'error');
    if (!wdConfig.url.startsWith('http')) return showToast('地址需以 http 开头', 'error');

    if (wdConfig.remember) localStorage.setItem('boxy_webdav_config', JSON.stringify(wdConfig));
    else localStorage.removeItem('boxy_webdav_config');

    let url = wdConfig.url.replace(/\/+$/, '');
    if (!url.endsWith('/Boxy')) url += '/Boxy';
    const targetEndpoint = url + '/boxy_data.json';

    showToast(type === 'push' ? '正在上传...' : '正在下载...', 'info');

    try {
      const res = await fetch('/api/webdav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: targetEndpoint,
          username: wdConfig.user,
          password: wdConfig.pass,
          method: type === 'push' ? 'PUT' : 'GET',
          data: type === 'push' ? data : undefined
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || res.statusText);

      if (type === 'pull') {
        saveData(result);
        showToast('✅ 同步成功：数据已更新');
      } else {
        showToast('✅ 推送成功：云端已更新');
      }
      setModals({ ...modals, webdav: false });
    } catch (e) {
      console.error(e);
      showToast(`❌ 失败: ${e.message}`, 'error');
    }
  };

  // --- CRUD 操作 (补全遗漏的逻辑) ---
  const handleSaveSoftware = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    const newSoft = {
      id: fd.get('id') || 's_' + Date.now(),
      name: fd.get('name'),
      website: fd.get('website'),
      description: fd.get('description'),
      // 使用 FormData.getAll 获取数组数据，移除 DOM 操作
      downloadUrls: fd.getAll('dl-inputs[]').map(v => v.trim()).filter(Boolean),
      blogUrls: fd.getAll('blog-inputs[]').map(v => v.trim()).filter(Boolean),
      sort: 999
    };

    if(!newSoft.name) return showToast('请输入名称', 'error');

    let newCats = [...data.categories];
    // 移除旧数据 (如果是编辑)
    if (fd.get('id')) {
        newCats.forEach(c => {
            const idx = c.software.findIndex(s => s.id === newSoft.id);
            if(idx > -1) { 
                newSoft.sort = c.software[idx].sort; // 保持原排序
                c.software.splice(idx, 1); 
            }
        });
    }
    
    // 添加到新分类
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

  const deleteSoftware = () => {
    if(!confirm('确认删除？') || !editingSoft) return;
    let newCats = [...data.categories];
    newCats.forEach(c => {
        c.software = c.software.filter(s => s.id !== editingSoft.id);
    });
    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('已删除');
  };

  const showToast = (msg, type = 'success', duration = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  };

  // --- 数据展示计算 ---
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

  const getFavicon = (soft) => {
    let domain = '';
    try { if (soft.website) domain = new URL(soft.website).hostname; } catch(e){}
    if (!domain && soft.downloadUrls?.[0]) try { domain = new URL(soft.downloadUrls[0]).hostname; } catch(e){}
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
  };

  return (
    <div className="flex h-screen overflow-hidden text-sm bg-[#f5f5f5] text-[#171717] font-sans">
      
      {/* 侧边栏 */}
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
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e)}>
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

      {/* 遮罩 */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* 主内容 */}
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
                <button onClick={() => setModals({...modals, webdav: true})} className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-blue-600 hover:text-blue-700 transition-colors" data-tip="WebDAV 同步"><Cloud size={18} /></button>
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
                    const iconUrl = getFavicon(soft);
                    const firstChar = soft.name.charAt(0).toUpperCase();
                    // 修复：如果当前是"全部软件"或"搜索结果"，禁用拖拽属性 (disabled={true})
                    const isDragDisabled = currentCategory === 'all' || !!searchQuery;
                    
                    return (
                        <SortableItem key={soft.id} id={soft.id} className="h-full" disabled={isDragDisabled}>
                            <div className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all duration-200 relative flex flex-col h-full select-none">
                                <div className="flex justify-between items-start mb-3" onClick={() => { setEditingSoft(soft); setModals({...modals, software: true}); }}>
                                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-800 font-bold text-lg overflow-hidden group-hover:scale-110 transition-transform duration-300">
                                        {iconUrl ? <img src={iconUrl} loading="lazy" alt={soft.name} className="w-full h-full object-contain p-1" onError={(e)=>{e.target.onerror=null; e.target.src=''; e.target.parentElement.innerText=firstChar}} /> : firstChar}
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

      {/* WebDAV Modal */}
      {modals.webdav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={() => setModals({...modals, webdav: false})}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-100 relative z-10 animate-modal-in">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-lg">WebDAV 同步</h3><button onClick={() => setModals({...modals, webdav: false})}><X size={16} className="text-gray-400 hover:text-black"/></button></div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label><input type="text" value={wdConfig.url} onChange={e=>setWdConfig({...wdConfig, url: e.target.value})} placeholder="https://dav.example.com/" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black"/></div>
                    <div><label className="block text-xs font-medium text-gray-500 mb-1">用户名</label><input type="text" value={wdConfig.user} onChange={e=>setWdConfig({...wdConfig, user: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black"/></div>
                    {/* 修复：使用 relative 容器包裹 input 和 eye button */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">密码 (应用密码)</label>
                        <div className="relative">
                            <input type={showPass ? "text" : "password"} value={wdConfig.pass} onChange={e=>setWdConfig({...wdConfig, pass: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-black pr-8"/>
                            <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="wd-remember" checked={wdConfig.remember} onChange={e=>setWdConfig({...wdConfig, remember: e.target.checked})} /><label htmlFor="wd-remember" className="text-xs text-gray-500 select-none cursor-pointer">记住密码 (保存在本地)</label></div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button onClick={() => handleWebDav('pull')} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"><CloudDownload size={16} className="text-blue-600"/> 拉取</button>
                        <button onClick={() => handleWebDav('push')} className="flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"><CloudUpload size={16}/> 推送</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Category Modal */}
      {modals.category && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={() => setModals({...modals, category: false})}></div>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 relative z-10 animate-modal-in">
                <h3 className="font-bold text-lg mb-4">{editingCat ? '编辑分类' : '新增分类'}</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const name = e.target.catName.value; if(!name) return;
                    if(editingCat) { saveData({...data, categories: data.categories.map(c => c.id === editingCat.id ? {...c, name} : c)}); } 
                    else { saveData({...data, categories: [...data.categories, {id: 'c_'+Date.now(), name, sort: 99, software: []}]}); }
                    setModals({...modals, category: false});
                }}>
                    <div className="mb-5"><label className="block text-xs font-medium text-gray-500 mb-1.5">分类名称</label><input name="catName" defaultValue={editingCat?.name} autoFocus className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-black outline-none" /></div>
                    <div className="flex justify-end gap-3"><button type="button" onClick={() => setModals({...modals, category: false})} className="px-4 py-2 text-sm font-medium text-gray-600">取消</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800">保存</button></div>
                </form>
            </div>
        </div>
      )}

      {/* Software Modal */}
      {modals.software && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={() => setModals({...modals, software: false})}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-100 relative z-10 animate-modal-in max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100"><h3 className="font-bold text-lg">{editingSoft ? '编辑软件' : '添加软件'}</h3><button onClick={() => setModals({...modals, software: false})}><X size={20} className="text-gray-400 hover:text-black"/></button></div>
                <form id="softForm" onSubmit={handleSaveSoftware} className="p-6 overflow-y-auto">
                    <input type="hidden" name="id" defaultValue={editingSoft?.id} />
                    <div className="grid gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">名称</label><input name="name" required defaultValue={editingSoft?.name} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" /></div>
                            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">官网</label><input name="website" defaultValue={editingSoft?.website} placeholder="https://" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">分类</label><select name="categoryId" defaultValue={editingSoft ? editingSoft._catId : (currentCategory!=='all'?currentCategory:data.categories[0]?.id)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black">{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">描述</label><input name="description" defaultValue={editingSoft?.description} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-black" /></div>
                        </div>
                        <LinksInput id="dl-inputs" label="下载链接" initialValues={editingSoft?.downloadUrls} />
                        <LinksInput id="blog-inputs" label="博客/教程链接" initialValues={editingSoft?.blogUrls} />
                    </div>
                </form>
                <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-xl">
                    {editingSoft ? <button type="button" onClick={deleteSoftware} className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"><Trash size={14} /> 删除</button> : <div></div>}
                    <div className="flex gap-3"><button type="button" onClick={() => setModals({...modals, software: false})} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black">取消</button><button type="submit" form="softForm" className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md shadow-sm">保存</button></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}