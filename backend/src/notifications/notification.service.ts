import { Injectable, Logger } from '@nestjs/common';

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
}

export interface Notification {
  id: string;
  timestamp: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  recordId?: string;
  decision?: string;
  read: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: Notification[] = [];
  private maxNotifications = 500;
  private subscriptions: ((notification: Notification) => void)[] = [];

  /**
   * Create and broadcast a notification
   */
  notify(
    title: string,
    message: string,
    severity: NotificationSeverity = NotificationSeverity.INFO,
    recordId?: string,
    decision?: string,
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      severity,
      title,
      message,
      recordId,
      decision,
      read: false,
    };

    this.notifications.push(notification);

    // Maintain max size
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(-this.maxNotifications);
    }

    // Log based on severity
    if (severity === NotificationSeverity.CRITICAL) {
      this.logger.error(`🚨 ${title}: ${message}`);
    } else if (severity === NotificationSeverity.WARNING) {
      this.logger.warn(`⚠️  ${title}: ${message}`);
    } else if (severity === NotificationSeverity.ERROR) {
      this.logger.error(`❌ ${title}: ${message}`);
    } else {
      this.logger.log(`ℹ️  ${title}: ${message}`);
    }

    // Broadcast to subscribers
    this.broadcast(notification);

    return notification;
  }

  /**
   * Notify on agent decision
   */
  notifyDecision(
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL',
    recordId: string,
    confidence: number,
    reasoning: string,
  ): void {
    let severity = NotificationSeverity.INFO;
    let title = '';

    switch (decision) {
      case 'APPROVED':
        if (confidence > 90) {
          title = '✅ Decisão Alta Confiança';
          severity = NotificationSeverity.INFO;
        } else {
          title = '✅ Registro Aprovado';
          severity = NotificationSeverity.INFO;
        }
        break;
      case 'REJECTED':
        title = '❌ Decisão Rejeição';
        severity = NotificationSeverity.WARNING;
        break;
      case 'FLAGGED':
        title = '🚩 Marcado para Revisão';
        severity = NotificationSeverity.WARNING;
        break;
      case 'NEUTRAL':
        title = '⏸️  Decisão Pendente';
        severity = NotificationSeverity.INFO;
        break;
    }

    this.notify(
      title,
      `${recordId} - Confiança: ${confidence.toFixed(1)}% - ${reasoning}`,
      severity,
      recordId,
      decision,
    );
  }

  /**
   * Get all notifications
   */
  getNotifications(limit = 50, unreadOnly = false): Notification[] {
    let result = [...this.notifications];

    if (unreadOnly) {
      result = result.filter((n) => !n.read);
    }

    // Return recent first
    return result.slice(-limit).reverse();
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.read = true;
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Subscribe to notifications (for real-time updates)
   */
  subscribe(callback: (notification: Notification) => void): () => void {
    this.subscriptions.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s !== callback);
    };
  }

  /**
   * Broadcast notification to all subscribers
   */
  private broadcast(notification: Notification): void {
    this.subscriptions.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        this.logger.error('Notification subscription error:', error);
      }
    });
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(hoursAgo = 24): number {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursAgo);

    const beforeCount = this.notifications.length;
    this.notifications = this.notifications.filter(
      (n) => new Date(n.timestamp) > cutoff,
    );

    const removed = beforeCount - this.notifications.length;
    return removed;
  }

  /**
   * Get notifications by severity
   */
  getNotificationsBySeverity(
    severity: NotificationSeverity,
    limit = 50,
  ): Notification[] {
    return this.notifications
      .filter((n) => n.severity === severity)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total: this.notifications.length,
      unread: this.notifications.filter((n) => !n.read).length,
      critical: this.notifications.filter(
        (n) => n.severity === NotificationSeverity.CRITICAL,
      ).length,
      warning: this.notifications.filter(
        (n) => n.severity === NotificationSeverity.WARNING,
      ).length,
      error: this.notifications.filter(
        (n) => n.severity === NotificationSeverity.ERROR,
      ).length,
      info: this.notifications.filter(
        (n) => n.severity === NotificationSeverity.INFO,
      ).length,
    };
  }
}
