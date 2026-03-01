from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

# --- TENANT (ŞİRKET) ---
class Tenant(models.Model):
    name = models.CharField(max_length=100)
    tenant_id = models.CharField(max_length=20, unique=True)
    is_kanban = models.BooleanField(default=False, verbose_name="Kanban Arayüzü")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# --- DEPARTMAN ---
class Department(models.Model):
    name = models.CharField(max_length=100)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='departments')
    
    def __str__(self):
        return self.name

# --- KULLANICI PROFİLİ ---
class UserProfile(models.Model):
    STATUS_CHOICES = [
        ('online', '🟢 Çevrimiçi'),
        ('busy', '🔴 Meşgul'),
        ('away', '🟡 Uzakta'),
        ('offline', '⚫ Çevrimdışı'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True)
    
    # Yeni Kurumsal Alanlar
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Departman")
    rank = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(10)], verbose_name="Rütbe (1-10)")
    title = models.CharField(max_length=100, blank=True, null=True, verbose_name="Unvan")
    avatar_id = models.IntegerField(default=1) 
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='offline')
    age = models.IntegerField(blank=True, null=True, verbose_name="Yaş")
    gender = models.CharField(max_length=10, choices=[('male', 'Erkek'), ('female', 'Kadın')], blank=True, null=True)
    
    last_activity = models.DateTimeField(null=True, blank=True) 
    
    # 1. İletişim & Bio
    bio = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    # 2. Görünüm Ayarları
    accent_color = models.CharField(max_length=7, default='#E91E63') # Varsayılan Mat Pembe
    background_style = models.CharField(max_length=10, default='plain') # plain, grid, dots
    
    # 3. Gizlilik ve Bildirimler (JSON olarak tutmak en temizi)
    privacy_settings = models.JSONField(default=dict, blank=True)
    notification_settings = models.JSONField(default=dict, blank=True)

    @property
    def display_name(self):
        suffix = "Bey" if self.gender == 'male' else "Hanım" if self.gender == 'female' else ""
        name = self.user.first_name if self.user.first_name else self.user.username
        return f"{name} {suffix}".strip()

    def __str__(self):
        return f"{self.user.username} (Lvl {self.rank})"

# --- CİHAZ ---
class Device(models.Model):
    name = models.CharField(max_length=100)
    hwid = models.CharField(max_length=100, unique=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

# --- GÖREV ---
class Task(models.Model):
    STATUS_CHOICES = [('active', 'Aktif'), ('completed', 'Tamamlandı')]
    PRIORITY_CHOICES = [('low', 'Az'), ('normal', 'Normal'), ('urgent', 'Acil')]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_tasks")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="tasks", null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    due_date = models.DateTimeField(null=True, blank=True)
    parent_task = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subtasks')
    created_at = models.DateTimeField(auto_now_add=True)
    warning_sent = models.BooleanField(default=False)

    # --- PIPELINE FIELDS ---
    is_pipeline_task = models.BooleanField(default=False, verbose_name="Pipeline Görevi mi?")
    pipeline_stage = models.ForeignKey('PipelineStage', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')

    def __str__(self):
        return self.title

# --- GÖREV EKİ (DOSYA) ---
class TaskAttachment(models.Model):
    TYPE_CHOICES = [('instruction', 'Görev Dosyası'), ('delivery', 'Teslim Dosyası')]
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='task_files/')
    file_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

# --- GÖREV ATAMASI (KİM YAPIYOR?) ---
class TaskAssignment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="task_assignments")
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    is_failed = models.BooleanField(default=False) 

    def __str__(self):
        return f"{self.user.username} -> {self.task.title}"

# --- GÖREV KOORDİNATI (KİŞİSEL UZAY) ---
class TaskNode(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='nodes')
    user = models.ForeignKey(User, on_delete=models.CASCADE) 
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)
    is_pinned = models.BooleanField(default=False)

    class Meta:
        unique_together = ('task', 'user')

# --- BAĞLILIKLAR ---
class TaskDependency(models.Model):
    source_task = models.ForeignKey(Task, related_name='next_tasks', on_delete=models.CASCADE)
    target_task = models.ForeignKey(Task, related_name='prev_tasks', on_delete=models.CASCADE)

# --- BİLDİRİMLER ---
class Notification(models.Model):
    TYPE_CHOICES = [
        ('new_task', 'Yeni Görev'),
        ('assignment', 'Görev Ataması'),
        ('task_completed', 'Görev Tamamlandı'),
        ('all_completed', 'Ekip Tamamladı'),
        ('file_uploaded', 'Dosya Yüklendi'),
        ('priority_changed', 'Öncelik Değişti'),
        ('new_comment', 'Yeni Yorum'),
        ('deadline', 'Süre Azaldı'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications') # Bildirimi alan kişi
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True) # İlgili görev
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at'] # En yeni en üstte

    def __str__(self):
        return f"{self.user.username} - {self.title}"

class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} - {self.task.title}"

