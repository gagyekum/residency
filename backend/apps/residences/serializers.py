from rest_framework import serializers

from .models import EmailAddress, PhoneNumber, Residence


class PhoneNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneNumber
        fields = ['id', 'number', 'label', 'is_primary']


class EmailAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAddress
        fields = ['id', 'email', 'label', 'is_primary']


class ResidenceSerializer(serializers.ModelSerializer):
    phone_numbers = PhoneNumberSerializer(many=True, required=False)
    email_addresses = EmailAddressSerializer(many=True, required=False)

    class Meta:
        model = Residence
        fields = [
            'id',
            'house_number',
            'name',
            'phone_numbers',
            'email_addresses',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers', [])
        email_addresses_data = validated_data.pop('email_addresses', [])

        residence = Residence.objects.create(**validated_data)

        for phone_data in phone_numbers_data:
            PhoneNumber.objects.create(residence=residence, **phone_data)

        for email_data in email_addresses_data:
            EmailAddress.objects.create(residence=residence, **email_data)

        return residence

    def update(self, instance, validated_data):
        phone_numbers_data = validated_data.pop('phone_numbers', None)
        email_addresses_data = validated_data.pop('email_addresses', None)

        instance.house_number = validated_data.get('house_number', instance.house_number)
        instance.name = validated_data.get('name', instance.name)
        instance.save()

        if phone_numbers_data is not None:
            instance.phone_numbers.all().delete()
            for phone_data in phone_numbers_data:
                PhoneNumber.objects.create(residence=instance, **phone_data)

        if email_addresses_data is not None:
            instance.email_addresses.all().delete()
            for email_data in email_addresses_data:
                EmailAddress.objects.create(residence=instance, **email_data)

        return instance
