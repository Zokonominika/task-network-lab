from core import views
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import register_user, TaskViewSet, DeviceViewSet, TaskNodeViewSet, UserViewSet, TaskDependencyViewSet
from django.conf import settings
from django.conf.urls.static import static

# API Yönlendiricisi (Otomatik Link Oluşturur)
router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'devices', DeviceViewSet)
router.register(r'nodes', TaskNodeViewSet)
router.register(r'users', UserViewSet, basename='user')
router.register(r'dependencies', TaskDependencyViewSet)
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'comments', views.CommentViewSet, basename='comment')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)), # Tüm API'ler /api/ altında olacak
    path('api/register/', register_user, name='register'),
    path('api/research/export/', views.export_activity_logs, name='research-export'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)