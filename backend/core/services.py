import os
import csv
import hashlib
from django.utils import timezone
from django import forms
from django.http import HttpResponse
from django.conf import settings
from .models import (
    ActivityLog, ResearchUserAlias, PresentationPeriod, 
    Task, TaskAssignment
)

def get_user_alias(user):
    try:
        return ResearchUserAlias.objects.get(user=user)
    except ResearchUserAlias.DoesNotExist:
        tenant = getattr(user.profile, 'tenant', None)
        is_kanban = tenant.is_kanban if tenant else False
        prefix = 'B' if is_kanban else 'A'
        count = ResearchUserAlias.objects.filter(alias__startswith=prefix).count()
        return ResearchUserAlias.objects.create(
            user=user,
            alias=f"{prefix}{count + 1}",
            anonymous_id=hashlib.sha256(str(user.id).encode()).hexdigest()[0:16]
        )

def export_user_session_csv(user):
    alias_obj = get_user_alias(user)
    
    now = timezone.now()
    period = PresentationPeriod.objects.filter(
        tenants=user.profile.tenant,
        start_date__lte=now.date(),
        end_date__gte=now.date()
    ).first()
    if not period:
        period = PresentationPeriod.objects.order_by('-start_date').first()
    
    period_name = period.name if period else "Uncategorized"
    group_folder = "G_2" if user.profile.tenant.is_kanban else "G_1"
    
    # backend_root is more reliable via settings
    backend_root = settings.BASE_DIR
    base_export_dir = os.path.join(backend_root, 'research_exports', f"Session_{period_name}", group_folder, alias_obj.alias)
    
    os.makedirs(base_export_dir, exist_ok=True)
    session_file_path = os.path.join(base_export_dir, 'Session_Log.csv')

    all_logs = ActivityLog.objects.filter(user=user).order_by('created_at')
    
    with open(session_file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['SessionID', 'Event', 'Timestamp', 'Metadata'])
        for log in all_logs:
            writer.writerow([log.session_id, log.event_type, log.created_at.isoformat(), log.metadata])

    return session_file_path

def generate_global_activity_csv():
    backend_root = settings.BASE_DIR
    export_dir = os.path.join(backend_root, 'research_exports')
    os.makedirs(export_dir, exist_ok=True)
    
    timestamp = timezone.now().strftime('%Y-%m-%d_%H-%M')
    filename = f"export_{timestamp}.csv"
    local_path = os.path.join(export_dir, filename)

    headers = [
        'session_id', 'event_type', 'group_code', 'task_id', 
        'word_count', 'char_count', 'hour_of_day', 'day_of_week', 
        'created_at', 'anonymous_user_id', 
        'survey_suspicious_count', 'survey_avg_response_ms'
    ]

    with open(local_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        logs = ActivityLog.objects.all().order_by('-created_at')
        for log in logs:
            anon_user_id = ""
            group_code = "N/A"
            
            if log.user:
                hash_obj = hashlib.sha256(str(log.user.id).encode())
                anon_user_id = hash_obj.hexdigest()[0:16]
                
                try:
                    if hasattr(log.user, 'profile') and log.user.profile.tenant:
                        group_code = log.user.profile.tenant.tenant_id
                except:
                    pass
            
            meta = log.metadata if isinstance(log.metadata, dict) else {}
            task_id = meta.get('task_id', '')
            word_count = meta.get('word_count', '')
            char_count = meta.get('char_count', '')
            
            raw_suspicious = meta.get('is_suspicious', '')
            suspicious_count = 1 if raw_suspicious is True else (0 if raw_suspicious is False else '')
            avg_response = meta.get('avg_response_ms', '')

            hour_of_day = log.created_at.hour
            day_of_week = log.created_at.strftime('%A')
            
            row = [
                log.session_id, log.event_type, group_code, task_id,
                word_count, char_count, hour_of_day, day_of_week,
                log.created_at.isoformat(), anon_user_id,
                suspicious_count, avg_response
            ]
            writer.writerow(row)

    return local_path
