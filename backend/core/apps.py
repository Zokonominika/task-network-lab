from django.apps import AppConfig
import os

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # We only want to start the scheduler once. 
        # Django's auto-reloader runs ready() twice, so we check for RUN_MAIN.
        if os.environ.get('RUN_MAIN') == 'true':
            from . import scheduler
            scheduler.start()
