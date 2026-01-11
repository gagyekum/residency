from rest_framework import serializers

from .models import EmailJob, EmailRecipient


class EmailRecipientSerializer(serializers.ModelSerializer):
    residence_name = serializers.CharField(source='residence.name', read_only=True)
    house_number = serializers.CharField(source='residence.house_number', read_only=True)

    class Meta:
        model = EmailRecipient
        fields = [
            'id', 'residence', 'residence_name', 'house_number',
            'email_address', 'status', 'error_message', 'sent_at'
        ]
        read_only_fields = fields


class EmailJobSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    recipients = EmailRecipientSerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = EmailJob
        fields = [
            'id', 'subject', 'body', 'sender', 'sender_email', 'status',
            'total_recipients', 'sent_count', 'failed_count',
            'error_message', 'created_at', 'started_at', 'completed_at',
            'recipients', 'progress_percent'
        ]
        read_only_fields = [
            'id', 'sender', 'sender_email', 'status', 'total_recipients',
            'sent_count', 'failed_count', 'error_message', 'created_at',
            'started_at', 'completed_at', 'recipients', 'progress_percent'
        ]

    def get_progress_percent(self, obj):
        if obj.total_recipients == 0:
            return 0
        return int((obj.sent_count + obj.failed_count) / obj.total_recipients * 100)


class EmailJobCreateSerializer(serializers.Serializer):
    """Serializer for creating a new email job."""
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()


class EmailJobListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing jobs (no recipients)."""
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = EmailJob
        fields = [
            'id', 'subject', 'sender_email', 'status',
            'total_recipients', 'sent_count', 'failed_count',
            'created_at', 'completed_at', 'progress_percent'
        ]

    def get_progress_percent(self, obj):
        if obj.total_recipients == 0:
            return 0
        return int((obj.sent_count + obj.failed_count) / obj.total_recipients * 100)
