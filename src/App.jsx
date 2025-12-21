import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SoftwareGrid } from './components/layout/SoftwareGrid';
import { ModalManager } from './components/modals/ModalManager';

// Custom Hooks
import { useToast } from './hooks/useToast';
import { useSearch } from './hooks/useSearch';
import { usePreviewMode } from './hooks/usePreviewMode';
import { useData } from './hooks/useData';
import { useWebDAV } from './hooks/useWebDAV';
import { useDragDrop } from './hooks/useDragDrop';

export default function App() {
  // --- 状态管理 ---
  
  // 弹窗状态
  const [modals, setModals] = useState({ 
    software: false, 
    category: false, 
    settings: false, 
    share: false, 
    shareAll: false 
  });
  const [editingSoft, setEditingSoft] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [shareSoft, setShareSoft] = useState(null);
  
  // Sidebar 状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- Hooks 初始化 ---

  // 1. 全局提示
  const { toast, showToast } = useToast();

  // 2. 自动同步逻辑 (通过 Ref 解决闭包问题)
  const autoSyncTimer = useRef(null);
  const triggerAutoSyncRef = useRef((newData) => {});

  const handleAutoSyncTrigger = (newData) => {
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(() => {
        triggerAutoSyncRef.current(newData);
    }, 2000);
  };

  // 3. 数据管理
  const { 
    data, setData, 
    saveData: innerSaveData, 
    handleSaveSoftware, handleDeleteSoftware, handleSaveCategory,
    handleImportMerge, handleImportSingle
  } = useData(showToast, false, handleAutoSyncTrigger); 

  // 4. WebDAV 管理
  const { 
    wdConfig, setWdConfig, isSyncing, 
    handleWebDav, handleUpdateRepo 
  } = useWebDAV(showToast, innerSaveData, setModals);

  // 更新 Ref 以指向最新的 handleWebDav 和 wdConfig
  useEffect(() => {
    triggerAutoSyncRef.current = (newData) => {
      if (wdConfig.autoSync && wdConfig.url) {
        console.log(`[${new Date().toLocaleString()}] 正在触发自动同步推送...`);
        handleWebDav('push', newData, true, wdConfig);
      }
    };
  }, [wdConfig, handleWebDav]);

  // 5. 预览模式
  const { isPreviewMode } = usePreviewMode(setData, showToast);

  // 6. 搜索逻辑
  const { 
    currentCategory, setCurrentCategory, 
    searchQuery, setSearchQuery, 
    displayedItems 
  } = useSearch(data);

  // 包装 saveData (添加预览模式检查)
  const saveData = (newData, skipAutoSync) => {
    if (isPreviewMode) {
        showToast('预览模式无法保存修改', 'error');
        return;
    }
    innerSaveData(newData, skipAutoSync);
  };

  // 7. 拖拽逻辑
  const { sensors, handleDragEnd } = useDragDrop(
    data, 
    saveData, 
    currentCategory, 
    searchQuery, 
    isPreviewMode
  );

  // --- Effects ---

  // 初始 WebDAV Pull
  useEffect(() => {
    if (!isPreviewMode && wdConfig.autoSync && wdConfig.url && wdConfig.user) {
        handleWebDav('pull', data, true, wdConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wdConfig.url, wdConfig.user]);

  // --- 辅助函数 ---
  const getDomain = (soft) => {
    let domain = '';
    try { 
      if (soft.website) domain = new URL(soft.website).hostname; 
    } catch (e) {}
    
    if (!domain && soft.downloadUrls?.[0]) {
      try { 
        domain = new URL(soft.downloadUrls[0]).hostname; 
      } catch (e) {}
    }
    return domain;
  };

  const countTotal = () => data.categories.reduce((acc, c) => acc + c.software.length, 0);

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
            handleSaveSoftware={(e) => handleSaveSoftware(e, modals, setModals)}
        />
      </div>

      <ModalManager 
        modals={modals}
        setModals={setModals}
        wdConfig={wdConfig}
        setWdConfig={setWdConfig}
        handleWebDav={(type, silent) => handleWebDav(type, data, silent)}
        handleUpdateRepo={() => handleUpdateRepo(data)}
        editingCat={editingCat}
        handleSaveCategory={(name) => handleSaveCategory(name, editingCat, modals, setModals)}
        editingSoft={editingSoft}
        data={data}
        currentCategory={currentCategory}
        handleSaveSoftware={(e) => handleSaveSoftware(e, modals, setModals)}
        handleDeleteSoftware={() => handleDeleteSoftware(editingSoft, modals, setModals)}
        shareSoft={shareSoft}
        showToast={showToast}
      />

      {/* 全局 Toast 提示 */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none animate-modal-in">
            <div className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium text-white flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-black'}`}>
                {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />} {toast.msg}
            </div>
        </div>
      )}
    </div>
  );
}