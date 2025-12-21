import React from 'react';
import { Menu, Search, X, RotateCw, Cloud, Download, Share2, Settings } from 'lucide-react';

export function Header({ 
    isSidebarOpen, 
    setIsSidebarOpen, 
    searchQuery, 
    setSearchQuery, 
    wdConfig, 
    isSyncing, 
    data, 
    setModals
}) {
    return (
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 z-10 gap-4">
            <button className="md:hidden p-1.5 hover:bg-gray-100 rounded-md" onClick={() => setIsSidebarOpen(true)}><Menu size={20} className="text-gray-600" /></button>
            
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

            {/* Actions (Moved from main content area to header for better UX? No, keeping original structure, but maybe some buttons were here?) */}
            {/* The original code had action buttons inside the MAIN area top bar, not the HEADER. 
                Wait, let me check App.jsx again. The Download/Share/Settings buttons were in the "flex items-center gap-2 bg-white..." div inside <main>, NOT in <header>.
                So Header only contains Search and Sync Status.
            */}
        </header>
    );
}
