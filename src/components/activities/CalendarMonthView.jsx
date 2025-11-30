import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarMonthView.css';

function CalendarMonthView({ currentMonth, onMonthChange, onTodayClick, activities = [], onSlotClick }) {
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    days.push(date);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getActivitiesForDay = (date) => {
    if (!date) return [];
    return activities.filter(activity => {
      if (!activity.startDate) return false;
      const activityDate = new Date(activity.startDate);
      return activityDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDayClick = (date) => {
    if (date && onSlotClick) {
      onSlotClick(date);
    }
  };

  const formatMonthYear = () => {
    return `${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="calendar-month-view">
      <div className="calendar-month-header">
        <div className="calendar-month-nav">
          <button onClick={() => onMonthChange(-1)} className="calendar-nav-button">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onTodayClick} className="calendar-today-button">
            Today
          </button>
          <button onClick={() => onMonthChange(1)} className="calendar-nav-button">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-month-title">
          {formatMonthYear()}
        </div>
      </div>

      <div className="calendar-month-grid">
        <div className="calendar-month-weekdays">
          {weekDays.map(day => (
            <div key={day} className="calendar-weekday-header">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-month-days">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="calendar-month-week">
              {week.map((date, dayIdx) => {
                const dayActivities = getActivitiesForDay(date);
                return (
                  <div
                    key={dayIdx}
                    className={`calendar-month-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''}`}
                    onClick={() => handleDayClick(date)}
                  >
                    {date && (
                      <>
                        <div className="calendar-day-number">{date.getDate()}</div>
                        <div className="calendar-day-activities">
                          {dayActivities.slice(0, 3).map((activity, idx) => (
                            <div
                              key={idx}
                              className="calendar-day-activity"
                              style={{
                                backgroundColor: getActivityColor(activity.type)
                              }}
                            >
                              {activity.subject}
                            </div>
                          ))}
                          {dayActivities.length > 3 && (
                            <div className="calendar-day-more">
                              +{dayActivities.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
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

export default CalendarMonthView;

