
import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { BillData, ChartType } from '../types';
import { COLORS, TOTAL_HOUSEHOLDS } from '../constants';

interface ChartsProps {
  data: BillData[];
  type: ChartType;
}

// Year Color Palette (Updated for high quality contrast) - keys are ROC years
const YEAR_PALETTE: Record<number, { bar: string, line: string }> = {
  113: { bar: '#64748b', line: '#f59e0b' }, // 2024: Slate 500 & Amber 500
  114: { bar: '#3b82f6', line: '#ec4899' }, // 2025: Blue 500 & Pink 500
  115: { bar: '#10b981', line: '#8b5cf6' }, // 2026: Emerald 500 & Violet 500
  116: { bar: '#f97316', line: '#06b6d4' }, // 2027: Orange 500 & Cyan 500
};
const getYearPalette = (rocYear: number) => YEAR_PALETTE[rocYear] || { bar: '#9ca3af', line: '#4b5563' };

const CustomTooltip = ({ active, payload, label, globalMaxAmount, globalMaxUsage }: any) => {
  if (active && payload && payload.length) {
    // Check if any payload value matches the record high
    const isRecordHigh = payload.some((p: any) => {
      if ((p.name.includes('金額') || p.dataKey?.toString().includes('amount')) && p.value === globalMaxAmount) return true;
      if ((p.name.includes('度數') || p.dataKey?.toString().includes('usage')) && p.value === globalMaxUsage) return true;
      return false;
    });

    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-lg text-sm">
        <p className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          {label}
          {isRecordHigh && <span className="text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">⚠️ 歷年新高</span>}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-mono font-medium">
              {entry.name.includes('金額') || entry.name.includes('費用') ? '$' : ''}
              {entry.value.toLocaleString()}
              {entry.name.includes('度數') ? ' 度' : ''}
              {entry.name.includes('費用') ? ' 元' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AppCharts: React.FC<ChartsProps> = ({ data, type }) => {
  // Sort data chronologically
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const valA = Number(a.rocYear) * 12 + Number(a.month);
      const valB = Number(b.rocYear) * 12 + Number(b.month);
      return valA - valB;
    });
  }, [data]);

  // Determine All-Time Highs for highlighting
  const { maxAmount, maxUsage } = useMemo(() => {
    if (data.length === 0) return { maxAmount: 0, maxUsage: 0 };
    return {
      maxAmount: Math.max(...data.map(d => d.amount)),
      maxUsage: Math.max(...data.map(d => d.usage))
    };
  }, [data]);

  // Extract available years for the dropdown (keep ROC internally, display AD)
  const availableRocYears = useMemo(() => {
    const years = new Set(data.map(d => Number(d.rocYear)));
    return Array.from(years).sort((a: number, b: number) => b - a); // Descending
  }, [data]);

  // State for selected year in Overview (default to latest year if available)
  const [selectedRocYear, setSelectedRocYear] = useState<number | 'ALL'>(
    availableRocYears.length > 0 ? availableRocYears[0] : 'ALL'
  );

  // State for selected year in Household Share chart
  const [selectedRocYearHousehold, setSelectedRocYearHousehold] = useState<number | 'ALL'>(
    availableRocYears.length > 0 ? availableRocYears[0] : 'ALL'
  );

  // Update default selected year when data changes
  React.useEffect(() => {
    if (availableRocYears.length > 0 && selectedRocYear === 'ALL' && availableRocYears.length === 1) {
       setSelectedRocYear(availableRocYears[0]);
    }
     if (availableRocYears.length > 0 && selectedRocYearHousehold === 'ALL' && availableRocYears.length === 1) {
       setSelectedRocYearHousehold(availableRocYears[0]);
    }
  }, [availableRocYears]);


  // Prepare data for Overview Chart based on selection
  const overviewChartData = useMemo(() => {
    if (selectedRocYear !== 'ALL') {
      // Single Year: Show chronological sequence
      return sortedData
        .filter(d => d.rocYear === selectedRocYear)
        .map(d => ({
          name: `${String(d.month).padStart(2, '0')}月`,
          displayName: `${d.rocYear + 1911}/${String(d.month).padStart(2, '0')}`,
          amount: d.amount,
          usage: d.usage,
          year: d.rocYear,
          month: d.month
        }));
    } else {
      // All Years: Comparison mode (1-12 months)
      return Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const dataPoint: any = { name: `${String(month).padStart(2, '0')}月` };
        
        availableRocYears.forEach(year => {
           const bill = sortedData.find(d => d.rocYear === year && d.month === month);
           if (bill) {
             dataPoint[`amount_${year}`] = bill.amount;
             dataPoint[`usage_${year}`] = bill.usage;
           }
        });
        return dataPoint;
      });
    }
  }, [sortedData, selectedRocYear, availableRocYears]);

  // Household Share Data with filtering
  const householdShareData = useMemo(() => {
    let filtered = sortedData;
    if (selectedRocYearHousehold !== 'ALL') {
      filtered = sortedData.filter(d => d.rocYear === selectedRocYearHousehold);
    }
    return filtered.map(d => ({
      name: selectedRocYearHousehold === 'ALL'
          ? `${d.rocYear + 1911}/${String(d.month).padStart(2, '0')}`
          : `${String(d.month).padStart(2, '0')}月`,
      shareAmount: Math.round(d.amount / TOTAL_HOUSEHOLDS),
      totalAmount: d.amount
    }));
  }, [sortedData, selectedRocYearHousehold]);


  // Logic for Year-over-Year comparison (Cost Compare / Usage Compare Tabs)
  const comparisonData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const items = sortedData.filter(d => d.month === m);
      const maxRocYear = Math.max(...sortedData.map(d => Number(d.rocYear)));
      
      const currentYearItem = items.find(d => d.rocYear === maxRocYear);
      const lastYearItem = items.find(d => d.rocYear === maxRocYear - 1);

      return {
        name: `${m}月`,
        currentAmount: currentYearItem?.amount || null,
        lastAmount: lastYearItem?.amount || null,
        currentUsage: currentYearItem?.usage || null,
        lastUsage: lastYearItem?.usage || null,
        currentLabel: `${maxRocYear + 1911}年`,
        lastLabel: `${maxRocYear + 1911 - 1}年`,
      };
    });
  }, [sortedData]);


  if (type === ChartType.OVERVIEW) {
    return (
      <div className="w-full h-[450px] bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-700 flex items-center">
            <span className="w-2 h-6 bg-emerald-500 mr-2 rounded-full"></span>
            用電度數與帳單金額比較
          </h3>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">選擇年份:</label>
            <select 
              value={selectedRocYear} 
              onChange={(e) => setSelectedRocYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
            >
              <option value="ALL">全部年份 (比較)</option>
              {availableRocYears.map(year => (
                <option key={year} value={year}>{year + 1911} 年</option>
              ))}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={overviewChartData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke={COLORS.secondary}
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.secondary, fontSize: 12 }}
              tickFormatter={(value) => `$${value/1000}k`}
              label={{ value: '金額 (NT$)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke={COLORS.primary}
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.primary, fontSize: 12 }}
              label={{ value: '度數 (kWh)', angle: 90, position: 'insideRight', fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip globalMaxAmount={maxAmount} globalMaxUsage={maxUsage} />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            
            {selectedRocYear === 'ALL' ? (
              // Multi-Year View: Render bars and lines for each year with distinct palette
              availableRocYears.map((year) => {
                const palette = getYearPalette(year);
                return (
                  <React.Fragment key={year}>
                    <Bar 
                      dataKey={`amount_${year}`} 
                      name={`${year + 1911}年 金額`} 
                      yAxisId="left"
                      fill={palette.bar} 
                      barSize={12}
                      radius={[4, 4, 0, 0]} 
                    />
                    <Line 
                      dataKey={`usage_${year}`} 
                      name={`${year + 1911}年 度數`} 
                      yAxisId="right"
                      type="monotone" 
                      stroke={palette.line} 
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0, fill: palette.line }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </React.Fragment>
                );
              })
            ) : (
              // Single Year View
              <>
                <Bar 
                  yAxisId="left" 
                  dataKey="amount" 
                  name="帳單金額" 
                  barSize={30} 
                  fill={COLORS.secondary} 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="usage" 
                  name="用電度數" 
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === ChartType.HOUSEHOLD_SHARE) {
    return (
      <div className="w-full h-[450px] bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-700 flex items-center">
            <span className="w-2 h-6 bg-blue-500 mr-2 rounded-full"></span>
            每戶每期應分攤電費 (共{TOTAL_HOUSEHOLDS}戶)
          </h3>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">選擇年份:</label>
            <select 
              value={selectedRocYearHousehold} 
              onChange={(e) => setSelectedRocYearHousehold(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2"
            >
              <option value="ALL">全部年份</option>
              {availableRocYears.map(year => (
                <option key={year} value={year}>{year + 1911} 年</option>
              ))}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={householdShareData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              label={{ value: '分攤金額 (NT$)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar 
              dataKey="shareAmount" 
              name="每戶分攤費用" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]} 
              barSize={selectedRocYearHousehold === 'ALL' ? 10 : 30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === ChartType.COST_COMPARE) {
    const hasData = comparisonData.length > 0;
    const currentLabel = hasData ? comparisonData[0].currentLabel : '今年';
    const lastLabel = hasData ? comparisonData[0].lastLabel : '去年';

    return (
      <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
          <span className="w-2 h-6 bg-yellow-400 mr-2 rounded-full"></span>
          同期帳單金額比較 ({currentLabel} vs {lastLabel})
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => `$${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line 
              type="monotone" 
              dataKey="currentAmount" 
              name={currentLabel} 
              stroke={COLORS.secondary} 
              strokeWidth={3}
              dot={{ r: 4 }}
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="lastAmount" 
              name={lastLabel} 
              stroke={COLORS.primary} 
              strokeWidth={3}
              dot={{ r: 4 }}
              strokeDasharray="5 5"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Usage Comparison
  const hasData = comparisonData.length > 0;
  const currentLabel = hasData ? comparisonData[0].currentLabel : '今年';
  const lastLabel = hasData ? comparisonData[0].lastLabel : '去年';

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
        <span className="w-2 h-6 bg-emerald-600 mr-2 rounded-full"></span>
        同期用電度數比較 ({currentLabel} vs {lastLabel})
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f3f4f6" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Area 
            type="monotone" 
            dataKey="currentUsage" 
            name={currentLabel} 
            stroke={COLORS.primary} 
            fillOpacity={1} 
            fill="url(#colorCurrent)" 
            strokeWidth={3}
            connectNulls
          />
          <Area 
            type="monotone" 
            dataKey="lastUsage" 
            name={lastLabel} 
            stroke={COLORS.secondary} 
            fillOpacity={1} 
            fill="url(#colorLast)" 
            strokeWidth={3}
            strokeDasharray="5 5"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
