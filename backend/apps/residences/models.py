from django.db import models


class Residence(models.Model):
    """A residence/house with contact information."""

    house_number = models.CharField(max_length=50)
    name = models.CharField(max_length=255, help_text="Residence name (e.g., Mr. & Mrs. Mensah)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'residences'
        ordering = ['house_number']

    def __str__(self):
        return f"{self.house_number} - {self.name}"


class PhoneNumber(models.Model):
    """Phone number associated with a residence."""

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name='phone_numbers'
    )
    number = models.CharField(max_length=20)
    label = models.CharField(max_length=50, blank=True, help_text="e.g., Home, Mobile, Work")
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = 'residence_phone_numbers'

    def __str__(self):
        return f"{self.number} ({self.label})" if self.label else self.number


class EmailAddress(models.Model):
    """Email address associated with a residence."""

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name='email_addresses'
    )
    email = models.EmailField()
    label = models.CharField(max_length=50, blank=True, help_text="e.g., Personal, Work")
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = 'residence_email_addresses'
        verbose_name_plural = 'Email addresses'

    def __str__(self):
        return f"{self.email} ({self.label})" if self.label else self.email
