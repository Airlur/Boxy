import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { AlertCircle, CheckCircle } from 'lucide-react';

import initialData from './data/initialData';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SoftwareGrid } from './components/layout/SoftwareGrid';
import { ModalManager } from './components/modals/ModalManager';

export default function App() {
  // --- State ---
  const [data, setData] = useState(initialData);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals
  const [modals, setModals] = useState({ software: false, category: false, settings: false, share: false, shareAll: false });
  const [editingSoft, setEditingSoft] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [shareSoft, setShareSoft] = useState(null);
  
  // Preview Mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // WebDAV Config
  const [wdConfig, setWdConfig] = useState({ url: '', user: '', pass: '', remember: false, autoSync: false });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Toast
  const [toast, setToast] = useState(null);
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

  // --- Core Logic ---
  const saveData = (newData, skipAutoSync = false) => {
    if (isPreviewMode) {
        showToast('预览模式无法保存修改', 'error');
        return;
    }
    const dataWithTs = { ...newData, updatedAt: Date.now() };
    setData(dataWithTs);
    localStorage.setItem('boxy_data', JSON.stringify(dataWithTs));

    if (!skipAutoSync && wdConfig.autoSync && wdConfig.url) {
        if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        autoSyncTimer.current = setTimeout(() => {
            console.log(`[${new Date().toLocaleString()}] 正在触发自动同步推送...`);
            handleWebDav('push', dataWithTs, true); 
        }, 2000);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    
    if (shareId) {
        setIsPreviewMode(true);
        if (shareId === 'mock-gist-id-12345') {
            showToast('加载测试预览数据...');
            setTimeout(() => {
                setData({
                    categories: [{
                        id: 'mock_cat', name: '测试分类', sort: 1,
                        software: [{
                            id: 'mock_soft', name: '测试软件', website: 'https://example.com', 
                            description: '这是一个测试预览数据', downloadUrls: [], blogUrls: [], sort: 1
                        }]
                    }],
                    updatedAt: Date.now()
                });
                showToast('已加载测试数据');
            }, 500);
            return;
        }
        showToast('正在加载分享内容...', 'info');
        fetch(`https://api.github.com/gists/${shareId}`)
            .then(r => { if(!r.ok) throw new Error('Gist not found'); return r.json(); })
            .then(d => {
                try {
                    const content = JSON.parse(d.files['boxy_data.json'].content);
                    setData(content);
                    showToast('已加载分享预览');
                } catch(e) { throw new Error('Invalid data format'); }
            })
            .catch(e => showToast(`加载失败: ${e.message}`, 'error'));
        return;
    }

    const local = localStorage.getItem('boxy_data');
    let currentLocalData = initialData;
    if (local) {
      try { 
          currentLocalData = JSON.parse(local);
          setData(currentLocalData); 
      } catch (e) { showToast('本地数据损坏', 'error'); }
    }

    const savedWd = localStorage.getItem('boxy_webdav_config');
    if (savedWd) {
        const config = JSON.parse(savedWd);
        setWdConfig(config);
        if (config.autoSync && config.url && config.user && config.pass) {
            handleWebDav('pull', currentLocalData, true, config);
        }
    }

    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyE')) {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (wdConfig.remember) localStorage.setItem('boxy_webdav_config', JSON.stringify(wdConfig));
    else localStorage.removeItem('boxy_webdav_config');
  }, [wdConfig]);

  // --- Handlers ---
  const handleWebDav = async (type, currentData = data, silent = false, overrideConfig = wdConfig) => {
    const config = overrideConfig;
    if (!config.url) { if(!silent) showToast('请输入服务器地址', 'error'); return; }

    let url = config.url.replace(/\/+$/, '');
    if (!url.endsWith('/Boxy')) url += '/Boxy';
    const targetEndpoint = url + '/boxy_data.json';
    const folderEndpoint = url;

    if (!silent) showToast(type === 'push' ? '正在上传...' : '正在下载...', 'info');
    setIsSyncing(true);

    const doRequest = async (method, endpoint, bodyData) => {
        const res = await fetch('/api/webdav', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint, username: config.user, password: config.pass, method, data: bodyData })
        });
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, statusText: res.statusText, json };
    };

    try {
      let res = await doRequest(type === 'push' ? 'PUT' : 'GET', targetEndpoint, type === 'push' ? currentData : undefined);

      if (type === 'push' && (res.status === 403 || res.status === 404 || res.status === 409)) {
          if (!silent) console.log(`上传失败 (${res.status})，尝试创建 Boxy 目录...`);
          const mkcolRes = await doRequest('MKCOL', folderEndpoint);
          if (mkcolRes.ok || mkcolRes.status === 405) {
              res = await doRequest('PUT', targetEndpoint, currentData);
          }
      }

      if (type === 'pull' && res.status === 404) {
         if(!silent) showToast('云端暂无数据，请先推送', 'info');
         setIsSyncing(false); return;
      }

      if (!res.ok) throw new Error(res.json?.error || res.statusText);

      if (type === 'pull') {
        const cloudData = res.json;
        const localTs = currentData.updatedAt || 0;
        const cloudTs = cloudData.updatedAt || 0;
        if (cloudTs > localTs) {
            saveData(cloudData, true);
            if (!silent) showToast('已同步云端最新数据');
        } else {
            if (!silent) showToast('本地数据已是最新');
        }
      } else {
        if (!silent) showToast('推送成功');
      }
      if (!silent) setModals(prev => ({ ...prev, settings: false }));
    } catch (e) {
      console.error(e);
      if (!silent || e.message !== 'Failed to fetch') showToast(`同步失败: ${e.message}`, 'error');
    } finally {
        setIsSyncing(false);
    }
  };

  const handleUpdateRepo = async () => {
      const pwd = prompt('请输入管理员密码 (ADMIN_PASSWORD):');
      if (pwd === null) return;
      const msg = prompt('请输入 Commit 信息:', 'chore: update initial data via admin panel');
      if (msg === null) return;

      showToast('正在更新仓库...', 'info');
      try {
          const res = await fetch('/api/update-repo', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: JSON.stringify(data, null, 2), message: msg, password: pwd })
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          showToast('仓库更新成功！部署即将触发');
      } catch (e) { console.error(e); showToast(`更新失败: ${e.message}`, 'error'); }
  };

  // Import Handlers
  const handleImportMerge = () => {
      const localData = JSON.parse(localStorage.getItem('boxy_data') || JSON.stringify(initialData));
      const merged = { ...localData, updatedAt: Date.now() };
      
      data.categories.forEach(shareCat => {
          const localCat = merged.categories.find(c => c.id === shareCat.id) || merged.categories.find(c => c.name === shareCat.name);
          if (localCat) {
              shareCat.software.forEach(s => {
                  if (!localCat.software.some(ls => ls.id === s.id)) localCat.software.push(s);
              });
          } else {
              merged.categories.push(shareCat);
          }
      });
      
      localStorage.setItem('boxy_data', JSON.stringify(merged));
      window.location.href = window.location.pathname;
  };

  const handleImportSingle = (soft) => {
      const localData = JSON.parse(localStorage.getItem('boxy_data') || JSON.stringify(initialData));
      const merged = { ...localData, updatedAt: Date.now() };
      const targetCat = merged.categories.find(c => c.id === soft._catId) || merged.categories.find(c => c.name === soft._catName);
      
      if(targetCat) {
          if(!targetCat.software.some(s => s.id === soft.id)) targetCat.software.push(soft);
      } else {
          merged.categories.push({ id: soft._catId || 'c_'+Date.now(), name: soft._catName || '导入', sort: 99, software: [soft] });
      }
      localStorage.setItem('boxy_data', JSON.stringify(merged));
      showToast('已保存到本地');
  };

  // CRUD
  const handleSaveSoftware = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newSoft = {
      id: fd.get('id') || 's_' + Date.now(),
      name: fd.get('name'),
      website: fd.get('website'),
      iconUrl: fd.get('iconUrl'),
      description: fd.get('description'),
      downloadUrls: fd.getAll('dl-inputs[]').map(v => v.trim()).filter(Boolean),
      blogUrls: fd.getAll('blog-inputs[]').map(v => v.trim()).filter(Boolean),
      sort: 999
    };
    if(!newSoft.name) return showToast('请输入名称', 'error');

    let newCats = [...data.categories];
    if (fd.get('id')) {
        newCats.forEach(c => {
            const idx = c.software.findIndex(s => s.id === newSoft.id);
            if(idx > -1) { newSoft.sort = c.software[idx].sort; c.software.splice(idx, 1); }
        });
    }
    
    const targetCat = newCats.find(c => c.id === fd.get('categoryId'));
    if(targetCat) targetCat.software.push(newSoft);
    else return showToast('分类无效', 'error');
    
    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('保存成功');
  };

  const handleDeleteSoftware = () => {
    if(!confirm('确认删除？') || !editingSoft) return;
    let newCats = [...data.categories];
    newCats.forEach(c => { c.software = c.software.filter(s => s.id !== editingSoft.id); });
    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('已删除');
  };

  const handleSaveCategory = (name) => {
      if(editingCat) saveData({...data, categories: data.categories.map(c => c.id === editingCat.id ? {...c, name} : c)}); 
      else saveData({...data, categories: [...data.categories, {id: 'c_'+Date.now(), name, sort: 99, software: []}]}); 
      setModals({...modals, category: false});
  };

  // Drag & Drop
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Category Drag
    if (data.categories.some(c => c.id === active.id)) {
        const oldIndex = data.categories.findIndex(c => c.id === active.id);
        const newIndex = data.categories.findIndex(c => c.id === over.id);
        const newCats = arrayMove(data.categories, oldIndex, newIndex).map((c, i) => ({ ...c, sort: i + 1 }));
        saveData({ ...data, categories: newCats });
        return;
    } 
    
    // Software Drag
    if (currentCategory === 'all' || searchQuery || isPreviewMode) return;
    
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

  // Calculations
  const countTotal = () => data.categories.reduce((acc, c) => acc + c.software.length, 0);

  const displayedItems = useMemo(() => {
    let items = [];
    const sortedCats = [...data.categories].sort((a, b) => a.sort - b.sort);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const targetCats = currentCategory === 'all' ? sortedCats : sortedCats.filter(c => c.id === currentCategory);
      targetCats.forEach(cat => {
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

  return (
    <div className="flex h-screen overflow-hidden text-sm bg-[#f5f5f5] text-[#171717] font-sans">
      <Sidebar 
        data={data}
        currentCategory={currentCategory}
        setCurrentCategory={setCurrentCategory}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        countTotal={countTotal}
        sensors={sensors}
        handleDragEnd={handleDragEnd}
        setModals={setModals}
        setEditingCat={setEditingCat}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            wdConfig={wdConfig}
            isSyncing={isSyncing}
            data={data}
            setModals={setModals}
        />
        
        <SoftwareGrid 
            data={data}
            currentCategory={currentCategory}
            searchQuery={searchQuery}
            countTotal={countTotal}
            displayedItems={displayedItems}
            sensors={sensors}
            handleDragEnd={handleDragEnd}
            setEditingCat={setEditingCat}
            setModals={setModals}
            saveData={saveData}
            wdConfig={wdConfig}
            isPreviewMode={isPreviewMode}
            onExitPreview={() => window.location.href = window.location.pathname}
            onImportMerge={handleImportMerge}
            onImportSingle={handleImportSingle}
            setEditingSoft={setEditingSoft}
            setShareSoft={setShareSoft}
            showToast={showToast}
            getDomain={getDomain}
        />
      </div>

      <ModalManager 
        modals={modals}
        setModals={setModals}
        wdConfig={wdConfig}
        setWdConfig={setWdConfig}
        handleWebDav={handleWebDav}
        handleUpdateRepo={handleUpdateRepo}
        editingCat={editingCat}
        handleSaveCategory={handleSaveCategory}
        editingSoft={editingSoft}
        data={data}
        currentCategory={currentCategory}
        handleSaveSoftware={handleSaveSoftware}
        handleDeleteSoftware={handleDeleteSoftware}
        shareSoft={shareSoft}
        showToast={showToast}
      />

      {/* Global Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none animate-modal-in">
            <div className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium text-white flex items-center gap-2 ${toast.type==='error'?'bg-red-500':'bg-black'}`}>
                {toast.type==='error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />} {toast.msg}
            </div>
        </div>
      )}
    </div>
  );
}