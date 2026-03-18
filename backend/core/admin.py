from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User, Group
from .models import (
    Device, Task, TaskNode, Tenant, UserProfile, TaskAssignment, 
    TaskDependency, Department, Notification, Comment, PresentationPeriod,
    SurveyQuestion, SurveyResponse, PipelineTemplate, PipelineStage,
    PipelineQualitativeQuestion, PipelineQualitativeResponse
)

def approve_users(modeladmin, request, queryset):
    for profile in queryset:
        user = profile.user
        user.is_active = True
        user.save()
        if not profile.tenant:
            profile.tenant = Tenant.objects.first()
        profile.save()
approve_users.short_description = "Seçili araştırmacıları onayla ve sunum takvimini oluştur"

# ← ADD THIS HERE
class UserProfileAdmin(admin.ModelAdmin):
    actions = [approve_users]
    list_display = ['user', 'tenant', 'title']

admin.site.register(UserProfile, UserProfileAdmin)

# Grupları gizle
admin.site.unregister(Group)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Akademik Detaylar'
    fk_name = 'user'

class CustomUserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'first_name', 'get_rank', 'get_department', 'get_tenant') # Listede görünenler
    
    # Kullanıcı DETAY sayfasına girince ne görelim?
    # Groups ve Permissions alanlarını sildik.
    fieldsets = (
        ('Temel Bilgiler', {'fields': ('username', 'password')}),
        ('Kişisel Bilgiler', {'fields': ('first_name', 'last_name',)}),
        ('Zaman Çizelgesi', {'fields': ('date_joined', 'last_login')}),
    )

    # Yeni kullanıcı eklerken hangi alanlar olsun?
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'password'),
        }),
    )

    # Hangi alanlar SALT OKUNUR olsun? (Değiştirilemesin)
    # Eğer kullanıcı yeni oluşturuluyorsa (obj=None) değiştirilebilir, 
    # ama var olan bir kullanıcıysa (obj var) kilitli kalsın.
    def get_readonly_fields(self, request, obj=None):
        if obj: # Var olan kullanıcıya bakıyorsak
            return ('username', 'first_name', 'last_name', 'date_joined', 'last_login')
        return () # Yeni oluşturuyorsak hepsi açık olsun

    @admin.display(description='Araştırma Grubu')
    def get_tenant(self, instance):
        # 1. Profil var mı? 2. Şirket (Tenant) var mı?
        if hasattr(instance, 'profile') and instance.profile.tenant:
            return instance.profile.tenant.name
        return '🔴 Atanmamış (Bekliyor)' # Şirketi yoksa bunu yaz

    @admin.display(description='Rütbe')
    def get_rank(self, instance):
        return f"Lvl {instance.profile.rank}" if hasattr(instance, 'profile') else '-'

    @admin.display(description='Departman')
    def get_department(self, instance):
        if hasattr(instance, 'profile') and instance.profile.department:
            return instance.profile.department.name
        return '-'

# User admini değiştir
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
admin.site.register(Department)

# Diğerleri
admin.site.register(Tenant)
admin.site.register(Device)
admin.site.register(Task)
# TaskNode, Assignment gibi teknik tabloları kalabalık etmesin diye gizleyebiliriz ama şimdilik kalsın.
admin.site.register(TaskNode)
admin.site.register(TaskAssignment)
admin.site.register(Notification)
admin.site.register(Comment)

@admin.register(PresentationPeriod)
class PresentationPeriodAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date')
    filter_horizontal = ('tenants',)

@admin.register(SurveyQuestion)
class SurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ('order', 'text', 'is_active')
    list_editable = ('order', 'is_active')
    list_display_links = ('text',)
    ordering = ('order',)

@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ('user', 'question', 'answer', 'submitted_at')
    list_filter = ('question', 'presentation_period')
    readonly_fields = ('submitted_at',)

class PipelineStageInline(admin.TabularInline):
    model = PipelineStage
    fields = ('order', 'title', 'is_final_stage')
    extra = 1

@admin.register(PipelineTemplate)
class PipelineTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'presentation_period')
    inlines = [PipelineStageInline]

@admin.register(PipelineStage)
class PipelineStageAdmin(admin.ModelAdmin):
    list_display = ('order', 'title', 'template', 'is_final_stage')
    list_editable = ('order', 'is_final_stage')
    list_display_links = ('title',)
    list_filter = ('template',)

@admin.register(PipelineQualitativeQuestion)
class PipelineQualitativeQuestionAdmin(admin.ModelAdmin):
    list_display = ['stage', 'text', 'is_active']
    list_filter = ['stage', 'is_active']

@admin.register(PipelineQualitativeResponse)
class PipelineQualitativeResponseAdmin(admin.ModelAdmin):
    list_display = ['user', 'question', 'created_at']
    list_filter = ['question__stage']