class ActivityLog(models.Model):
    EVENT_CHOICES = [
        ('session_start', 'Oturum Başladı'),
        ('session_end', 'Oturum Bitti'),
        ('task_created', 'Görev Oluşturuldu'),
        ('task_moved', 'Görev Taşındı'),
        ('task_completed', 'Görev Tamamlandı'),
        ('comment_sent', 'Yorum Gönderildi'),
        ('file_uploaded', 'Dosya Yüklendi'),
        ('notification_opened', 'Bildirim Açıldı'),
        ('card_connected', 'Kart Bağlandı'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    session_id = models.CharField(max_length=255)
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user_str = self.user.username if self.user else "Anonymous"
        return f"{user_str} - {self.event_type} ({self.created_at})"

class PresentationPeriod(models.Model):
    name = models.CharField(max_length=100, verbose_name="Dönem Adı")
    start_date = models.DateField(verbose_name="Başlangıç Tarihi")
    end_date = models.DateField(verbose_name="Bitiş Tarihi")
    tenants = models.ManyToManyField(Tenant, blank=True, verbose_name="Gruplar", related_name='presentation_periods')

    class Meta:
        verbose_name = "Sunum Dönemi"
        verbose_name_plural = "Sunum Dönemleri"

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"

# --- SURVEY (ANKET) ---
class SurveyQuestion(models.Model):
    text = models.CharField(max_length=500, verbose_name="Soru Metni")
    order = models.IntegerField(default=0, verbose_name="Sıralama")
    is_active = models.BooleanField(default=True, verbose_name="Aktif mi?")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Anket Sorusu"
        verbose_name_plural = "Anket Soruları"
        ordering = ['order']

    def __str__(self):
        return f"{self.order}. {self.text[:50]}"

class SurveyResponse(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='survey_responses', verbose_name="Kullanıcı")
    question = models.ForeignKey(SurveyQuestion, on_delete=models.CASCADE, related_name='responses', verbose_name="Soru")
    answer = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Yanıt (1-5)"
    )
    time_on_question_ms = models.IntegerField(null=True, blank=True, verbose_name="Soru Başında Geçen Süre (ms)")
    is_suspicious = models.BooleanField(default=False, verbose_name="Şüpheli mi?")
    session_id = models.CharField(max_length=255, verbose_name="Oturum ID")
    presentation_period = models.ForeignKey(
        PresentationPeriod, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='survey_responses',
        verbose_name="Sunum Dönemi"
    )
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Gönderilme Tarihi")

    class Meta:
        verbose_name = "Anket Yanıtı"
        verbose_name_plural = "Anket Yanıtları"

    def __str__(self):
        return f"{self.user.username} - {self.question.id} - {self.answer}"

# --- PIPELINE (SÜREÇ) ---
class PipelineTemplate(models.Model):
    name = models.CharField(max_length=100, verbose_name="Taslak Adı")
    presentation_period = models.ForeignKey(PresentationPeriod, on_delete=models.CASCADE, related_name='pipeline', verbose_name="Sunum Dönemi")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Süreç Taslağı"
        verbose_name_plural = "Süreç Taslakları"

    def __str__(self):
        return self.name

class PipelineStage(models.Model):
    template = models.ForeignKey(PipelineTemplate, on_delete=models.CASCADE, related_name='stages', verbose_name="Taslak")
    title = models.CharField(max_length=200, verbose_name="Aşama Başlığı")
    description = models.TextField(blank=True, verbose_name="Aşama Açıklaması")
    order = models.IntegerField(verbose_name="Sıra")
    is_final_stage = models.BooleanField(default=False, verbose_name="Final Aşaması mı?")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Süreç Aşaması"
        verbose_name_plural = "Süreç Aşamaları"
        ordering = ['order']

    def __str__(self):
        return f"{self.template.name} - {self.title}"

# --- SIGNALS ---
@receiver(post_save, sender=UserProfile)
def pipeline_onboarding_signal(sender, instance, **kwargs):
    """
    Kullanıcı onaylandığında (is_active) ve tenant atandığında 
    Pipeline görevlerini otomatik oluşturur.
    """
    if instance.user.is_active and instance.tenant:
        # Zaten görevleri var mı?
        if Task.objects.filter(assignments__user=instance.user, is_pipeline_task=True).exists():
            return

        # Bu tenant'ın dahil olduğu aktif bir dönem bul
        period = instance.tenant.presentation_periods.filter(
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        ).first()
        
        if not period:
            period = instance.tenant.presentation_periods.order_by('-start_date').first()

        if period:
            template = period.pipeline.first()
            if template:
                # Görevleri oluşturacak bir "Admin" bul (Şirket içindeki en yetkili kişi)
                creator = User.objects.filter(profile__tenant=instance.tenant, is_superuser=True).first()
                if not creator:
                    creator = User.objects.filter(profile__tenant=instance.tenant, profile__rank=10).first()
                if not creator:
                    creator = User.objects.filter(is_superuser=True).first()

                for stage in template.stages.all():
                    task = Task.objects.create(
                        title=stage.title,
                        description=stage.description,
                        created_by=creator,
                        tenant=instance.tenant,
                        is_pipeline_task=True,
                        pipeline_stage=stage
                    )
                    # TaskAssignment modelini kullanıyoruz
                    # TaskAssignment.objects.create uses task and user
                    from .models import TaskAssignment
                    TaskAssignment.objects.create(task=task, user=instance.user)
