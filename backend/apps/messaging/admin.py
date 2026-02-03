from django.contrib import admin

from .models import EmailRecipient, MessageJob, SMSRecipient


class EmailRecipientInline(admin.TabularInline):
    model = EmailRecipient
    extra = 0
    readonly_fields = ['residence', 'email_address', 'status', 'error_message', 'sent_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class SMSRecipientInline(admin.TabularInline):
    model = SMSRecipient
    extra = 0
    readonly_fields = ['residence', 'phone_number', 'status', 'error_message', 'sent_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(MessageJob)
class MessageJobAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'subject', 'channels', 'sender', 'status',
        'email_total_recipients', 'email_sent_count', 'email_failed_count',
        'sms_total_recipients', 'sms_sent_count', 'sms_failed_count',
        'created_at'
    ]
    list_filter = ['status', 'channels', 'created_at']
    search_fields = ['subject', 'body', 'sender__email']
    readonly_fields = [
        'sender', 'channels', 'status',
        'email_total_recipients', 'email_sent_count', 'email_failed_count',
        'sms_total_recipients', 'sms_sent_count', 'sms_failed_count',
        'total_recipients', 'sent_count', 'failed_count',
        'error_message', 'created_at', 'started_at', 'completed_at'
    ]
    inlines = [EmailRecipientInline, SMSRecipientInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(EmailRecipient)
class EmailRecipientAdmin(admin.ModelAdmin):
    list_display = ['id', 'job', 'residence', 'email_address', 'status', 'sent_at']
    list_filter = ['status']
    search_fields = ['email_address', 'residence__name', 'residence__house_number']
    readonly_fields = ['job', 'residence', 'email_address', 'status', 'error_message', 'sent_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SMSRecipient)
class SMSRecipientAdmin(admin.ModelAdmin):
    list_display = ['id', 'job', 'residence', 'phone_number', 'status', 'sent_at']
    list_filter = ['status']
    search_fields = ['phone_number', 'residence__name', 'residence__house_number']
    readonly_fields = ['job', 'residence', 'phone_number', 'status', 'error_message', 'sent_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
