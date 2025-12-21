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

  // 2. 自动同步逻辑 (带倒计时 UI)
  const [syncCountdown, setSyncCountdown] = useState(0);
  const syncTimerRef = useRef(null);
  const syncTargetTimeRef = useRef(0);
  const triggerSyncFuncRef = useRef(null); // 保存最新的同步函数

  // 4. WebDAV 管理
  const { 
    wdConfig, setWdConfig, syncStatus, setSyncStatus,
    handleWebDav, handleUpdateRepo, handleTestConnection,
    backups, fetchBackups, handleRestore, handleDeleteBackup
  } = useWebDAV(showToast, (d, s) => innerSaveData(d, s), setModals);

  // 启动倒计时
  const handleAutoSyncTrigger = (newData) => {
    // 立即进入等待状态 (打断之前的成功/错误提示)
    setSyncStatus('waiting');
    
    // 1. 清除旧定时器
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    
    const delay = wdConfig.syncDelay || 2;
    // 2. 设定目标时间
    syncTargetTimeRef.current = Date.now() + (delay * 1000);
    setSyncCountdown(delay);

    // 3. 启动 interval 每 100ms 检查一次
    syncTimerRef.current = setInterval(() => {
      const remain = Math.ceil((syncTargetTimeRef.current - Date.now()) / 1000);
      
      if (remain <= 0) {
        clearInterval(syncTimerRef.current);
        setSyncCountdown(0);
        if (triggerSyncFuncRef.current) {
           triggerSyncFuncRef.current(newData);
        }
      } else {
        setSyncCountdown(remain);
      }
    }, 100);
  };

  // 3. 数据管理
  const { 
    data, setData, 
    saveData: innerSaveData, 
    handleSaveSoftware, handleDeleteSoftware, handleSaveCategory,
    handleImportMerge, handleImportSingle
  } = useData(showToast, false, handleAutoSyncTrigger); 

  // 更新 Ref 以指向最新的 handleWebDav (解决闭包过时问题)
  useEffect(() => {
    triggerSyncFuncRef.current = (newData) => {
      if (wdConfig.autoSync && wdConfig.url) {
        handleWebDav('push', newData, true, wdConfig);
      }
    };
  }, [wdConfig, handleWebDav]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
       if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

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

  // 初始 WebDAV Pull (仅在组件挂载且有已保存配置时执行一次)
  useEffect(() => {
    // 检查本地是否有已保存的配置
    const saved = localStorage.getItem('boxy_webdav_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!isPreviewMode && parsed.autoSync && parsed.url && parsed.user) {
           // 使用 parsed 的配置进行首次拉取，而不是依赖 wdConfig 状态
           handleWebDav('pull', data, true, parsed);
        }
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依赖项置空，只运行一次

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
          syncStatus={syncStatus}
          syncCountdown={syncCountdown}
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
        syncStatus={syncStatus}
        handleWebDav={(type, silent) => handleWebDav(type, data, silent)}
        handleUpdateRepo={() => handleUpdateRepo(data)}
        handleTestConnection={handleTestConnection}
        backups={backups}
        fetchBackups={fetchBackups}
        handleRestore={handleRestore}
        handleDeleteBackup={handleDeleteBackup}
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
