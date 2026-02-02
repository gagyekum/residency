from rest_framework.permissions import DjangoModelPermissions


class MessageJobPermissions(DjangoModelPermissions):
    """
    Custom permission class for message jobs.

    Required permissions:
    - GET (list/retrieve): view_messagejob
    - POST (create/send): add_messagejob
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


# Backward compatibility alias
EmailJobPermissions = MessageJobPermissions
