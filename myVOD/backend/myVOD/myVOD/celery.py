import os
from celery import Celery
from celery.schedules import crontab
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myVOD.settings')

app = Celery('myVOD')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

# If you want to deactivate the daily update, comment out the following block
app.conf.beat_schedule = {
    'update-availability-daily': {
        'task': 'movies.tasks.run_update_availability_changes',
        'schedule': crontab(hour=3, minute=0),  # Run daily at 3:00 AM
    },
}

# We need a task to call the management command

@app.task(name='movies.tasks.run_update_availability_changes')
def run_update_availability_changes():
    call_command('update_availability_changes')
