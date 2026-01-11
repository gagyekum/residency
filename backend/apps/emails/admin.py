from django.contrib import admin

from .models import EmailJob, EmailRecipient


class EmailRecipientInline(admin.TabularInline):
    model = EmailRecipient
    extra = 0
    readonly_fields = ['residence', 'email_address', 'status', 'error_message', 'sent_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(EmailJob)
class EmailJobAdmin(admin.ModelAdmin):
    list_display = ['id', 'subject', 'sender', 'status', 'total_recipients', 'sent_count', 'failed_count', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['subject', 'body', 'sender__email']
    readonly_fields = ['sender', 'status', 'total_recipients', 'sent_count', 'failed_count', 'error_message', 'created_at', 'started_at', 'completed_at']
    inlines = [EmailRecipientInline]

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
