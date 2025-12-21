import { 
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor, 
  KeyboardSensor 
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * 拖拽交互 Hook
 * 处理分类和软件的拖拽排序逻辑
 * 
 * @param {Object} data - 当前数据
 * @param {Function} saveData - 数据保存函数
 * @param {string} currentCategory - 当前选中的分类 ID
 * @param {string} searchQuery - 当前搜索关键词
 * @param {boolean} isPreviewMode - 是否处于预览模式
 * @returns {Object} 包含 sensors 和 handleDragEnd
 */
export function useDragDrop(data, saveData, currentCategory, searchQuery, isPreviewMode) {
  
  // 定义传感器 (Sensors)
  // MouseSensor: 增加 10px 的移动距离阈值，防止点击时误触发拖拽
  // TouchSensor: 增加 250ms 延迟和 5px 容差，优化移动端体验
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * 拖拽结束处理函数
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    // 如果没有拖拽到有效目标，或者拖拽前后位置没变，直接返回
    if (!over || active.id === over.id) return;

    // --- 场景 1: 分类排序 ---
    // 判断拖拽对象是否为分类 (存在于 categories 数组中)
    if (data.categories.some(c => c.id === active.id)) {
      const oldIndex = data.categories.findIndex(c => c.id === active.id);
      const newIndex = data.categories.findIndex(c => c.id === over.id);
      
      // 重新排序并更新 sort 字段
      const newCats = arrayMove(data.categories, oldIndex, newIndex)
        .map((c, i) => ({ ...c, sort: i + 1 }));
        
      saveData({ ...data, categories: newCats });
      return;
    } 
    
    // --- 场景 2: 软件排序 ---
    // 只有在“全部”分类下、无搜索、非预览模式时才允许排序
    // (因为其他模式下视图是过滤过的，排序逻辑会变得复杂且容易出错)
    if (currentCategory === 'all' || searchQuery || isPreviewMode) return;
    
    // 找到当前分类
    const catIndex = data.categories.findIndex(c => c.id === currentCategory);
    if (catIndex === -1) return;
    
    const cat = data.categories[catIndex];
    const oldIndex = cat.software.findIndex(s => s.id === active.id);
    const newIndex = cat.software.findIndex(s => s.id === over.id);
    
    // 确保拖拽对象和目标对象都在该分类下
    if (oldIndex !== -1 && newIndex !== -1) {
      const newSoftware = arrayMove(cat.software, oldIndex, newIndex)
        .map((s, i) => ({ ...s, sort: i + 1 }));
        
      const newCats = [...data.categories];
      newCats[catIndex] = { ...cat, software: newSoftware };
      
      saveData({ ...data, categories: newCats });
    }
  };

  return { sensors, handleDragEnd };
}
