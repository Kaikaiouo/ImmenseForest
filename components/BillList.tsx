import React, { useState, useMemo, useEffect } from 'react';
import { BillData, UserRole } from '../types';
import { TOTAL_HOUSEHOLDS } from '../constants';
import { api } from '../services/dataRepository';

interface BillListProps {
  data: BillData[];
  onDelete: (id: string) => void;
  userRole: UserRole;
  onRequestAction: (
    action: () => void, 
    logInfo: { module: string, action: '新增' | '修改' | '刪除', description: string, diff?: string },
    confirmMessage: string
  ) => void;
}

export const BillList: React.FC<BillListProps> = ({ data, onDelete, userRole, onRequestAction }) => {
  const [selectedBill, setSelectedBill] = useState<BillData | null>(null);
  
  // Year Filter State (Using ROC years internally, displaying AD)
  const availableRocYears = useMemo(() => {
    const years = new Set(data.map(d => d.rocYear));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [data]);
  
  const [filterRocYear, setFilterRocYear] = useState<number | 'ALL'>('ALL');

  // Calculate Record Highs for entire dataset
  const { maxAmount, maxUsage } = useMemo(() => {
    if (data.length === 0) return { maxAmount: 0, maxUsage: 0 };
    return {
      maxAmount: Math.max(...data.map(d => d.amount)),
      maxUsage: Math.max(...data.map(d => d.usage))
    };
  }, [data]);

  // Sort descending by date and Filter
  const filteredData = useMemo(() => {
    let result = [...data];
    if (filterRocYear !== 'ALL') {
      result = result.filter(d => d.rocYear === filterRocYear);
    }
    return result.sort((a, b) => {
      return (Number(b.rocYear) * 12 + Number(b.month)) - (Number(a.rocYear) * 12 + Number(a.month));
    });
  }, [data, filterRocYear]);

  const canEdit = userRole === UserRole.MANAGER || userRole === UserRole.ADMIN;

  const handleDeleteClick = (bill: BillData) => {
    const action = () => onDelete(bill.id);
    const confirmMsg = `您即將刪除 ${bill.rocYear + 1911}年 ${bill.month}月 的電費單資料。\n此動作無法復原。`;
    const logInfo = {
      module: '公電',
      action: '刪除' as const,
      description: `${bill.rocYear + 1911}年 ${bill.month}月 電費單`,
      diff: `金額: $${bill.amount}`
    };
    onRequestAction(action, logInfo, confirmMsg);
  };

  // Helper to check for Summer Rate (June - Sept)
  const isSummerRate = (month: number) => {
    return month >= 6 && month <= 9;
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-700">歷史帳單記錄</h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{filteredData.length} 筆資料</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">篩選年份:</label>
            <select 
              value={filterRocYear}
              onChange={(e) => setFilterRocYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-1.5"
            >
              <option value="ALL">全部年份</option>
              {availableRocYears.map(rocYear => (
                <option key={rocYear} value={rocYear}>{rocYear + 1911} 年</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">帳單年份/月份</th>
                <th scope="col" className="px-6 py-3 text-right">用電度數 (kWh)</th>
                <th scope="col" className="px-6 py-3 text-right">金額 (NTD)</th>
                {canEdit && <th scope="col" className="px-6 py-3 text-right">管理</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((bill) => (
                <tr 
                  key={bill.id} 
                  className="bg-white border-b hover:bg-emerald-50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedBill(bill)}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-emerald-700">
                    <div className="flex items-center gap-2">
                      <span>{bill.rocYear + 1911}年 {String(bill.month).padStart(2, '0')}月</span>
                      {isSummerRate(bill.month) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-200 whitespace-nowrap">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-orange-500 animate-[spin_10s_linear_infinite]">
                            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                          </svg>
                          夏季用電
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right relative group/cell">
                    <div className="flex items-center justify-end gap-2">
                       {bill.usage === maxUsage && (
                        <div className="relative group/tooltip">
                           <span className="cursor-help text-lg">⚠️</span>
                           <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-red-500 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 hidden group-hover/tooltip:block pointer-events-none">
                            創歷年新高
                          </div>
                        </div>
                      )}
                      {bill.usage.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600 relative group/cell">
                     <div className="flex items-center justify-end gap-2">
                       {bill.amount === maxAmount && (
                         <div className="relative group/tooltip">
                           <span className="cursor-help text-lg">⚠️</span>
                           <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-red-500 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 hidden group-hover/tooltip:block pointer-events-none">
                            創歷年新高
                          </div>
                        </div>
                      )}
                      ${bill.amount.toLocaleString()}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteClick(bill)}
                        className="text-red-400 hover:text-red-600 font-medium hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        刪除
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="px-6 py-8 text-center text-gray-400">
                    此年份尚無資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBill && (
        <DetailModal 
          bill={selectedBill} 
          canEdit={canEdit}
          onClose={() => setSelectedBill(null)}
          onRequestAction={onRequestAction}
          onUpdate={(updatedBill) => {
            // Updated logic handled by parent effect
          }}
        />
      )}
    </>
  );
};

// -- Detail Modal Component --

interface DetailModalProps {
  bill: BillData;
  canEdit: boolean;
  onClose: () => void;
  onRequestAction: (action: () => void, logInfo: any, msg: string) => void;
  onUpdate: (updatedBill: BillData) => void; 
}

const DetailModal: React.FC<DetailModalProps> = ({ bill, canEdit, onClose, onRequestAction }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BillData>({ ...bill });

  useEffect(() => {
    setFormData({ ...bill });
  }, [bill]);

  const handleChange = (field: keyof BillData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Basic Validation
    if (!formData.rocYear || !formData.month || !formData.amount) {
      alert("年份、月份與金額為必填欄位");
      return;
    }

    const action = async () => {
      // Call DB Repo
      await api.saveBill(formData);
      
      const event = new CustomEvent('APP_UPDATE_BILL', { detail: formData });
      window.dispatchEvent(event);
      setIsEditing(false);
    };

    const diff = `金額: ${bill.amount} -> ${formData.amount}, 度數: ${bill.usage} -> ${formData.usage}`;
    const confirmMsg = `確定要修改 ${formData.rocYear + 1911}年 ${formData.month}月 的帳單資料嗎？`;
    
    onRequestAction(
      action,
      { module: '公電', action: '修改', description: `修正 ${formData.rocYear + 1911}年${formData.month}月帳單`, diff },
      confirmMsg
    );
  };

  // ... (Rest of DetailModal JSX remains the same, no changes needed for rendering)
  // Just copying the return for XML completeness
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <p className="opacity-80 text-sm font-medium tracking-wider mb-1">台灣電力公司</p>
            <h2 className="text-2xl font-bold">
               {isEditing ? '編輯電費單明細' : '電費通知單明細'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {isEditing ? (
                 <div className="flex gap-2">
                   <div className="flex items-center bg-white/10 rounded px-1">
                      <input 
                        type="number" 
                        value={formData.rocYear + 1911} // Show AD
                        onChange={e => handleChange('rocYear', Number(e.target.value) - 1911)} // Store ROC
                        className="w-20 px-1 text-white bg-transparent outline-none text-right"
                      />
                      <span className="text-sm ml-1">年 (西元)</span>
                   </div>
                   <div className="flex items-center bg-white/10 rounded px-1">
                      <input 
                        type="number" 
                        value={formData.month} 
                        onChange={e => handleChange('month', Number(e.target.value))}
                        className="w-12 px-1 text-white bg-transparent outline-none text-right"
                      />
                      <span className="text-sm ml-1">月</span>
                   </div>
                 </div>
              ) : (
                <p className="text-emerald-100 font-mono text-lg">{bill.rocYear + 1911}年 {String(bill.month).padStart(2, '0')}月</p>
              )}
            </div>
            
            <div className="mt-1">
              {isEditing ? (
                 <input 
                  type="text" 
                  value={formData.meterNumber || ''} 
                  onChange={e => handleChange('meterNumber', e.target.value)}
                  className="text-xs text-emerald-900 rounded px-1"
                  placeholder="電號"
                 />
              ) : (
                 bill.meterNumber && <p className="text-xs text-emerald-200">電號: {bill.meterNumber}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-sm transition-colors"
              >
                修改
              </button>
            )}
             {isEditing && (
              <button 
                onClick={handleSave}
                className="bg-white text-emerald-600 px-3 py-1 rounded-full text-sm font-bold shadow-sm"
              >
                儲存
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-emerald-100 hover:text-white bg-emerald-700/50 hover:bg-emerald-700 rounded-full p-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {/* Primary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-emerald-600 text-xs uppercase tracking-wide mb-1">應繳總金額</p>
              {isEditing ? (
                 <input 
                   type="number"
                   value={formData.amount}
                   onChange={e => handleChange('amount', Number(e.target.value))}
                   className="w-full text-2xl font-bold text-emerald-700 bg-white border border-emerald-200 rounded p-1"
                 />
              ) : (
                 <p className="text-3xl font-bold text-emerald-700 font-mono">${bill.amount.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <p className="text-yellow-600 text-xs uppercase tracking-wide mb-1">總用電度數</p>
               {isEditing ? (
                 <input 
                   type="number"
                   value={formData.usage}
                   onChange={e => handleChange('usage', Number(e.target.value))}
                   className="w-full text-2xl font-bold text-yellow-700 bg-white border border-yellow-200 rounded p-1"
                 />
              ) : (
                 <p className="text-3xl font-bold text-yellow-700 font-mono">{bill.usage.toLocaleString()} <span className="text-sm font-normal text-yellow-600">kWh</span></p>
              )}
            </div>
          </div>

           {/* Calculation Formula Section */}
           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
            <h4 className="text-sm font-bold text-blue-700 mb-3 border-b border-blue-200 pb-2">💡 電費計算公式說明</h4>
            <div className="space-y-2 text-sm text-blue-900">
              <div className="flex justify-between items-center">
                <span>基本電費：</span>
                {isEditing ? (
                  <input type="number" value={formData.basicFee || 0} onChange={e => handleChange('basicFee', Number(e.target.value))} className="w-24 text-right px-1 border rounded" />
                ) : (
                  <span className="font-mono">${bill.basicFee?.toLocaleString() ?? '未登錄'}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>+ 流動電費：</span>
                {isEditing ? (
                  <input type="number" value={formData.flowFee || 0} onChange={e => handleChange('flowFee', Number(e.target.value))} className="w-24 text-right px-1 border rounded" />
                ) : (
                  <span className="font-mono">${bill.flowFee?.toLocaleString() ?? '未登錄'}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>+ 功率因數調整費：</span>
                 {isEditing ? (
                  <input type="number" value={formData.paymentAdjustment || 0} onChange={e => handleChange('paymentAdjustment', Number(e.target.value))} className="w-24 text-right px-1 border rounded" />
                ) : (
                  <span className="font-mono text-red-600">
                    {((bill.paymentAdjustment || 0)) < 0 ? '' : '+'}
                    {(bill.paymentAdjustment || 0).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span>+ 其他費用：</span>
                 {isEditing ? (
                  <input type="number" value={formData.others || 0} onChange={e => handleChange('others', Number(e.target.value))} className="w-24 text-right px-1 border rounded" />
                ) : (
                  <span className="font-mono text-red-600">
                    {((bill.others || 0)) < 0 ? '' : '+'}
                    {(bill.others || 0).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="border-t border-blue-200 my-1"></div>
              <div className="flex justify-between font-bold">
                <span>= 電費總金額：</span>
                <span className="font-mono">${bill.amount.toLocaleString()}</span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-blue-200">
                <div className="flex justify-between items-center text-blue-800">
                  <span>每戶應分攤金額 (共{TOTAL_HOUSEHOLDS}戶)：</span>
                  <span className="font-bold text-lg bg-white px-2 py-1 rounded border border-blue-200">
                    ${Math.round(bill.amount / TOTAL_HOUSEHOLDS).toLocaleString()}
                    <span className="text-xs font-normal text-gray-500 ml-1">/戶</span>
                  </span>
                </div>
              </div>
            </div>
          </div>


          {/* Detailed Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            
            <div className="col-span-1 md:col-span-2 pb-2 border-b border-gray-100 mb-2">
              <h4 className="text-sm font-bold text-gray-500 uppercase">基本資料</h4>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">計費期間</span>
              {isEditing ? (
                  <input type="text" value={formData.billingPeriod || ''} onChange={e => handleChange('billingPeriod', e.target.value)} className="text-sm border rounded px-1 w-48" />
              ) : (
                  <span className="font-medium text-gray-800 text-sm text-right">{bill.billingPeriod || '未記錄'}</span>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 pb-2 border-b border-gray-100 mb-2 mt-2">
              <h4 className="text-sm font-bold text-gray-500 uppercase">用電分析</h4>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">經常契約容量</span>
              {isEditing ? (
                  <input type="number" value={formData.contractCapacity || 0} onChange={e => handleChange('contractCapacity', Number(e.target.value))} className="text-sm border rounded px-1 w-20 text-right" />
              ) : (
                  <span className="font-medium text-gray-800">{bill.contractCapacity ? `${bill.contractCapacity} kW` : '--'}</span>
              )}
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">經常最高需量</span>
              {isEditing ? (
                  <input type="number" value={formData.maxDemand || 0} onChange={e => handleChange('maxDemand', Number(e.target.value))} className="text-sm border rounded px-1 w-20 text-right" />
              ) : (
                  <span className="font-medium text-gray-800">{bill.maxDemand ? `${bill.maxDemand} kW` : '--'}</span>
              )}
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">功率因數</span>
              {isEditing ? (
                  <input type="number" value={formData.powerFactor || 0} onChange={e => handleChange('powerFactor', Number(e.target.value))} className="text-sm border rounded px-1 w-20 text-right" />
              ) : (
                  <span className="font-medium text-gray-800">{bill.powerFactor ? `${bill.powerFactor}%` : '--'}</span>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 pb-2 border-b border-gray-100 mb-2 mt-2">
              <h4 className="text-sm font-bold text-gray-500 uppercase">指數與計算</h4>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">本期指數 (底度)</span>
              {isEditing ? (
                  <input type="number" value={formData.currentReading || 0} onChange={e => handleChange('currentReading', Number(e.target.value))} className="text-sm border rounded px-1 w-24 text-right" />
              ) : (
                  <span className="font-medium text-gray-800">{bill.currentReading?.toLocaleString() ?? '--'}</span>
              )}
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">上期指數</span>
              {isEditing ? (
                  <input type="number" value={formData.lastReading || 0} onChange={e => handleChange('lastReading', Number(e.target.value))} className="text-sm border rounded px-1 w-24 text-right" />
              ) : (
                  <span className="font-medium text-gray-800">{bill.lastReading?.toLocaleString() ?? '--'}</span>
              )}
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">用電種類</span>
               {isEditing ? (
                  <input type="text" value={formData.usageCategory || ''} onChange={e => handleChange('usageCategory', e.target.value)} className="text-sm border rounded px-1 w-24 text-right" />
              ) : (
                  <span className="font-medium text-gray-800">{bill.usageCategory ?? '--'}</span>
              )}
            </div>
             <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">計算度數</span>
              <span className="font-medium text-gray-800">
                {/* Just display calculated value, not editable directly as it comes from diff */}
                {formData.currentReading && formData.lastReading
                  ? ((formData.currentReading - formData.lastReading) * (Number(formData.usageCategory === 'C5' ? 40 : 1))).toLocaleString()
                  : '--'
                }
              </span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              關閉視窗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};