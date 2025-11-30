import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarWeekView.css';

function CalendarWeekView({ 
  currentWeek, 
  onWeekChange, 
  onTodayClick,
  activities = [],
  onSlotClick 
}) {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(i);
  }

  const days = [];
  // Calculate the start of the week (Sunday)
  const weekStart = new Date(currentWeek);
  weekStart.setDate(currentWeek.getDate() - currentWeek.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    days.push(date);
  }

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${date.getDate()}`;
  };

  const formatTime = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getActivitiesForSlot = (day, hour) => {
    return activities.filter(activity => {
      if (!activity.startDate || !activity.endDate) return false;
      const start = new Date(activity.startDate);
      const end = new Date(activity.endDate);
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return start < slotEnd && end > slotStart;
    });
  };

  const handleSlotClick = (day, hour) => {
    if (onSlotClick) {
      const date = new Date(day);
      date.setHours(hour, 0, 0, 0);
      onSlotClick(date);
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getWeekRange = () => {
    if (days.length === 0) return '';
    const start = days[0];
    const end = days[6];
    const startMonth = start.toLocaleString('default', { month: 'short' });
    const endMonth = end.toLocaleString('default', { month: 'short' });
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  };

  return (
    <div className="calendar-week-view">
      <div className="calendar-week-header">
        <div className="calendar-week-nav">
          <button onClick={() => onWeekChange(-1)} className="calendar-nav-button">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onTodayClick} className="calendar-today-button">
            Today
          </button>
          <button onClick={() => onWeekChange(1)} className="calendar-nav-button">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-week-range">
          {getWeekRange()}
        </div>
      </div>
      
      <div className="calendar-week-grid">
        <div className="calendar-time-column">
          <div className="calendar-time-header"></div>
          {hours.map(hour => (
            <div key={hour} className="calendar-time-slot">
              {formatTime(hour)}
            </div>
          ))}
        </div>
        
        <div className="calendar-days-container">
          <div className="calendar-days-header">
            {days.map((day, idx) => (
              <div 
                key={idx} 
                className={`calendar-day-header ${isToday(day) ? 'today' : ''}`}
              >
                {formatDate(day)}
              </div>
            ))}
          </div>
          
          <div className="calendar-days-grid">
            {days.map((day, dayIdx) => (
              <div key={dayIdx} className="calendar-day-column">
                {hours.map((hour, hourIdx) => {
                  const slotActivities = getActivitiesForSlot(day, hour);
                  return (
                    <div
                      key={hourIdx}
                      className="calendar-slot"
                      onClick={() => handleSlotClick(day, hour)}
                    >
                      {slotActivities.map((activity, actIdx) => (
                        <div
                          key={actIdx}
                          className="calendar-activity-block"
                          style={{
                            backgroundColor: getActivityColor(activity.type)
                          }}
                        >
                          <div className="activity-block-title">{activity.subject}</div>
                          <div className="activity-block-time">
                            {formatActivityTime(activity.startDate, activity.endDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getActivityColor(type) {
  const colors = {
    call: '#3b82f6',
    meeting: '#10b981',
    task: '#f59e0b',
    deadline: '#ef4444',
    email: '#8b5cf6',
    lunch: '#ec4899'
  };
  return colors[type] || '#64748b';
}

function formatActivityTime(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export default CalendarWeekView;

