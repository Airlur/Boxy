import React from 'react';
import { SettingsModal } from './SettingsModal';
import { CategoryModal } from './CategoryModal';
import { SoftwareModal } from './SoftwareModal';
import { ShareModal } from './ShareModal';
import { ShareAllModal } from './ShareAllModal';

export function ModalManager({
    modals,
    setModals,
    // Settings
    wdConfig,
    setWdConfig,
    handleWebDav,
    handleUpdateRepo,
    // Category
    editingCat,
    handleSaveCategory,
    // Software
    editingSoft,
    data,
    currentCategory,
    handleSaveSoftware,
    handleDeleteSoftware,
    // Share
    shareSoft,
    showToast
}) {
    return (
        <>
            {modals.settings && (
                <SettingsModal 
                    config={wdConfig} 
                    setConfig={setWdConfig} 
                    onSync={(type) => handleWebDav(type)} 
                    onClose={() => setModals(prev => ({...prev, settings: false}))} 
                    onUpdateRepo={handleUpdateRepo}
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
