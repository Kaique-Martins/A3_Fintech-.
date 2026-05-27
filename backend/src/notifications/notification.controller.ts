import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
  NotificationService,
  NotificationSeverity,
} from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get all notifications
   */
  @Get()
  getNotifications(
    @Body('limit') limit?: number,
    @Body('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationService.getNotifications(limit, unreadOnly);
  }

  /**
   * Get unread notifications
   */
  @Get('unread')
  getUnreadNotifications() {
    return {
      notifications: this.notificationService.getNotifications(50, true),
      unreadCount: this.notificationService.getUnreadCount(),
    };
  }

  /**
   * Get notifications by severity
   */
  @Get('severity/:severity')
  getNotificationsBySeverity(@Param('severity') severity: string) {
    return this.notificationService.getNotificationsBySeverity(
      severity as NotificationSeverity,
    );
  }

  /**
   * Mark notification as read
   */
  @Post(':id/read')
  markAsRead(@Param('id') notificationId: string) {
    this.notificationService.markAsRead(notificationId);
    return { message: 'Notificação marcada como lida' };
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  markAllAsRead() {
    this.notificationService.markAllAsRead();
    return { message: 'Todas as notificações marcadas como lidas' };
  }

  /**
   * Get notification statistics
   */
  @Get('stats')
  getStats() {
    return this.notificationService.getStats();
  }

  /**
   * Clear old notifications
   */
  @Post('clear-old')
  clearOldNotifications(@Body('hoursAgo') hoursAgo = 24) {
    const removed = this.notificationService.clearOldNotifications(hoursAgo);
    return { message: `${removed} notificações antigas removidas` };
  }
}
