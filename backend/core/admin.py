from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User, Group
from .models import Device, Task, TaskNode, Tenant, UserProfile, TaskAssignment, TaskDependency, Department, Notification, Comment

# Grupları gizle (İstemiyorum dedin)
admin.site.unregister(Group)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Kurumsal Detaylar'
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

    # Listede Tenant adını göstermek için yardımcı fonksiyon
    def get_tenant(self, instance):
        # 1. Profil var mı? 2. Şirket (Tenant) var mı?
        if hasattr(instance, 'profile') and instance.profile.tenant:
            return instance.profile.tenant.name
        return '🔴 Atanmamış (Bekliyor)' # Şirketi yoksa bunu yaz
        
    get_tenant.short_description = 'Şirket'

    def get_rank(self, instance):
        return f"Lvl {instance.profile.rank}" if hasattr(instance, 'profile') else '-'
    get_rank.short_description = 'Rütbe'

    def get_department(self, instance):
        if hasattr(instance, 'profile') and instance.profile.department:
            return instance.profile.department.name
        return '-'
    get_department.short_description = 'Departman'

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