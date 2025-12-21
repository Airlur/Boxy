import React from 'react';
import { SettingsModal } from './SettingsModal';
import { CategoryModal } from './CategoryModal';
import { SoftwareModal } from './SoftwareModal';
import { ShareModal } from './ShareModal';
import { ShareAllModal } from './ShareAllModal';

export function ModalManager({
  modals,
  setModals,
  // Settings & WebDAV
  wdConfig,
  setWdConfig,
  handleWebDav, 
  handleUpdateRepo,
  handleTestConnection, // 连通性测试
  backups, 
  fetchBackups, 
  handleRestore, 
  handleDeleteBackup, 
  editingCat, 
  handleSaveCategory, 
  editingSoft, 
  data, 
  currentCategory, 
  handleSaveSoftware, 
  handleDeleteSoftware, 
  shareSoft, 
  showToast,
  syncStatus // 同步状态
}) {
  if (!Object.values(modals).some(v => v)) return null;

  return (
    <>
      {modals.settings && (
        <SettingsModal 
          config={wdConfig} 
          setConfig={setWdConfig} 
          onSync={handleWebDav}
          onUpdateRepo={handleUpdateRepo}
          onTestConnection={handleTestConnection} // 连通性测试
          onClose={() => setModals(prev => ({ ...prev, settings: false }))}
          backups={backups}
          onFetchBackups={fetchBackups}
          onRestore={handleRestore}
          onDeleteBackup={handleDeleteBackup}
          syncStatus={syncStatus} // 同步状态
        />
      )}
      
      {modals.category && (
        <CategoryModal 
          editingCat={editingCat} 
          onSave={handleSaveCategory} 
          onClose={() => setModals(prev => ({...prev, category: false}))} 
        />
      )}
      
      {modals.software && (
        <SoftwareModal 
          editingSoft={editingSoft} 
          categories={data.categories} 
          currentCategory={currentCategory}
          onSave={handleSaveSoftware}
          onDelete={handleDeleteSoftware}
          onClose={() => setModals(prev => ({...prev, software: false}))} 
          showToast={showToast}
        />
      )}

      {modals.share && shareSoft && (
        <ShareModal 
          soft={shareSoft} 
          onClose={() => setModals(prev => ({...prev, share: false}))} 
          showToast={showToast}
        />
      )}

      {modals.shareAll && (
        <ShareAllModal 
          data={data}
          onClose={() => setModals(prev => ({...prev, shareAll: false}))} 
          showToast={showToast}
        />
      )}
    </>
  );
}