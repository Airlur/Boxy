import React from 'react';
import { Box, Layers, Folder, Plus, Settings } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../SortableItem';

export function Sidebar({ 
  data, 
  currentCategory, 
  setCurrentCategory, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  countTotal, 
  sensors, 
  handleDragEnd,
  setModals,
  setEditingCat,
  setSearchQuery
}) {
  return (
    <>
      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 fixed md:relative h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-14 flex items-center px-5 border-b border-gray-100 shrink-0 gap-3">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white shadow-md">
            <Box size={14} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Boxy</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <div className="mb-1">
            <div 
              onClick={() => { setCurrentCategory('all'); setSearchQuery(''); setIsSidebarOpen(false); }}
              className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${currentCategory === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center">
                <Layers size={16} className="mr-3"/>
                <span>全部软件</span>
              </div>
              <span className={`text-[10px] rounded-full ${currentCategory === 'all' ? 'bg-white/20 text-white w-5 h-5 flex items-center justify-center' : 'w-5 h-5 flex items-center justify-center text-gray-400'}`}>
                {countTotal()}
              </span>
            </div>
          </div>
          
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={data.categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {[...data.categories].sort((a,b) => a.sort - b.sort).map(cat => (
                <SortableItem key={cat.id} id={cat.id} className="group mb-1">
                  <div 
                    onClick={() => { setCurrentCategory(cat.id); setSearchQuery(''); setIsSidebarOpen(false); }}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${currentCategory === cat.id ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}
                  >
                    <div className="flex items-center truncate">
                      <Folder size={16} className={`mr-3 ${currentCategory === cat.id ? 'text-gray-300' : 'text-gray-400'}`} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={`text-[10px] opacity-60 ml-2 rounded-full w-5 h-5 flex items-center justify-center ${currentCategory === cat.id ? 'bg-white/20' : ''}`}>
                      {cat.software.length}
                    </span>
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="p-3 border-t border-gray-100 space-y-2">
          <button 
            onClick={() => { setEditingCat(null); setModals(prev => ({...prev, category: true})); }} 
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-gray-500 hover:text-black hover:bg-gray-50 rounded-md transition-colors border border-dashed border-gray-300 hover:border-gray-400"
          >
            <Plus size={14} />
            <span>新增分类</span>
          </button>

          <button 
            onClick={() => setModals(prev => ({ ...prev, settings: true }))}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-md transition-colors group"
          >
            <Settings size={16} className="text-gray-400 group-hover:text-black" />
            <span className="font-medium text-sm">设置</span>
          </button>
        </div>
      </aside>

      {/* 移动端遮罩层 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
    </>
  );
}