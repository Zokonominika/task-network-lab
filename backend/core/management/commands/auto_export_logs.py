import csv
import hashlib
import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import ActivityLog, PresentationPeriod, Tenant, SurveyResponse
from django.conf import settings

class Command(BaseCommand):
    help = 'Automatically exports activity logs based on presentation periods and groups.'

    def handle(self, *args, **options):
        self.stdout.write("Starting automated export...")

        # 1. Base export dir
        backend_root = settings.BASE_DIR
        research_exports_dir = os.path.join(backend_root, 'research_exports')
        if not os.path.exists(research_exports_dir):
            os.makedirs(research_exports_dir)

        master_csv_path = os.path.join(research_exports_dir, 'MASTER_all_groups.csv')
        master_headers = [
            'anonymous_user_id', 'group_code', 'session_id', 'event_type', 
            'task_id', 'word_count', 'char_count', 'hour_of_day', 
            'day_of_week', 'timestamp', 'survey_completed_at'
        ]

        periods = PresentationPeriod.objects.all()

        # 2. Pre-fetch survey completion times for this period to avoid N+1
        # (user_id, session_id) -> submitted_at
        survey_times = {}
        if periods.exists():
            first_start = periods.order_by('start_date').first().start_date
            last_end = periods.order_by('-end_date').first().end_date
            period_surveys = SurveyResponse.objects.filter(
                submitted_at__date__gte=first_start,
                submitted_at__date__lte=last_end
            ).values('user_id', 'session_id', 'submitted_at')
            
            for s in period_surveys:
                key = (s['user_id'], s['session_id'])
                if key not in survey_times: # Keep the first one assuming batch submit
                    survey_times[key] = s['submitted_at'].isoformat()

        self.survey_times_cache = survey_times

        all_master_rows = []

        for period in periods:
            self.stdout.write(f"Processing period: {period.name}")
            
            # Subfolder for period
            period_folder_name = f"{period.name}_{period.start_date.strftime('%b%y')}"
            period_dir = os.path.join(research_exports_dir, period_folder_name)
            if not os.path.exists(period_dir):
                os.makedirs(period_dir)
            
            period_combined_rows = []
            
            # Filter logs for this period
            period_logs = ActivityLog.objects.filter(
                created_at__date__gte=period.start_date,
                created_at__date__lte=period.end_date
            )

            # Process by Tenant
            tenants = period.tenants.all()
            if not tenants.exists():
                tenants = Tenant.objects.all()

            for tenant in tenants:
                tenant_logs = period_logs.filter(user__profile__tenant=tenant)
                if not tenant_logs.exists():
                    continue

                # Group subfolder
                group_dir = os.path.join(period_dir, str(tenant.tenant_id))
                if not os.path.exists(group_dir):
                    os.makedirs(group_dir)

                # Group by user
                user_data_map = {} # anon_id -> list of rows
                
                for log in tenant_logs:
                    row = self.format_log_row(log, tenant.tenant_id)
                    anon_id = row[0] # anonymous_user_id is at index 0
                    
                    if anon_id not in user_data_map:
                        user_data_map[anon_id] = []
                    
                    user_data_map[anon_id].append(row)
                    period_combined_rows.append(row)
                    all_master_rows.append(row)
                
                # Write individual User CSVs
                for anon_id, rows in user_data_map.items():
                    user_csv_path = os.path.join(group_dir, f"user_{anon_id}.csv")
                    self.write_csv(user_csv_path, master_headers, rows)

            # Write Period Combined CSV
            if period_combined_rows:
                combined_csv_path = os.path.join(period_dir, 'ALL_combined.csv')
                self.write_csv(combined_csv_path, master_headers, period_combined_rows)

        # Write MASTER CSV
        if all_master_rows:
            # Note: The request said MASTER_all_groups.csv in the root of research_exports/ combining everything.
            # We overwrite it with latest state or append? I'll overwrite as it's an "export all" command.
            self.write_csv(master_csv_path, master_headers, all_master_rows)

        self.stdout.write(self.style.SUCCESS("Automated export completed successfully."))

    def format_log_row(self, log, group_code):
        anon_user_id = ""
        if log.user:
            hash_obj = hashlib.sha256(str(log.user.id).encode())
            anon_user_id = hash_obj.hexdigest()[0:16]
        
        meta = log.metadata if isinstance(log.metadata, dict) else {}
        survey_done = ""
        if log.user:
            survey_done = self.survey_times_cache.get((log.user.id, log.session_id), "")

        return [
            anon_user_id,
            group_code,
            log.session_id,
            log.event_type,
            meta.get('task_id', ''),
            meta.get('word_count', ''),
            meta.get('char_count', ''),
            log.created_at.hour,
            log.created_at.strftime('%A'),
            log.created_at.isoformat(),
            survey_done
        ]

    def write_csv(self, path, headers, rows):
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
