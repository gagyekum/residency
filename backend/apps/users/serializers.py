from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'permissions']
        read_only_fields = ['id', 'email', 'permissions']

    def get_permissions(self, obj):
        """Return list of permission codenames for the user."""
        # Get all permissions (from user and groups)
        all_permissions = obj.get_all_permissions()
        return list(all_permissions)
