from rest_framework.permissions import DjangoModelPermissions


class EmailJobPermissions(DjangoModelPermissions):
    """
    Custom permission class for email jobs.

    Required permissions:
    - GET (list/retrieve): view_emailjob
    - POST (create/send): add_emailjob
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
