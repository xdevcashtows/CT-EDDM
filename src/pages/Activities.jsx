import React, { useState, useEffect } from 'react';
import { 
  Plus, Info, List, Calendar, Filter, MoreVertical,
  Phone, Users, Clock, Flag, Mail, UtensilsCrossed,
  Settings, ChevronDown
} from 'lucide-react';
import './Activities.css';
import { useAuth } from '../hooks/useAuth';
import PageLayout from '../components/PageLayout';
import CalendarWeekView from '../components/activities/CalendarWeekView';
import CalendarMonthView from '../components/activities/CalendarMonthView';
import ScheduleActivityModal from '../components/activities/ScheduleActivityModal';

function Activities() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'week', 'month'
  const [calendarMode, setCalendarMode] = useState('week'); // 'week' or 'month'
  const [activityType, setActivityType] = useState('all');
  const [timeFilter, setTimeFilter] = useState('todo');
  const [selectedActivities, setSelectedActivities] = useState(new Set());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalDate, setScheduleModalDate] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Mock data - replace with actual API call
  const [activities, setActivities] = useState([
    {
      id: 1,
      done: false,
      subject: '[Sample] Context call',
      deal: '[Sample] Tony Turner',
      priority: null,
      contactPerson: '[Sample] Tony Turner',
      email: 'tony.turner@moveer.com (Work)',
      phone: '218-348-8528',
      organization: '[Sample] MoveEr',
      dueDate: 'December 1',
      duration: null,
      type: 'call',
      startDate: null,
      endDate: null
    }
  ]);

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user]);

  const loadActivities = async () => {
    setLoading(true);
    // TODO: Load activities from API
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedActivities(new Set(activities.map(a => a.id)));
    } else {
      setSelectedActivities(new Set());
    }
  };

  const handleToggleActivity = (id) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedActivities(newSelected);
  };

  const handleToggleDone = (id) => {
    // TODO: Update activity done status
    console.log('Toggle done for activity:', id);
  };

  const allSelected = activities.length > 0 && selectedActivities.size === activities.length;
  const someSelected = selectedActivities.size > 0 && selectedActivities.size < activities.length;

  return (
    <PageLayout
      title="Activities"
      subtitle="Manage your contact activities and follow-ups."
      className="page-shell--fullwidth"
      actions={
        <button 
          className="activities-header-add-button"
          onClick={() => {
            setScheduleModalDate(new Date());
            setShowScheduleModal(true);
          }}
        >
          <Plus size={18} />
          Add Activity
        </button>
      }
    >
      <div className="activities-page">

      {/* Secondary Control Bar */}
      <div className="activities-control-bar">
        <div className="activities-control-left">
          <div className="activities-view-toggles">
            <button
              className={`activities-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
            <button
              className={`activities-view-toggle ${viewMode === 'week' || viewMode === 'month' ? 'active' : ''}`}
              onClick={() => {
                if (viewMode === 'list') {
                  setViewMode('week');
                } else if (viewMode === 'week') {
                  setViewMode('month');
                } else {
                  setViewMode('week');
                }
              }}
            >
              <Calendar size={18} />
            </button>
            <div className="activities-add-button-wrapper">
              <button 
                className="activities-add-button"
                onClick={() => {
                  setScheduleModalDate(new Date());
                  setShowScheduleModal(true);
                }}
              >
                <Plus size={16} />
                Activity
              </button>
              <div className="new-feature-dot"></div>
            </div>
          </div>
          <select className="activities-dropdown">
            <option>Meeting scheduler</option>
          </select>
          {(viewMode === 'week' || viewMode === 'month') && (
            <div className="activities-date-range">
              {viewMode === 'week' ? (
                <span>{getWeekRange(currentWeek)}</span>
              ) : (
                <span>{getMonthRange(currentMonth)}</span>
              )}
              <ChevronDown size={16} />
            </div>
          )}
          {viewMode === 'list' && (
            <div className="activities-count">
              <span>{activities.length} activity</span>
              <Info size={14} className="activities-count-icon" />
            </div>
          )}
          <button className="activities-sync-button">
            SYNC INACTIVE
          </button>
          <button className="activities-filter-button">
            <Filter size={16} />
            Filter
          </button>
          <button className="activities-icon-button">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Activity Type Filters */}
      <div className="activities-type-filters">
        <button
          className={`activities-type-filter ${activityType === 'all' ? 'active' : ''}`}
          onClick={() => setActivityType('all')}
        >
          All
        </button>
        <button
          className={`activities-type-filter ${activityType === 'call' ? 'active' : ''}`}
          onClick={() => setActivityType('call')}
        >
          <Phone size={16} />
          Call
        </button>
        <button
          className={`activities-type-filter ${activityType === 'meeting' ? 'active' : ''}`}
          onClick={() => setActivityType('meeting')}
        >
          <Users size={16} />
          Meeting
        </button>
        <button
          className={`activities-type-filter ${activityType === 'task' ? 'active' : ''}`}
          onClick={() => setActivityType('task')}
        >
          <Clock size={16} />
          Task
        </button>
        <button
          className={`activities-type-filter ${activityType === 'deadline' ? 'active' : ''}`}
          onClick={() => setActivityType('deadline')}
        >
          <Flag size={16} />
          Deadline
        </button>
        <button
          className={`activities-type-filter ${activityType === 'email' ? 'active' : ''}`}
          onClick={() => setActivityType('email')}
        >
          <Mail size={16} />
          Email
        </button>
        <button
          className={`activities-type-filter ${activityType === 'lunch' ? 'active' : ''}`}
          onClick={() => setActivityType('lunch')}
        >
          <UtensilsCrossed size={16} />
          Lunch
        </button>
      </div>

      {/* Status/Time Filters */}
      <div className="activities-time-filters">
        <button
          className={`activities-time-filter ${timeFilter === 'todo' ? 'active' : ''}`}
          onClick={() => setTimeFilter('todo')}
        >
          To-do
        </button>
        <button
          className={`activities-time-filter ${timeFilter === 'overdue' ? 'active' : ''}`}
          onClick={() => setTimeFilter('overdue')}
        >
          Overdue
        </button>
        <button
          className={`activities-time-filter ${timeFilter === 'today' ? 'active' : ''}`}
          onClick={() => setTimeFilter('today')}
        >
          Today
        </button>
        <button
          className={`activities-time-filter ${timeFilter === 'tomorrow' ? 'active' : ''}`}
          onClick={() => setTimeFilter('tomorrow')}
        >
          Tomorrow
        </button>
        <button
          className={`activities-time-filter ${timeFilter === 'this-week' ? 'active' : ''}`}
          onClick={() => setTimeFilter('this-week')}
        >
          This week
        </button>
        <button
          className={`activities-time-filter ${timeFilter === 'next-week' ? 'active' : ''}`}
          onClick={() => setTimeFilter('next-week')}
        >
          Next week
        </button>
        <button
          className={`activities-time-filter ${timeFilter === 'select-period' ? 'active' : ''}`}
          onClick={() => setTimeFilter('select-period')}
        >
          Select period
        </button>
      </div>

      {/* Content Area */}
      {viewMode === 'list' && (
        <div className="activities-table-container">
          {loading ? (
            <div className="activities-loading">
              <p>Loading activities...</p>
            </div>
          ) : (
            <table className="activities-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>Done</th>
                  <th>Subject</th>
                  <th>Deal</th>
                  <th>Priority</th>
                  <th>Contact person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Organization</th>
                  <th>Due date</th>
                  <th>Duration</th>
                  <th>
                    <Settings size={16} className="activities-table-settings" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr className="activities-empty-row">
                    <td colSpan="12" className="activities-empty-state">
                      No activities found. Create your first activity to get started.
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr
                      key={activity.id}
                      className={selectedActivities.has(activity.id) ? 'selected' : ''}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedActivities.has(activity.id)}
                          onChange={() => handleToggleActivity(activity.id)}
                        />
                      </td>
                      <td>
                        <input
                          type="radio"
                          checked={activity.done}
                          onChange={() => handleToggleDone(activity.id)}
                          className="activities-done-radio"
                        />
                      </td>
                      <td>
                        <div className="activities-subject">
                          {activity.type === 'call' && <Phone size={16} className="activities-type-icon" />}
                          {activity.type === 'meeting' && <Users size={16} className="activities-type-icon" />}
                          {activity.type === 'task' && <Clock size={16} className="activities-type-icon" />}
                          {activity.type === 'deadline' && <Flag size={16} className="activities-type-icon" />}
                          {activity.type === 'email' && <Mail size={16} className="activities-type-icon" />}
                          {activity.type === 'lunch' && <UtensilsCrossed size={16} className="activities-type-icon" />}
                          <span>{activity.subject}</span>
                        </div>
                      </td>
                      <td>{activity.deal}</td>
                      <td>{activity.priority || '-'}</td>
                      <td>
                        <button className="activities-contact-button">
                          {activity.contactPerson}
                        </button>
                      </td>
                      <td>
                        <button className="activities-contact-button">
                          {activity.email}
                        </button>
                      </td>
                      <td>{activity.phone}</td>
                      <td>{activity.organization}</td>
                      <td>{activity.dueDate}</td>
                      <td>{activity.duration || '-'}</td>
                      <td></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {viewMode === 'week' && (
        <div className="activities-calendar-container">
          <CalendarWeekView
            currentWeek={currentWeek}
            onWeekChange={(direction) => {
              const newWeek = new Date(currentWeek);
              newWeek.setDate(newWeek.getDate() + (direction * 7));
              setCurrentWeek(newWeek);
            }}
            onTodayClick={() => {
              const today = new Date();
              setCurrentWeek(today);
            }}
            activities={activities.filter(a => a.startDate && a.endDate)}
            onSlotClick={(date) => {
              setScheduleModalDate(date);
              setShowScheduleModal(true);
            }}
          />
        </div>
      )}

      {viewMode === 'month' && (
        <div className="activities-calendar-container">
          <CalendarMonthView
            currentMonth={currentMonth}
            onMonthChange={(direction) => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() + direction);
              setCurrentMonth(newMonth);
            }}
            onTodayClick={() => {
              const today = new Date();
              setCurrentMonth(today);
            }}
            activities={activities.filter(a => a.startDate && a.endDate)}
            onSlotClick={(date) => {
              setScheduleModalDate(date);
              setShowScheduleModal(true);
            }}
          />
        </div>
      )}

      {showScheduleModal && (
        <ScheduleActivityModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          initialDate={scheduleModalDate}
          onSave={(activity) => {
            const newActivity = {
              ...activity,
              id: Date.now(),
              done: activity.done || false,
              type: activity.type || 'call',
              contactPerson: activity.people || '',
              email: '',
              phone: '',
              organization: activity.organization || '',
              deal: activity.deal || '',
              dueDate: formatDateDisplay(activity.startDate),
              duration: calculateDuration(activity.startDate, activity.endDate)
            };
            setActivities([...activities, newActivity]);
          }}
        />
      )}
      </div>
    </PageLayout>
  );
}

function getWeekRange(date) {
  if (!date) return '';
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  const startMonth = start.toLocaleString('default', { month: 'short' });
  const endMonth = end.toLocaleString('default', { month: 'short' });
  const year = start.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
}

function getMonthRange(date) {
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

function formatDateDisplay(date) {
  if (!date) return '';
  return date.toLocaleString('default', { month: 'long', day: 'numeric' });
}

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const diff = endDate.getTime() - startDate.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default Activities;
