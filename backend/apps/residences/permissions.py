from rest_framework.permissions import DjangoModelPermissions


class ResidencePermissions(DjangoModelPermissions):
    """
    Custom permission class that enforces Django model permissions.

    Required permissions:
    - GET (list/retrieve): view_residence
    - POST (create): add_residence
    - PUT/PATCH (update): change_residence
    - DELETE (destroy): delete_residence
    """

    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [],
        'HEAD': [],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }
