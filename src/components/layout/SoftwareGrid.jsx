import React from 'react';
import { Edit3, Trash2, PlusSquare, Upload, Download, Share2, Settings, Globe, BookOpen, Ghost } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../SortableItem';

export function SoftwareGrid({
  data,
  currentCategory,
  searchQuery,
  countTotal,
  displayedItems,
  sensors,
  handleDragEnd,
  // Actions
  setEditingCat,
  setModals,
  saveData,
  wdConfig,
  // Preview Mode
  isPreviewMode,
  onExitPreview,
  onImportMerge,
  onImportSingle,
  // Item Actions
  setEditingSoft,
  setShareSoft,
  showToast,
  // Helpers
  getDomain,
  handleSaveSoftware
}) {
  return (
    <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 relative">

      {/* 预览模式状态栏 */}
      {isPreviewMode && (
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 animate-fade-in mb-6 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Globe size={16} />
            <span>正在预览分享内容 (只读模式)</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onExitPreview} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors">
              退出预览
            </button>
            <button onClick={onImportMerge} className="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded text-xs font-bold transition-colors shadow-sm">
              一键导入合并
            </button>
          </div>
        </div>
      )}

      {/* 顶部操作栏 */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            {searchQuery 
              ? `搜索: "${searchQuery}"` 
              : (currentCategory === 'all' 
                ? '全部软件' 
                : data.categories.find(c => c.id === currentCategory)?.name)}
          </h2>
          <p className="text-gray-500 mt-1 text-xs">
            {searchQuery 
              ? '跨分类结果' 
              : (currentCategory === 'all' 
                ? `共收录 ${countTotal()} 个应用` 
                : `${data.categories.find(c => c.id === currentCategory)?.software.length} 个应用`)}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          {currentCategory !== 'all' && !searchQuery && (
            <div className="flex gap-1 border-r border-gray-100 pr-2 mr-2">
              <button 
                onClick={() => { 
                  setEditingCat(data.categories.find(c => c.id === currentCategory)); 
                  setModals(prev => ({ ...prev, category: true })); 
                }} 
                className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 transition-colors" 
                data-tip="编辑分类"
              >
                <Edit3 size={16} />
              </button>
              <button 
                onClick={() => { 
                  // eslint-disable-next-line no-restricted-globals
                  if (confirm('确认删除？')) { 
                    saveData({ ...data, categories: data.categories.filter(c => c.id !== currentCategory) }); 
                  } 
                }} 
                className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-red-500 hover:text-red-600 transition-colors"
                data-tip="删除分类"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
          {!isPreviewMode && (
            <>
              <button 
                onClick={() => { setEditingSoft(null); setModals(prev => ({ ...prev, software: true })); }} 
                className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                data-tip="新增软件"
              >
                <PlusSquare size={18} />
              </button>
              <button 
                onClick={() => document.getElementById('json-import').click()} 
                className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                data-tip="导入数据"
              >
                <Upload size={18} />
              </button>
              <button 
                onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const a = document.createElement('a'); 
                  a.href = URL.createObjectURL(blob);
                  a.download = `boxy_backup_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`; 
                  a.click();
                }} 
                className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                data-tip="导出备份"
              >
                <Download size={18} />
              </button>
              <button 
                onClick={() => setModals(prev => ({ ...prev, shareAll: true }))} 
                className="tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                data-tip="分享整个库"
              >
                <Share2 size={18} />
              </button>
              <button 
                onClick={() => setModals(prev => ({ ...prev, settings: true }))} 
                className={`tooltip-wrap w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${wdConfig.autoSync ? 'text-blue-600' : 'text-gray-700 hover:text-black'}`}
                data-tip="设置 & 同步"
              >
                <Settings size={18} />
              </button>
              <input 
                type="file" 
                id="json-import" 
                className="hidden" 
                accept=".json" 
                onChange={(e) => {
                  if (!e.target.files[0]) return;
                  // eslint-disable-next-line no-restricted-globals
                  if (!confirm('导入数据将覆盖当前所有数据，建议先导出备份！\n是否继续？')) { e.target.value = ''; return; }
                  const reader = new FileReader(); 
                  reader.onload = (ev) => { 
                    try { 
                      saveData(JSON.parse(ev.target.result)); 
                      showToast('导入成功'); 
                    } catch (err) { 
                      showToast('格式错误', 'error'); 
                    } 
                  };
                  reader.readAsText(e.target.files[0]); 
                  e.target.value = '';
                }} 
              />
            </>
          )}
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
              const isDragDisabled = currentCategory === 'all' || !!searchQuery || isPreviewMode;

              const initialSrc = soft.iconUrl || proxyUrl;

              return (
                <SortableItem key={soft.id} id={soft.id} className="h-full" disabled={isDragDisabled}>
                  <div className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all duration-200 relative flex flex-col h-full select-none">
                    <div className="flex justify-between items-start mb-3" onClick={() => {
                      setEditingSoft(soft); setModals(prev => ({ ...prev, software: true }));
                    }}>
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-800 font-bold text-lg overflow-hidden group-hover:scale-110 transition-transform duration-300">
                        {initialSrc ? (
                          <img
                            src={initialSrc}
                            loading="lazy"
                            alt={soft.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              if (soft.iconUrl && e.target.src.includes(soft.iconUrl) && proxyUrl) {
                                e.target.src = proxyUrl;
                                return;
                              }
                              if (e.target.src.includes('/api/favicon') && googleUrl) {
                                e.target.src = googleUrl;
                                return;
                              }
                              e.target.style.display = 'none';
                              e.target.parentElement.innerText = firstChar;
                            }}
                          />
                        ) : firstChar}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full font-medium tracking-wide group-hover:bg-gray-100 transition-colors">
                        {soft._catName}
                      </span>
                    </div>
                    <div className="flex-grow cursor-pointer" onClick={() => {
                      setEditingSoft(soft); setModals(prev => ({ ...prev, software: true }));
                    }}>
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">{soft.name}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{soft.description}</p>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50 group-hover:border-gray-100 transition-colors">
                      <button 
                        disabled={!soft.website} 
                        onClick={(e) => { e.stopPropagation(); window.open(soft.website, '_blank', 'noopener,noreferrer'); }} 
                        className="tooltip-wrap flex items-center gap-1.5 text-xs text-gray-500 hover:text-black px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-default" 
                        data-tip={soft.website ? '访问官网' : '无官网链接'}
                      >
                        <Globe size={14} />
                      </button>
                      <button 
                        disabled={!soft.downloadUrls?.[0]} 
                        onClick={(e) => { e.stopPropagation(); window.open(soft.downloadUrls[0], '_blank', 'noopener,noreferrer'); }} 
                        className="tooltip-wrap flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-default"
                        data-tip={soft.downloadUrls?.[0] ? '快速下载' : '无下载链接'}
                      >
                        <Download size={14} /> <span className="font-medium">{soft.downloadUrls?.length || 0}</span>
                      </button>
                      <button 
                        disabled={!soft.blogUrls?.[0]} 
                        onClick={(e) => { e.stopPropagation(); window.open(soft.blogUrls[0], '_blank', 'noopener,noreferrer'); }} 
                        className="tooltip-wrap flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 px-2 py-1 rounded hover:bg-amber-50 transition-colors disabled:opacity-30 disabled:cursor-default"
                        data-tip={soft.blogUrls?.[0] ? '查看教程' : '无教程链接'}
                      >
                        <BookOpen size={14} /> <span className="font-medium">{soft.blogUrls?.length || 0}</span>
                      </button>
                      {!isPreviewMode && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShareSoft(soft); setModals(prev => ({ ...prev, share: true })); }} 
                          className="tooltip-wrap flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                          data-tip="分享软件"
                        >
                          <Share2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      {displayedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Ghost size={32} className="text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">空空如也</h3>
        </div>
      )}
    </main>
  );
}