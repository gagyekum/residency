from django.contrib import admin

from .models import EmailAddress, PhoneNumber, Residence


class PhoneNumberInline(admin.TabularInline):
    model = PhoneNumber
    extra = 1


class EmailAddressInline(admin.TabularInline):
    model = EmailAddress
    extra = 1


@admin.register(Residence)
class ResidenceAdmin(admin.ModelAdmin):
    list_display = ('house_number', 'name', 'created_at')
    search_fields = ('house_number', 'name')
    inlines = [PhoneNumberInline, EmailAddressInline]
