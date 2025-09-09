import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import './RoadmapVisualization.css';

interface RoadmapItem {
  id: string;
  epicId: string;
  epicName: string;
  epicDescription: string;
  priority: string;
  status: string;
  startDate: string;
  endDate: string;
  year: number;
  quarter: number;
  reach: number;
  impact: number;
  confidence: number;
  riceScore: number;
  effortRating?: number;
  themeName?: string;
  themeColor?: string;
  initiativeName?: string;
  track?: string;
}

interface GroupedData {
  [key: string]: {
    initiativeName: string;
    themeName: string;
    themeColor: string;
    items: RoadmapItem[];
  };
}



const RoadmapVisualization: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [selectedQuarterData, setSelectedQuarterData] = useState<RoadmapItem[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  useEffect(() => {
    if (product) {
      loadSelectedQuarterData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedYear, selectedQuarter]);


  const loadSelectedQuarterData = async () => {
    if (!product) return;
    
    try {
      const response = await fetch(
        `http://localhost:8080/api/v2/products/${product.productId}/roadmap/${selectedYear}/${selectedQuarter}?publishedOnly=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        try {
          const data = await response.json();
          const quarterItems = data.roadmapItems?.map((item: any) => {
            return {
              ...item,
              id: `${selectedYear}-${selectedQuarter}-${item.epicId}`,
              year: selectedYear,
              quarter: selectedQuarter
            };
          }) || [];
          
          setSelectedQuarterData(quarterItems);
        } catch (parseError) {
          // JSON parse error - treat as empty
          setSelectedQuarterData([]);
        }
      } else {
        // 404 or other error - treat as empty (don't show error)
        setSelectedQuarterData([]);
      }
      
    } catch (err: any) {
      // Network error - treat as empty (don't show error)
      setSelectedQuarterData([]);
    }
  };

  const getStatusColor = useCallback((status: string): string => {
    switch (status.toLowerCase()) {
      case 'proposed': return '#7f8c8d';
      case 'committed': return '#3498db';
      case 'to-do': return '#9b59b6';
      case 'in-progress': return '#f1c40f';
      case 'done': return '#2ecc71';
      default: return '#95a5a6';
    }
  }, []);



  const filteredGanttData = selectedQuarterData;


  // Helper function to calculate position and width for Gantt bars
  const calculateGanttBar = useCallback((item: RoadmapItem) => {
    const quarterStartMonth = (selectedQuarter - 1) * 3;
    const quarterStart = new Date(selectedYear, quarterStartMonth, 1);
    const quarterEnd = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59, 999); // Last moment of quarter
    
    const quarterStartTime = quarterStart.getTime();
    const quarterEndTime = quarterEnd.getTime();
    const quarterDuration = quarterEndTime - quarterStartTime;

    let itemStartTime = quarterStartTime;
    let itemEndTime = quarterEndTime;

    if (item.startDate && item.endDate) {
      // Parse dates as local dates
      const [startYear, startMonth, startDay] = item.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = item.endDate.split('-').map(Number);
      
      // Create date objects - start of start day, end of end day
      const itemStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const itemEndDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
      
      itemStartTime = itemStartDate.getTime();
      itemEndTime = itemEndDate.getTime();
      
      // Clamp to quarter boundaries
      itemStartTime = Math.max(itemStartTime, quarterStartTime);
      itemEndTime = Math.min(itemEndTime, quarterEndTime);
      
      // If item is completely outside quarter, hide it
      if (itemEndTime < quarterStartTime || itemStartTime > quarterEndTime) {
        return {
          left: '0%',
          width: '0%'
        };
      }
    }

    // Calculate position as percentage of quarter
    const leftPercent = ((itemStartTime - quarterStartTime) / quarterDuration) * 100;
    const widthPercent = ((itemEndTime - itemStartTime) / quarterDuration) * 100;

    return {
      left: `${Math.max(leftPercent, 0)}%`,
      width: `${Math.max(widthPercent, 2)}%` // Minimum 2% width for visibility
    };
  }, [selectedYear, selectedQuarter]);

  if (productLoading) {
    return (
      <div className="roadmap-viz-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading roadmap visualization...</p>
        </div>
      </div>
    );
  }

  if (error || productError) {
    return (
      <div className="roadmap-viz-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || productError}</p>
          <div className="error-actions">
            <button onClick={() => setError('')} className="roadmap-viz-btn roadmap-viz-btn-secondary">
              <span className="material-icons">refresh</span>
              Try Again
            </button>
            <button onClick={() => navigate(`/products/${productSlug}/modules`)} className="roadmap-viz-btn roadmap-viz-btn-primary">
              <span className="material-icons">arrow_back</span>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="roadmap-viz-container">
      <div className="roadmap-viz-page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button 
              onClick={() => navigate(`/products/${productSlug}/modules`)} 
              className="back-button"
              aria-label="Back to modules"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="roadmap-viz-page-title">Roadmap Visualization</h1>
          </div>
          
          <div className="quarter-selectors">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="quarter-select"
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="quarter-select"
            >
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          </div>
        </div>
      </div>

      <div className="roadmap-content">
        <div className="gantt-view">
          <div className="gantt-header">
            <div className="gantt-header-title">
              <div className="gantt-header-bar"></div>
              <h3>Q{selectedQuarter} {selectedYear} Roadmap</h3>
            </div>
            <span className="gantt-item-count">{filteredGanttData.length} items</span>
          </div>
          
          {filteredGanttData.length === 0 ? (
            <div className="empty-gantt">
              <span className="material-icons">event_busy</span>
              <p>No items planned for Q{selectedQuarter} {selectedYear}</p>
            </div>
          ) : (
            <div className="gantt-chart">
              {(() => {
                const months = [];
                
                // Calculate the 3 months for the selected quarter
                for (let i = 0; i < 3; i++) {
                  const monthIndex = (selectedQuarter - 1) * 3 + i;
                  const monthDate = new Date(selectedYear, monthIndex, 1);
                  const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
                  
                  months.push({
                    name: monthDate.toLocaleDateString('en-US', { month: 'short' }),
                    days: daysInMonth,
                    monthIndex: monthIndex
                  });
                }
                
                const totalDays = months.reduce((sum, month) => sum + month.days, 0);
                
                // Group items by initiative and theme
                const groupedItems: GroupedData = filteredGanttData.reduce((groups: GroupedData, item) => {
                  const initiativeName = item.initiativeName || 'Other';
                  const themeName = item.themeName || 'Other';
                  const groupKey = `${initiativeName}|${themeName}`;
                  
                  if (!groups[groupKey]) {
                    groups[groupKey] = {
                      initiativeName,
                      themeName,
                      themeColor: item.themeColor || '#95a5a6', // Use gray as fallback
                      items: []
                    };
                  } else if (item.themeColor && !groups[groupKey].themeColor) {
                    // Update theme color if current group doesn't have one but this item does
                    groups[groupKey].themeColor = item.themeColor;
                  }
                  
                  groups[groupKey].items.push(item);
                  return groups;
                }, {});

                // Sort groups by initiative name first, then by theme name
                const sortedGroupEntries = Object.entries(groupedItems).sort(([keyA, groupA], [keyB, groupB]) => {
                  // First sort by initiative name
                  if (groupA.initiativeName !== groupB.initiativeName) {
                    return groupA.initiativeName.localeCompare(groupB.initiativeName);
                  }
                  // Then sort by theme name within the same initiative
                  return groupA.themeName.localeCompare(groupB.themeName);
                });

                return (
                  <>
                    <div className="gantt-grid">
                      <div className="gantt-header-row">
                        <div className="gantt-header-initiative">Initiative</div>
                        <div className="gantt-header-theme">Theme</div>
                        <div className="gantt-header-task">Epic</div>
                        <div className="gantt-header-timeline">
                          {months.map((month, index) => (
                            <div 
                              key={index} 
                              className="gantt-month-header" 
                              style={{ width: `${(month.days / totalDays) * 100}%` }}
                            >
                              {month.name} {selectedYear}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="gantt-items">
                        {sortedGroupEntries.map(([groupKey, group], groupIndex) => {
                          // Check if this is the first occurrence of this initiative
                          const isFirstInitiativeGroup = groupIndex === 0 || 
                            sortedGroupEntries[groupIndex - 1][1].initiativeName !== group.initiativeName;
                          
                          return (
                            <div key={groupKey} className={`gantt-group ${isFirstInitiativeGroup ? 'new-initiative' : ''}`}>
                              {group.items.map((item: RoadmapItem, index: number) => {
                                const barStyle = calculateGanttBar(item);
                                const isFirstInGroup = index === 0;
                                const isLastInGroup = index === group.items.length - 1;
                                
                                return (
                                  <div key={item.id} className={`gantt-item-row ${isFirstInGroup ? 'first-in-group' : ''} ${isLastInGroup ? 'last-in-group' : ''}`}>
                                    <div className="gantt-item-initiative">
                                      {isFirstInGroup && isFirstInitiativeGroup && (
                                        <span className="gantt-item-text group-label">
                                          {group.initiativeName}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="gantt-item-theme">
                                      {isFirstInGroup && (
                                        <div className="gantt-theme-content group-label">
                                          {group.themeColor && (
                                            <div 
                                              className="theme-indicator-small" 
                                              style={{ backgroundColor: group.themeColor }}
                                            ></div>
                                          )}
                                          <span className="gantt-item-text">{group.themeName}</span>
                                        </div>
                                      )}
                                    </div>
                                  
                                  <div className="gantt-item-task">
                                    <div className="gantt-item-name">{item.epicName}</div>
                                  </div>
                                  
                                  <div className="gantt-item-timeline">
                                    <div 
                                      className="gantt-bar"
                                      style={{
                                        ...barStyle,
                                        '--theme-color': item.themeColor || group.themeColor || getStatusColor(item.status),
                                        backgroundColor: item.themeColor || group.themeColor || getStatusColor(item.status)
                                      } as React.CSSProperties}
                                    >
                                      <div className="gantt-bar-content">
                                        {item.startDate && item.endDate && (
                                          <span className="gantt-bar-dates">
                                            {(() => {
                                              const [sy, sm, sd] = item.startDate.split('-').map(Number);
                                              const [ey, em, ed] = item.endDate.split('-').map(Number);
                                              const startDate = new Date(sy, sm - 1, sd);
                                              const endDate = new Date(ey, em - 1, ed);
                                              return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                            })()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(RoadmapVisualization);