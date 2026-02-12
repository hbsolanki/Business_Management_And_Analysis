import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaLink, FaTrashAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useNotification from '@/hooks/useNotification';

const NotificationBell = () => {
    const { notifications, fetchNotifications, markAsRead, clearNotifications, deleteNotification } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const safeNotifications = Array.isArray(notifications) ? notifications.filter(Boolean) : [];
    const unreadCount = safeNotifications.filter(n => n && !n.is_read).length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    const normalizeActionLink = (link) => {
        if (!link || typeof link !== 'string') return null;
        const trimmed = link.trim();
        if (trimmed.startsWith('http')) return trimmed;

        const segments = trimmed.split('/').filter(Boolean);
        if (segments[0] === 'task' && segments[1]) {
            return `/tasks/${segments[1]}`;
        }

        const cleaned = trimmed.length > 1 && trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
        return cleaned;
    };

    const getActionBadge = (actionType) => {
        if (!actionType) return null;
        const type = actionType.toUpperCase();
        const config = {
            TASK_ASSIGNED: { label: 'Task Assigned', className: 'bg-sky-50 text-sky-700' },
            TASK_UPDATED: { label: 'Task Updated', className: 'bg-amber-50 text-amber-700' },
            TASK_COMPLETED: { label: 'Task Completed', className: 'bg-emerald-50 text-emerald-700' },
        };
        const fallback = {
            label: actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
            className: 'bg-slate-100 text-slate-700',
        };
        return config[type] || fallback;
    };

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);
    };

    const handleActionClick = (event, notification) => {
        event.stopPropagation();
        markAsRead(notification.id);
        const actionLink = normalizeActionLink(notification.action_link);
        if (!actionLink) return;

        if (actionLink.startsWith('http')) {
            window.open(actionLink, '_blank', 'noopener');
        } else {
            navigate(actionLink);
        }
        setIsOpen(false);
    };

    const handleDeleteClick = (event, notification) => {
        event.stopPropagation();
        deleteNotification(notification.id);
    };

    const hasFetched = useRef(false);

    const handleBellClick = () => {
        if (!isOpen && !hasFetched.current) {
            fetchNotifications();
            hasFetched.current = true;
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleBellClick}
                className="relative p-2.5 rounded-2xl text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-colors shadow-sm hover:shadow-md bg-white/70 backdrop-blur"
                title="Notifications"
            >
                <FaBell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white shadow"></span>
                )}
            </button>

            {isOpen && (
                <div className="glass-panel absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-3 w-[calc(100vw-1.5rem)] sm:w-[24rem] md:w-[26rem] max-w-[26rem] rounded-3xl shadow-2xl z-50 animate-fade-in-down overflow-hidden border border-white/70">
                    <div className="px-4 py-4 border-b border-white/70 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white/80">
                        <div>
                            <h3 className="font-bold text-base tracking-tight text-slate-900">Notifications</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                            </p>
                        </div>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearNotifications}
                                className="text-xs text-slate-700 hover:text-slate-900 font-semibold self-start sm:self-auto px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar bg-white/70">
                        {safeNotifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            safeNotifications.map((notification) => {
                                const actionLink = normalizeActionLink(notification.action_link);
                                const badge = getActionBadge(notification.action_type);
                                const isUnread = !notification.is_read;
                                return (
                                    <div
                                        key={notification.id}
                                        className={`mx-3 my-3 p-3 sm:p-4 rounded-2xl border transition-colors flex gap-3 shadow-sm hover:shadow-md ${isUnread ? 'bg-white border-slate-200 ring-1 ring-slate-200/70' : 'bg-white/60 border-white/80 opacity-85'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex-shrink-0">
                                            {notification.actor?.profile_picture ? (
                                                <img
                                                    src={notification.actor.profile_picture}
                                                    alt={notification.actor.username}
                                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-white shadow-sm">
                                                    {notification.actor?.username?.charAt(0).toUpperCase() || 'S'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {notification.title}
                                                </p>
                                                {isUnread && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                        New
                                                    </span>
                                                )}
                                                {badge && (
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">
                                                {notification.content}
                                            </p>
                                            <div className="flex items-center justify-between mt-3 gap-2">
                                                <p className="text-xs text-slate-400 font-medium">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {actionLink && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => handleActionClick(event, notification)}
                                                            className="text-xs text-slate-700 font-semibold flex items-center gap-1 hover:text-slate-900 transition-colors px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200"
                                                            aria-label="View notification action"
                                                        >
                                                            <FaLink size={10} /> View
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(event) => handleDeleteClick(event, notification)}
                                                        className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:text-rose-700 transition-colors px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100"
                                                        aria-label="Delete notification"
                                                    >
                                                        <FaTrashAlt size={10} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="flex-shrink-0 self-center">
                                                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
