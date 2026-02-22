from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

# --- TENANT (ŞİRKET) ---
class Tenant(models.Model):
    name = models.CharField(max_length=100)
    tenant_id = models.CharField(max_length=20, unique=True)
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
    created_at = models.DateTimeField(auto_now_add=True)
    warning_sent = models.BooleanField(default=False)

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