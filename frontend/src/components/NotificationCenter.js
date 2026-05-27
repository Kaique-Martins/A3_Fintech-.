import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/NotificationCenter.css';
export const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const loadNotifications = useCallback(async () => {
        try {
            const [notifRes, statsRes] = await Promise.all([
                axios.get('/api/notifications'),
                axios.get('/api/notifications/stats'),
            ]);
            setNotifications(notifRes.data);
            setStats(statsRes.data);
        }
        catch (error) {
            console.error('Error loading notifications:', error);
        }
    }, []);
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 5000);
        return () => clearInterval(interval);
    }, [loadNotifications]);
    const handleMarkAsRead = async (id) => {
        try {
            await axios.post(`/api/notifications/${id}/read`);
            await loadNotifications();
        }
        catch (error) {
            console.error('Error marking notification:', error);
        }
    };
    const handleMarkAllAsRead = async () => {
        try {
            await axios.post('/api/notifications/read-all');
            await loadNotifications();
        }
        catch (error) {
            console.error('Error marking all notifications:', error);
        }
    };
    const getFilteredNotifications = () => {
        switch (filter) {
            case 'unread':
                return notifications.filter((n) => !n.read);
            case 'critical':
                return notifications.filter((n) => n.severity === 'CRITICAL');
            case 'warning':
                return notifications.filter((n) => n.severity === 'WARNING');
            default:
                return notifications;
        }
    };
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'CRITICAL':
                return '🚨';
            case 'ERROR':
                return '❌';
            case 'WARNING':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };
    const getSeverityClass = (severity) => {
        return `notification-${severity.toLowerCase()}`;
    };
    const filteredNotifications = getFilteredNotifications();
    return (_jsxs("div", { className: "notification-center", children: [_jsxs("button", { className: `notification-bell ${isOpen ? 'open' : ''}`, onClick: () => setIsOpen(!isOpen), children: [_jsx("span", { className: "bell-icon", children: "\uD83D\uDD14" }), stats && stats.unread > 0 && (_jsx("span", { className: "notification-badge", children: stats.unread }))] }), isOpen && (_jsxs("div", { className: "notification-dropdown", children: [_jsxs("div", { className: "notification-header", children: [_jsx("h3", { children: "Notifica\u00E7\u00F5es" }), _jsx("button", { className: "close-button", onClick: () => setIsOpen(false), children: "\u2715" })] }), stats && (_jsxs("div", { className: "notification-stats", children: [_jsxs("div", { className: "stat-item", children: [_jsx("span", { className: "stat-label", children: "Total" }), _jsx("span", { className: "stat-value", children: stats.total })] }), _jsxs("div", { className: "stat-item critical", children: [_jsx("span", { className: "stat-label", children: "\uD83D\uDEA8 Cr\u00EDtica" }), _jsx("span", { className: "stat-value", children: stats.critical })] }), _jsxs("div", { className: "stat-item warning", children: [_jsx("span", { className: "stat-label", children: "\u26A0\uFE0F Alerta" }), _jsx("span", { className: "stat-value", children: stats.warning })] })] })), _jsxs("div", { className: "notification-filters", children: [_jsx("button", { className: `filter-button ${filter === 'all' ? 'active' : ''}`, onClick: () => setFilter('all'), children: "Todas" }), _jsx("button", { className: `filter-button ${filter === 'unread' ? 'active' : ''}`, onClick: () => setFilter('unread'), children: "N\u00E3o lidas" }), _jsx("button", { className: `filter-button ${filter === 'critical' ? 'active' : ''}`, onClick: () => setFilter('critical'), children: "Cr\u00EDticas" }), _jsx("button", { className: `filter-button ${filter === 'warning' ? 'active' : ''}`, onClick: () => setFilter('warning'), children: "Avisos" })] }), _jsx("div", { className: "notification-list", children: filteredNotifications.length === 0 ? (_jsx("div", { className: "no-notifications", children: _jsx("p", { children: "Nenhuma notifica\u00E7\u00E3o" }) })) : (filteredNotifications.map((notif) => (_jsxs("div", { className: `notification-item ${getSeverityClass(notif.severity)} ${!notif.read ? 'unread' : ''}`, children: [_jsxs("div", { className: "notification-content", children: [_jsxs("div", { className: "notification-title", children: [_jsx("span", { className: "severity-icon", children: getSeverityIcon(notif.severity) }), _jsx("span", { className: "title", children: notif.title })] }), _jsx("div", { className: "notification-message", children: notif.message }), _jsxs("div", { className: "notification-meta", children: [_jsx("span", { className: "timestamp", children: new Date(notif.timestamp).toLocaleTimeString('pt-BR') }), notif.recordId && (_jsx("span", { className: "record-id", children: notif.recordId })), notif.decision && (_jsx("span", { className: `decision-badge decision-${notif.decision.toLowerCase()}`, children: notif.decision }))] })] }), !notif.read && (_jsx("button", { className: "mark-read-button", onClick: () => handleMarkAsRead(notif.id), title: "Marcar como lida", children: "\u2713" }))] }, notif.id)))) }), _jsx("div", { className: "notification-actions", children: notifications.filter((n) => !n.read).length > 0 && (_jsx("button", { className: "mark-all-button", onClick: handleMarkAllAsRead, children: "Marcar todas como lidas" })) })] }))] }));
};
