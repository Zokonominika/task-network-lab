import csv
import hashlib
import os
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import ActivityLog, PresentationPeriod, Tenant
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
            'day_of_week', 'timestamp'
        ]

        periods = PresentationPeriod.objects.all()
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
                tenant_rows = []
                tenant_logs = period_logs.filter(user__profile__tenant=tenant)
                
                for log in tenant_logs:
                    row = self.format_log_row(log, tenant.tenant_id)
                    tenant_rows.append(row)
                    period_combined_rows.append(row)
                    all_master_rows.append(row)
                
                # Write Tenant CSV
                if tenant_rows:
                    tenant_csv_path = os.path.join(period_dir, f"{tenant.tenant_id}.csv")
                    self.write_csv(tenant_csv_path, master_headers, tenant_rows)

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
            log.created_at.isoformat()
        ]

    def write_csv(self, path, headers, rows):
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
