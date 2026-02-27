from core import views
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    register_user, TaskViewSet, DeviceViewSet, TaskNodeViewSet, 
    UserViewSet, TaskDependencyViewSet, SurveyViewSet, PipelineViewSet
)
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
router.register(r'survey', views.SurveyViewSet, basename='survey')
router.register(r'pipeline', views.PipelineViewSet, basename='pipeline')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)), # Tüm API'ler /api/ altında olacak
    path('api/register/', register_user, name='register'),
    path('api/research/export/', views.export_activity_logs, name='research-export'),
    path('api/users/deactivate_me/', UserViewSet.as_view({'post': 'deactivate_me'}), name='deactivate-me'),
    path('api/presentation/current/', views.current_presentation),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)