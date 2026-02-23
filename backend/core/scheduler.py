from apscheduler.schedulers.background import BackgroundScheduler
from django.core.management import call_command
from datetime import datetime

def start():
    scheduler = BackgroundScheduler()
    # Run the auto_export_logs command every 24 hours
    scheduler.add_job(call_auto_export, 'interval', hours=24, next_run_time=datetime.now())
    scheduler.start()

def call_auto_export():
    try:
        call_command('auto_export_logs')
    except Exception as e:
        print(f"Error running auto_export_logs: {e}")
