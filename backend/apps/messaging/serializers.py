from rest_framework import serializers

from .models import Channel, EmailRecipient, MessageJob, SMSRecipient


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


class SMSRecipientSerializer(serializers.ModelSerializer):
    residence_name = serializers.CharField(source='residence.name', read_only=True)
    house_number = serializers.CharField(source='residence.house_number', read_only=True)

    class Meta:
        model = SMSRecipient
        fields = [
            'id', 'residence', 'residence_name', 'house_number',
            'phone_number', 'status', 'error_message', 'sent_at'
        ]
        read_only_fields = fields


class MessageJobSerializer(serializers.ModelSerializer):
    """Serializer for job details (recipients fetched separately via endpoints)."""
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    email_progress_percent = serializers.SerializerMethodField()
    sms_progress_percent = serializers.SerializerMethodField()
    overall_progress_percent = serializers.SerializerMethodField()
    # Legacy field for backward compatibility
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = MessageJob
        fields = [
            'id', 'subject', 'body', 'sms_body', 'channels',
            'sender', 'sender_email', 'status',
            # Email stats
            'email_total_recipients', 'email_sent_count', 'email_failed_count',
            # SMS stats
            'sms_total_recipients', 'sms_sent_count', 'sms_failed_count',
            # Legacy fields
            'total_recipients', 'sent_count', 'failed_count',
            'error_message', 'created_at', 'started_at', 'completed_at',
            # Progress
            'email_progress_percent', 'sms_progress_percent',
            'overall_progress_percent', 'progress_percent'
        ]
        read_only_fields = [
            'id', 'sender', 'sender_email', 'status',
            'email_total_recipients', 'email_sent_count', 'email_failed_count',
            'sms_total_recipients', 'sms_sent_count', 'sms_failed_count',
            'total_recipients', 'sent_count', 'failed_count',
            'error_message', 'created_at', 'started_at', 'completed_at',
            'email_progress_percent', 'sms_progress_percent',
            'overall_progress_percent', 'progress_percent'
        ]

    def get_email_progress_percent(self, obj):
        if obj.email_total_recipients == 0:
            return 0
        return int((obj.email_sent_count + obj.email_failed_count) / obj.email_total_recipients * 100)

    def get_sms_progress_percent(self, obj):
        if obj.sms_total_recipients == 0:
            return 0
        return int((obj.sms_sent_count + obj.sms_failed_count) / obj.sms_total_recipients * 100)

    def get_overall_progress_percent(self, obj):
        return obj.get_overall_progress()

    def get_progress_percent(self, obj):
        """Legacy field - returns email progress for backward compatibility."""
        return self.get_email_progress_percent(obj)


class MessageJobCreateSerializer(serializers.Serializer):
    """Serializer for creating a new message job."""
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body = serializers.CharField()
    sms_body = serializers.CharField(required=False, allow_blank=True)
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=Channel.choices),
        default=[Channel.EMAIL, Channel.SMS]
    )

    def validate(self, data):
        channels = data.get('channels', [])

        # Require at least one channel
        if not channels:
            raise serializers.ValidationError({
                'channels': 'At least one channel must be selected.'
            })

        # Require subject if email is selected
        if Channel.EMAIL in channels and not data.get('subject'):
            raise serializers.ValidationError({
                'subject': 'Subject is required when sending email.'
            })

        return data


class MessageJobListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing jobs (no recipients)."""
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    email_progress_percent = serializers.SerializerMethodField()
    sms_progress_percent = serializers.SerializerMethodField()
    overall_progress_percent = serializers.SerializerMethodField()
    # Legacy field
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = MessageJob
        fields = [
            'id', 'subject', 'channels', 'sender_email', 'status',
            # Email stats
            'email_total_recipients', 'email_sent_count', 'email_failed_count',
            # SMS stats
            'sms_total_recipients', 'sms_sent_count', 'sms_failed_count',
            # Legacy
            'total_recipients', 'sent_count', 'failed_count',
            'created_at', 'completed_at',
            # Progress
            'email_progress_percent', 'sms_progress_percent',
            'overall_progress_percent', 'progress_percent'
        ]

    def get_email_progress_percent(self, obj):
        if obj.email_total_recipients == 0:
            return 0
        return int((obj.email_sent_count + obj.email_failed_count) / obj.email_total_recipients * 100)

    def get_sms_progress_percent(self, obj):
        if obj.sms_total_recipients == 0:
            return 0
        return int((obj.sms_sent_count + obj.sms_failed_count) / obj.sms_total_recipients * 100)

    def get_overall_progress_percent(self, obj):
        return obj.get_overall_progress()

    def get_progress_percent(self, obj):
        """Legacy field - returns email progress for backward compatibility."""
        return self.get_email_progress_percent(obj)


# Backward compatibility aliases
EmailJobSerializer = MessageJobSerializer
EmailJobCreateSerializer = MessageJobCreateSerializer
EmailJobListSerializer = MessageJobListSerializer
