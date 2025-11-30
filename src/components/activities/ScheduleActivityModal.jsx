import React, { useState, useEffect } from 'react';
import {
  X, Phone, Users, Clock, Flag, Mail, UtensilsCrossed,
  Calendar as CalendarIcon, MoreVertical, Link2, User, Building2,
  FileText, Settings, Copy, ChevronLeft, ChevronRight
} from 'lucide-react';
import './ScheduleActivityModal.css';
import CalendarWeekView from './CalendarWeekView';

function ScheduleActivityModal({ isOpen, onClose, initialDate, onSave }) {
  const [subject, setSubject] = useState('Call');
  const [activityType, setActivityType] = useState('call');
  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [endDate, setEndDate] = useState(initialDate ? new Date(initialDate.getTime() + 30 * 60000) : new Date(Date.now() + 30 * 60000));
  const [startTime, setStartTime] = useState(formatTimeForInput(startDate));
  const [endTime, setEndTime] = useState(formatTimeForInput(endDate));
  const [priority, setPriority] = useState('');
  const [availability, setAvailability] = useState('busy');
  const [notes, setNotes] = useState('');
  const [assignedUser, setAssignedUser] = useState('frank');
  const [deal, setDeal] = useState('');
  const [people, setPeople] = useState('');
  const [organization, setOrganization] = useState('');
  const [markAsDone, setMarkAsDone] = useState(false);
  const [calendarDate, setCalendarDate] = useState(initialDate || new Date());

  useEffect(() => {
    if (initialDate) {
      const date = new Date(initialDate);
      setStartDate(date);
      setEndDate(new Date(date.getTime() + 30 * 60000));
      setStartTime(formatTimeForInput(date));
      setEndTime(formatTimeForInput(new Date(date.getTime() + 30 * 60000)));
      setCalendarDate(date);
    }
  }, [initialDate]);

  function formatTimeForInput(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  function parseTimeInput(timeStr) {
    const [time, ampm] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (ampm === 'PM' && hours !== 12) hour24 = hours + 12;
    if (ampm === 'AM' && hours === 12) hour24 = 0;
    return { hours: hour24, minutes };
  }

  const handleStartTimeChange = (e) => {
    setStartTime(e.target.value);
    const { hours, minutes } = parseTimeInput(e.target.value);
    const newStartDate = new Date(startDate);
    newStartDate.setHours(hours, minutes, 0, 0);
    setStartDate(newStartDate);
    
    // Update end time if start time is after end time
    if (newStartDate >= endDate) {
      const newEndDate = new Date(newStartDate.getTime() + 30 * 60000);
      setEndDate(newEndDate);
      setEndTime(formatTimeForInput(newEndDate));
    }
  };

  const handleEndTimeChange = (e) => {
    setEndTime(e.target.value);
    const { hours, minutes } = parseTimeInput(e.target.value);
    const newEndDate = new Date(endDate);
    newEndDate.setHours(hours, minutes, 0, 0);
    setEndDate(newEndDate);
  };

  const handleDateChange = (date) => {
    const newStartDate = new Date(date);
    const currentStartTime = startDate.getHours() * 60 + startDate.getMinutes();
    newStartDate.setHours(Math.floor(currentStartTime / 60), currentStartTime % 60, 0, 0);
    setStartDate(newStartDate);
    
    const duration = endDate.getTime() - startDate.getTime();
    const newEndDate = new Date(newStartDate.getTime() + duration);
    setEndDate(newEndDate);
    setStartTime(formatTimeForInput(newStartDate));
    setEndTime(formatTimeForInput(newEndDate));
  };

  const handleCalendarSlotClick = (date) => {
    setStartDate(date);
    setCalendarDate(date);
    const newEndDate = new Date(date.getTime() + 30 * 60000);
    setEndDate(newEndDate);
    setStartTime(formatTimeForInput(date));
    setEndTime(formatTimeForInput(newEndDate));
  };

  const handleSave = () => {
    const activity = {
      subject,
      type: activityType,
      startDate,
      endDate,
      priority,
      availability,
      notes,
      assignedUser,
      deal,
      people,
      organization,
      done: markAsDone
    };
    
    if (onSave) {
      onSave(activity);
    }
    onClose();
  };

  const activityTypes = [
    { id: 'call', icon: Phone, label: 'Call' },
    { id: 'meeting', icon: Users, label: 'Meeting' },
    { id: 'task', icon: Clock, label: 'Task' },
    { id: 'deadline', icon: Flag, label: 'Deadline' },
    { id: 'email', icon: Mail, label: 'Email' },
    { id: 'lunch', icon: UtensilsCrossed, label: 'Lunch' }
  ];

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const monthName = date.toLocaleString('default', { month: 'short' });
    return `${monthName} ${day}, ${year}`;
  };

  const formatCalendarDate = (date) => {
    return date.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (!isOpen) return null;

  const SelectedIcon = activityTypes.find(t => t.id === activityType)?.icon || Phone;

  return (
    <div className="schedule-modal-backdrop" onClick={onClose}>
      <div className="schedule-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="schedule-modal-content">
          <div className="schedule-modal-left">
            <div className="schedule-modal-header">
              <h2>Schedule an activity</h2>
              <button onClick={onClose} className="schedule-modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="schedule-form">
              <div className="schedule-form-group">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="schedule-subject-input"
                  placeholder="Activity subject"
                />
                <div className="schedule-activity-types">
                  {activityTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        className={`schedule-type-button ${activityType === type.id ? 'active' : ''}`}
                        onClick={() => {
                          setActivityType(type.id);
                          if (!subject || subject === 'Call') {
                            setSubject(type.label);
                          }
                        }}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="schedule-form-row">
                <CalendarIcon size={18} className="schedule-form-icon" />
                <div className="schedule-date-time-group">
                  <input
                    type="text"
                    value={formatDateForInput(startDate)}
                    readOnly
                    className="schedule-date-input"
                  />
                  <input
                    type="text"
                    value={startTime}
                    onChange={handleStartTimeChange}
                    className="schedule-time-input"
                  />
                </div>
                <span className="schedule-to">to</span>
                <div className="schedule-date-time-group">
                  <input
                    type="text"
                    value={formatDateForInput(endDate)}
                    readOnly
                    className="schedule-date-input"
                  />
                  <input
                    type="text"
                    value={endTime}
                    onChange={handleEndTimeChange}
                    className="schedule-time-input"
                  />
                </div>
              </div>

              <div className="schedule-form-row">
                <CalendarIcon size={18} className="schedule-form-icon" />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="schedule-select"
                >
                  <option value="">Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="schedule-form-row">
                <MoreVertical size={18} className="schedule-form-icon" />
                <button className="schedule-link-button">
                  Add location, video call, description
                </button>
              </div>

              <div className="schedule-form-row">
                <CalendarIcon size={18} className="schedule-form-icon" />
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="schedule-select"
                >
                  <option value="busy">Busy</option>
                  <option value="free">Free</option>
                </select>
                <Info size={14} className="schedule-info-icon" />
              </div>

              <div className="schedule-form-row schedule-notes-row">
                <FileText size={18} className="schedule-form-icon" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="schedule-notes-textarea"
                  placeholder="Notes are visible within Pipedrive, but not to event guests"
                />
              </div>

              <div className="schedule-form-row">
                <User size={18} className="schedule-form-icon" />
                <select
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  className="schedule-select"
                >
                  <option value="frank">Frank (You)</option>
                </select>
              </div>

              <div className="schedule-form-row">
                <Link2 size={18} className="schedule-form-icon" />
                <input
                  type="text"
                  value={deal}
                  onChange={(e) => setDeal(e.target.value)}
                  className="schedule-input"
                  placeholder="Deal or Lead"
                />
              </div>

              <div className="schedule-form-row">
                <User size={18} className="schedule-form-icon" />
                <input
                  type="text"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className="schedule-input"
                  placeholder="People"
                />
              </div>

              <div className="schedule-form-row">
                <Building2 size={18} className="schedule-form-icon" />
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="schedule-input"
                  placeholder="Organization"
                />
              </div>
            </div>

            <div className="schedule-modal-footer">
              <button className="schedule-footer-icon-button">
                <Settings size={18} />
              </button>
              <label className="schedule-checkbox-label">
                <input
                  type="checkbox"
                  checked={markAsDone}
                  onChange={(e) => setMarkAsDone(e.target.checked)}
                />
                Mark as done
              </label>
              <div className="schedule-footer-actions">
                <button onClick={onClose} className="schedule-cancel-button">
                  Cancel
                </button>
                <button onClick={handleSave} className="schedule-save-button">
                  Save
                </button>
              </div>
              <button className="schedule-footer-icon-button">
                <Copy size={18} />
              </button>
            </div>
          </div>

          <div className="schedule-modal-right">
            <div className="schedule-modal-calendar-header">
              <div className="schedule-modal-calendar-nav">
                <button 
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setDate(newDate.getDate() - 7);
                    setCalendarDate(newDate);
                  }}
                  className="schedule-modal-calendar-nav-btn"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="schedule-modal-calendar-title">
                  {formatCalendarDate(calendarDate)}
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(calendarDate);
                    newDate.setDate(newDate.getDate() + 7);
                    setCalendarDate(newDate);
                  }}
                  className="schedule-modal-calendar-nav-btn"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="schedule-modal-calendar-content">
              <CalendarWeekView
                currentWeek={calendarDate}
                onWeekChange={(direction) => {
                  const newDate = new Date(calendarDate);
                  newDate.setDate(newDate.getDate() + (direction * 7));
                  setCalendarDate(newDate);
                }}
                onTodayClick={() => {
                  const today = new Date();
                  setCalendarDate(today);
                  handleDateChange(today);
                }}
                activities={[]}
                onSlotClick={handleCalendarSlotClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Info component if not imported
const Info = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export default ScheduleActivityModal;

