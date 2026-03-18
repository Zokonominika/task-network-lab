from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status
from django.core.management import call_command
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from .models import (
    Task, Device, TaskNode, Tenant, UserProfile, TaskAssignment, 
    TaskDependency, TaskAttachment, Notification, Comment, PresentationPeriod,
    SurveyQuestion, SurveyResponse, PipelineTemplate, PipelineStage,
    ActivityLog, ResearchUserAlias, PipelineQualitativeQuestion, PipelineQualitativeResponse
)
from .serializers import (
    TaskSerializer, DeviceSerializer, TaskNodeSerializer, UserSerializer, 
    TaskDependencySerializer, TaskAttachmentSerializer, UserRegistrationSerializer, 
    NotificationSerializer, CommentSerializer, SurveyQuestionSerializer
)
from .logging_utils import log_event
from .services import export_user_session_csv, generate_global_activity_csv

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.db.models import Count, Q, Max
from django.db.models.functions import TruncDate
from datetime import timedelta
from django.db import transaction
import calendar
import csv
import hashlib
import os
from django.http import HttpResponse
from rest_framework.permissions import IsAdminUser
from .models import ActivityLog
from datetime import datetime, date, time

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_presentation(request):
    try:
        profile = request.user.profile
        period = PresentationPeriod.objects.filter(
            tenants=profile.tenant,
            end_date__gte=date.today()
        ).order_by('end_date').first()
        
        if not period:
            return Response({'error': 'Aktif sunum yok'}, status=404)
            
        end_datetime = datetime.combine(period.end_date, time(0, 0, 0))
        return Response({'end_date': end_datetime.isoformat(), 'name': period.name})
    except:
        return Response({'error': 'Hata'}, status=400)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    def get_queryset(self):
        if not self.request.user.is_authenticated: 
            return User.objects.none()
        try: 
            if hasattr(self.request.user, 'profile'):
                return User.objects.filter(profile__tenant=self.request.user.profile.tenant)
            return User.objects.none()
        except Exception as e:
            return User.objects.none()

    @action(detail=False, methods=['post'])
    def update_status(self, request):
        status = request.data.get('status')
        if status not in ['online', 'busy', 'away', 'offline']:
            return Response({'error': 'Geçersiz durum'}, status=400)
        
        try:
            if not hasattr(request.user, 'profile'):
                return Response({'error': 'Kullanıcı profili bulunamadı.'}, status=404)
        
            profile = request.user.profile
            profile.current_status = status
            profile.save()

            if status == 'offline':
                    export_user_session_csv(request.user)
                    print(f"Logout export error: {e}")

            return Response({'status': 'Durum güncellendi', 'current': status})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    def list(self, request, *args, **kwargs):
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            UserProfile.objects.filter(user=request.user).update(last_activity=timezone.now())
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        today = timezone.localdate()

        total_created = Task.objects.filter(created_by=user).count()
        my_assignments = TaskAssignment.objects.filter(user=user)
        total_assigned = my_assignments.count()
        completed_assignments = my_assignments.filter(is_completed=True)
        total_completed = completed_assignments.count()
        total_failed = TaskAssignment.objects.filter(user=user, is_failed=True).count()

        failed_tasks = Task.objects.filter(
            assignments__user=user,
            assignments__is_completed=False,
            due_date__lt=timezone.now()
        ).count()

        # HAFTALIK GRAFİK
        start_of_week = today - timedelta(days=today.weekday())
        weekly_stats = []
        for i in range(6): 
            target_date = start_of_week + timedelta(days=i)
            completed_on_day = completed_assignments.filter(completed_at__date=target_date)
            daily_score = 0
            for assign in completed_on_day:
                task = assign.task
                if task.due_date:
                    d_date = timezone.localtime(task.due_date).date()
                    if target_date <= d_date:
                        daily_score += 1
                    else:
                        daily_score -= 1
                else:
                    daily_score += 1
            weekly_stats.append(daily_score)

        # AYLIK GRAFİK
        import calendar
        _, num_days = calendar.monthrange(today.year, today.month)
        monthly_stats = [0] * num_days
        this_month_completed = completed_assignments.filter(
            completed_at__year=today.year,
            completed_at__month=today.month
        )
        for assign in this_month_completed:
            c_day = timezone.localtime(assign.completed_at).day
            monthly_stats[c_day - 1] += 1

        return Response({
            'totalCreated': total_created,
            'totalAssigned': total_assigned,
            'totalCompleted': total_completed,
            'totalFailed': failed_tasks,
            'weeklyData': weekly_stats,
            'monthlyData': monthly_stats
        })
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        user = self.get_object()
        tenant_id = request.data.get('tenant_id')
        
        if not tenant_id:
            return Response({'error': 'Şirket seçimi zorunludur.'}, status=400)
            
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            profile = user.profile
            user.is_active = True
            user.save()

            profile = user.profile
            profile.tenant = tenant
            profile.save()
            
            log_event(request.user, request.headers.get('X-Session-ID', 'system'), 'user_approved', {'approved_user_id': user.id})
            
            return Response({'status': 'approved', 'message': f'{user.username} onaylandı ve şirkete atandı.'})
        except Tenant.DoesNotExist:
            return Response({'error': 'Şirket bulunamadı.'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
            
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def deactivate_me(self, request):
        user = request.user
        session_id = request.headers.get('X-Session-ID', 'unknown')

        with transaction.atomic():
            already_logged = ActivityLog.objects.select_for_update().filter(
                user=user,
                event_type='experiment_completed'
            ).exists()

            if already_logged:
                return Response({'status': 'already_completed'})

            # 1. Log event INSIDE the transaction
            log_event(user, session_id, 'experiment_completed', {
                'username': user.username,
                'deactivated_at': timezone.now().isoformat()
            })

        # 2. Export user CSV
            export_user_session_csv(user)
            print(f"Deactivation export error: {e}")

        # 3. Set inactive
        user.is_active = False
        user.save()
        
        # 4. Trigger final export
        try:
            call_command('auto_export_logs')
        except Exception as e:
            print(f"Final export error: {e}")
            
        return Response({'status': 'success', 'message': 'Hesabınız pasif hale getirildi ve verileriniz dışa aktarıldı.'})
        
@method_decorator(csrf_exempt, name='dispatch')
class TaskNodeViewSet(viewsets.ModelViewSet):
    queryset = TaskNode.objects.all()
    serializer_class = TaskNodeSerializer

class TaskDependencyViewSet(viewsets.ModelViewSet):
    queryset = TaskDependency.objects.all()
    serializer_class = TaskDependencySerializer

    def perform_create(self, serializer):
        source_task = serializer.validated_data.get('source_task')
        target_task = serializer.validated_data.get('target_task')

        if not (source_task.is_pipeline_task or target_task.is_pipeline_task):
            if source_task.due_date and target_task.due_date:
                if source_task.due_date > target_task.due_date:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError("Kaynak görevin süresi, hedef görevden sonra bitemez!")

        serializer.save()

@method_decorator(csrf_exempt, name='dispatch')
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Task.objects.none()
        
        user = self.request.user
        return Task.objects.filter(
            Q(created_by=user) | Q(assignments__user=user)
        ).distinct()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        session_id = request.headers.get('X-Session-ID', 'unknown_session')
        # Research logging for file downloads (triggered on task retrieval per instructions)
        for attachment in instance.attachments.all():
            log_event(request.user, session_id, 'file_downloaded', {
                'task_id': instance.id,
                'file_type': attachment.file_type
            })
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def update_position(self, request, pk=None):
        try:
            task = self.get_object()
            
            try:
                raw_x = request.data.get('x', 0)
                raw_y = request.data.get('y', 0)
                x = float(raw_x) 
                y = float(raw_y)
            except (ValueError, TypeError):
                return Response({'error': 'Koordinatlar sayı olmalıdır!'}, status=400)

            print(f"🛰️ HUB RELATIVE UPDATE: Task {task.id} -> X:{x} / Y:{y}")

            node, created = TaskNode.objects.get_or_create(
                task=task,
                user=request.user,
                defaults={'position_x': x, 'position_y': y}
            )

            node.position_x = x
            node.position_y = y
            node.save()

            return Response({'status': 'Yörünge sabitlendi', 'id': node.id, 'pos': {'x': x, 'y': y}})
            
        except Exception as e:
            print(f"💥 Backend Hatası: {e}")
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def check_deadlines(self, request):
        try:
            now = timezone.now()
            
            warning_time = now + timedelta(hours=1)
            tasks_near_deadline = Task.objects.filter(
                status='active', 
                warning_sent=False, 
                due_date__lte=warning_time, 
                due_date__gt=now
            )

            for task in tasks_near_deadline:
                for assignment in task.assignments.all():
                    if not assignment.is_completed:
                        user_settings = getattr(assignment.user, 'profile', None) and assignment.user.profile.notification_settings
                        if not user_settings or user_settings.get('deadline_warning', True):
                            Notification.objects.create(
                                user=assignment.user,
                                title="⏳ Son 1 Saat!",
                                message=f"'{task.title}' görevi için son 1 saatin kaldı!",
                                notification_type="deadline",
                                task=task
                            )
                task.warning_sent = True
                task.save()

            expired_tasks = Task.objects.filter(status='active', due_date__lte=now)

            for task in expired_tasks:
                for assignment in task.assignments.all():
                    if not assignment.is_completed and not assignment.is_failed:
                        assignment.is_failed = True 
                        assignment.save()
                        
                        user_settings = getattr(assignment.user, 'profile', None) and assignment.user.profile.notification_settings
                        if not user_settings or user_settings.get('deadline', True):
                            Notification.objects.create(
                                user=assignment.user,
                                title="❌ Süre Doldu",
                                message=f"'{task.title}' görevinin süresi doldu ve erişim kapatıldı.",
                                notification_type="deadline",
                                task=task
                            )

            return Response({"status": "Deadlines checked"})
            
        except Exception as e:
            print(f"Deadline Check Hatası: {e}")
            return Response({"status": "Error", "detail": str(e)}, status=500)

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        # Research Logging
        session_id = self.request.headers.get('X-Session-ID', 'unknown_session')
        log_event(self.request.user, session_id, 'task_created', {
            'task_id': task.id,
            'parent_task_id': task.parent_task.id if task.parent_task else None
        })

        for assignment in task.assignments.all():
            user = assignment.user
            if user == self.request.user: continue
            
            user_settings = getattr(user, 'profile', None) and user.profile.notification_settings
            if not user_settings or user_settings.get('assignment', True):
                Notification.objects.create(
                    user=user,
                    task=task,
                    title="Yeni Görev",
                    message=f"{self.request.user.first_name or self.request.user.username} sana '{task.title}' görevini atadı.",
                    notification_type="assignment" 
                )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_priority = instance.priority
        task = serializer.save()
        
        if old_priority != task.priority:
            recipients = [a.user for a in task.assignments.all()]
            if task.created_by not in recipients: recipients.append(task.created_by)
            
            for user in recipients:
                if user != self.request.user:
                    Notification.objects.create(
                        user=user,
                        task=task,
                        title="Öncelik Değişti",
                        message=f"'{task.title}' görevinin önceliği '{task.get_priority_display()}' olarak güncellendi.",
                        notification_type='priority_changed'
                    )

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_file(self, request, pk=None):
        task = self.get_object()
        file_obj = request.FILES['file']
        file_type = request.data.get('file_type', 'instruction')

        attachment = TaskAttachment.objects.create(
            task=task,
            file=file_obj,
            file_type=file_type,
            uploaded_by=request.user
        )

        recipients = []
        if request.user == task.created_by:
            for assignment in task.assignments.all():
                recipients.append(assignment.user)
        else:
            recipients.append(task.created_by)

        for recipient in recipients:
            user_settings = getattr(recipient, 'profile', None) and recipient.profile.notification_settings
            if not user_settings or user_settings.get('file_upload', True):
                Notification.objects.create(
                    user=recipient,
                    title="Dosya Eklendi",
                    message=f"{request.user.first_name or request.user.username}, '{task.title}' görevine yeni bir dosya ekledi.",
                    notification_type="file",
                )

        return Response(TaskAttachmentSerializer(attachment).data, status=201)

    @action(detail=True, methods=['post'])
    def complete_my_part(self, request, pk=None):
        task = self.get_object()
        user = request.user
        try:
            assignment = TaskAssignment.objects.filter(task=task, user=user).first()
            if not assignment:
                return Response({'error': 'Bu görev sana atanmamış.'}, status=403)

            assignment.is_completed = True
            assignment.completed_at = timezone.now()
            assignment.save()
            
            session_id = request.headers.get('X-Session-ID', 'unknown_session')
            log_event(user, session_id, 'task_completed', {'task_id': task.id})

            creator = task.created_by
            creator_settings = getattr(creator, 'profile', None) and creator.profile.notification_settings

            if creator != user:
                if not creator_settings or creator_settings.get('task_complete', True):
                    Notification.objects.create(
                        user=creator,
                        task=task,
                        title="Bölüm Tamamlandı",
                        message=f"{user.first_name or user.username}, '{task.title}' görevindeki payını tamamladı.",
                        notification_type='task_completed'
                    )
            
            all_done = task.assignments.all().count() > 0 and all(a.is_completed for a in task.assignments.all())
            if all_done:
                if creator != user:
                    if not creator_settings or creator_settings.get('task_complete', True):
                        Notification.objects.create(
                            user=creator,
                            task=task,
                            title="🎉 Görev Hazır!",
                            message=f"'{task.title}' görevi tüm ekip tarafından tamamlandı. Arşivleyebilirsiniz.",
                            notification_type='all_completed'
                        )

            return Response({'status': 'Görevi tamamladın!'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        task = self.get_object()
        user = request.user
        try:
            assignment = TaskAssignment.objects.filter(task=task, user=user).first()
            if assignment and not assignment.is_read:
                assignment.is_read = True
                assignment.save()
                return Response({'status': 'Okundu'})
            return Response({'status': 'Zaten okunmuş'})
        except:
            return Response({'status': 'Pass'}) 

    @action(detail=True, methods=['post'])
    def archive_task(self, request, pk=None):
        task = self.get_object()
        if task.created_by != request.user:
            return Response({'error': 'Yetkin yok.'}, status=403)
        
        for attachment in task.attachments.all():
            attachment.file.delete() 
            attachment.delete()      
            
        task.status = 'completed'
        task.save()
        return Response({'status': 'Görev kapatıldı.'})

@method_decorator(csrf_exempt, name='dispatch')
class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def login_user(self, request):
        tenant_code_input = request.data.get('tenant_code')
        username = request.data.get('username')
        password = request.data.get('password')
        hwid = request.data.get('hwid')

        user = authenticate(username=username, password=password)
        if user is None:
            return Response({'error': 'Kullanıcı adı veya şifre hatalı!'}, status=status.HTTP_401_UNAUTHORIZED)

        login(request, user)

        try:
            user_tenant = user.profile.tenant
            if user_tenant is None:
                return Response({'error': 'Hesabınız onaylandı ancak henüz bir Şirkete atanmadı.'}, status=403)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Profil hatası! Şirket kaydı yok.'}, status=403)

        if str(user_tenant.tenant_id).strip() != str(tenant_code_input).strip():
            return Response({'error': 'Girdiğiniz Şirket Kodu bu kullanıcıya ait değil!'}, status=403)

        token, _ = Token.objects.get_or_create(user=user)

        # Logging login event
        session_id = request.headers.get('X-Session-ID', 'unknown_session')
        log_event(user, session_id, 'login', {'timestamp': timezone.now().isoformat()})

        # Generate Alias if not exists
        if not ResearchUserAlias.objects.filter(user=user).exists():
            is_kanban = user_tenant.is_kanban
            prefix = 'B' if is_kanban else 'A'
            count = ResearchUserAlias.objects.filter(alias__startswith=prefix).count()
            alias = f"{prefix}{count + 1}"
            
            hash_obj = hashlib.sha256(str(user.id).encode())
            anonymous_id = hash_obj.hexdigest()[0:16]
            
            ResearchUserAlias.objects.create(
                user=user,
                alias=alias,
                anonymous_id=anonymous_id
            )

        # Auto-create pipeline tasks if missing
        from .models import Task, TaskAssignment, PipelineTemplate, PresentationPeriod
        has_pipeline = TaskAssignment.objects.filter(
            user=user,
            task__is_pipeline_task=True
        ).exists()

        if not has_pipeline:
            period = PresentationPeriod.objects.order_by('-start_date').first()
            if period:
                template = period.pipeline.first()
                if template:
                    superuser = User.objects.filter(is_superuser=True).first()
                    for stage in template.stages.all().order_by('order'):
                        task = Task.objects.create(
                            title=stage.title,
                            description=stage.description or '',
                            created_by=superuser,
                            tenant=user.profile.tenant,
                            is_pipeline_task=True,
                            pipeline_stage=stage,
                            status='active'
                        )
                        TaskAssignment.objects.create(task=task, user=user)

        return Response({
            'status': 'approved', 
            'tenant_name': user_tenant.name, 
            'user': username, 
            'token': token.key,
            'is_kanban': user_tenant.is_kanban
        })

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'status': 'Kayıt başarılı! Lütfen IT departmanının şirket ataması yapmasını bekleyin.'}, status=201)
    return Response(serializer.errors, status=400)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated: return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        session_id = request.headers.get('X-Session-ID', 'system')
        log_event(request.user, session_id, 'notification_seen', {})
        return Response({'status': 'Hepsi okundu'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'status': 'Okundu'})
    
    @action(detail=False, methods=['post', 'delete'])
    def clear_all(self, request):
        count = Notification.objects.filter(user=request.user).count()
        Notification.objects.filter(user=request.user).delete()
        session_id = request.headers.get('X-Session-ID', 'system')
        log_event(request.user, session_id, 'notification_cleared', {'count': count})
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tutorial_status(request):
    if request.method == 'GET':
        return Response({'tutorial_seen': request.user.profile.tutorial_seen})
    elif request.method == 'POST':
        request.user.profile.tutorial_seen = True
        request.user.profile.save()
        return Response({'status': 'saved'})

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def get_queryset(self):
        queryset = Comment.objects.all()
        task_id = self.request.query_params.get('task_id')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
    
    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        task = comment.task

        session_id = self.request.headers.get('X-Session-ID', 'unknown_session')
        word_count = len(comment.content.split())
        char_count = len(comment.content)
        log_event(self.request.user, session_id, 'comment_sent', {
            'task_id': task.id,
            'word_count': word_count,
            'char_count': char_count
        })

        recipients = set([a.user for a in task.assignments.all()])
        recipients.add(task.created_by)
        
        if self.request.user in recipients:
            recipients.remove(self.request.user)

        for recipient in recipients:
            user_settings = getattr(recipient, 'profile', None) and recipient.profile.notification_settings
            if not user_settings or user_settings.get('comments', True):
                Notification.objects.create(
                    user=recipient,
                    title="Yeni Yorum",
                    message=f"{self.request.user.first_name or self.request.user.username}, '{task.title}' görevine yorum yaptı.",
                    notification_type="comment",
                    task=task
                )

@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_activity_logs(request):
    try:
        local_path = generate_global_activity_csv()
        with open(local_path, 'r', encoding='utf-8') as f:
            response = HttpResponse(f.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{os.path.basename(local_path)}"'
            return response
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# export_user_csv function removed and replaced by service calls

class SurveyViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action == 'questions':
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def questions(self, request):
        questions = SurveyQuestion.objects.filter(is_active=True).order_by('order')
        serializer = SurveyQuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def submit_responses(self, request):
        responses_data = request.data.get('responses', [])
        if not responses_data:
            return Response({'error': 'Hiç yanıt gönderilmedi.'}, status=400)

        session_id = request.headers.get('X-Session-ID', 'unknown_session')
        
        now = timezone.now().date()
        period = PresentationPeriod.objects.filter(start_date__lte=now, end_date__gte=now).first()

        survey_responses = []
        suspicious_count = 0
        total_time_ms = 0
        
        for item in responses_data:
            q_id = item.get('question_id')
            answer = item.get('answer')
            time_ms = item.get('time_on_question_ms', 0)
            
            try:
                question = SurveyQuestion.objects.get(id=q_id)
                
                threshold = len(question.text) * 50
                is_suspicious = time_ms < threshold
                if is_suspicious:
                    suspicious_count += 1
                
                total_time_ms += time_ms

                survey_responses.append(SurveyResponse(
                    user=request.user,
                    question=question,
                    answer=answer,
                    time_on_question_ms=time_ms,
                    is_suspicious=is_suspicious,
                    session_id=session_id,
                    presentation_period=period
                ))
            except SurveyQuestion.DoesNotExist:
                continue

        if survey_responses:
            SurveyResponse.objects.bulk_create(survey_responses)
            
            log_event(request.user, session_id, 'survey_completed', {
                'question_count': len(survey_responses),
                'is_suspicious': suspicious_count > 0,
                'avg_response_ms': total_time_ms / len(survey_responses) if survey_responses else 0,
                'timestamp': timezone.now().isoformat()
            })
            
            return Response({'status': 'Anket başarıyla gönderildi.', 'suspicious_count': suspicious_count})
        
        return Response({'error': 'Geçerli yanıt bulunamadı.'}, status=400)

class PipelineViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_stages(self, request):
        user = request.user
        pipeline_tasks = Task.objects.filter(
            assignments__user=user, 
            is_pipeline_task=True
        ).select_related('pipeline_stage').order_by('pipeline_stage__order')

        results = []
        is_previous_completed = True 

        for task in pipeline_tasks:
            assignment = task.assignments.filter(user=user).first()
            is_completed = assignment.is_completed if assignment else False
            
            unlocked = is_previous_completed
            
            results.append({
                'id': task.id,
                'task_id': task.id,
                'stage_id': task.pipeline_stage.id if task.pipeline_stage else None,
                'title': task.title,
                'description': task.description,
                'status': task.status,
                'is_completed': is_completed,
                'unlocked': unlocked,
                'order': task.pipeline_stage.order if task.pipeline_stage else 0,
                'is_final_stage': task.pipeline_stage.is_final_stage if task.pipeline_stage else False
            })
            
            is_previous_completed = is_completed

        return Response(results)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_qualitative_question(request, stage_id):
    # Get all questions for this stage
    # Exclude questions already answered by this user
    # Return random unanswered question
    answered_ids = PipelineQualitativeResponse.objects.filter(
        user=request.user,
        question__stage_id=stage_id
    ).values_list('question_id', flat=True)

    questions = PipelineQualitativeQuestion.objects.filter(
        stage_id=stage_id,
        is_active=True
    ).exclude(id__in=answered_ids)

    if not questions.exists():
        return Response({'question': None})

    question = questions.order_by('?').first()
    return Response({
        'question_id': question.id,
        'text': question.text
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_qualitative_response(request):
    question_id = request.data.get('question_id')
    response_text = request.data.get('response_text', '')
    session_id = request.headers.get('X-Session-ID', 'unknown')

    try:
        question = PipelineQualitativeQuestion.objects.get(id=question_id)
        PipelineQualitativeResponse.objects.create(
            user=request.user,
            question=question,
            response_text=response_text,
            session_id=session_id
        )
        log_event(request.user, session_id, 'qualitative_response_submitted', {
            'stage_id': question.stage_id,
            'question_id': question_id,
            'response_length': len(response_text)
        })
        return Response({'status': 'saved'})
    except PipelineQualitativeQuestion.DoesNotExist:
        return Response({'error': 'Soru bulunamadı'}, status=404)

    @action(detail=False, methods=['post'])
    def complete_stage(self, request):
        task_id = request.data.get('task_id')
        if not task_id:
            return Response({'error': 'task_id zorunludur.'}, status=400)
            
        try:
            task = Task.objects.get(id=task_id, is_pipeline_task=True)
            assignment = task.assignments.filter(user=request.user).first()
            
            if not assignment:
                return Response({'error': 'Bu aşama sana atanmamış.'}, status=403)
                
            if assignment.is_completed:
                return self.my_stages(request)
                
            assignment.is_completed = True
            assignment.completed_at = timezone.now()
            assignment.save()
            
            session_id = request.headers.get('X-Session-ID', 'system')
            log_event(request.user, session_id, 'stage_completed', {
                'stage_title': task.title,
                'stage_order': task.pipeline_stage.order if task.pipeline_stage else 0,
                'task_id': task.id
            })
            
            if task.pipeline_stage and task.pipeline_stage.is_final_stage:
                log_event(request.user, session_id, 'final_stage_reached', {
                    'template_name': task.pipeline_stage.template.name
                })
                
            return self.my_stages(request)
            
        except Task.DoesNotExist:
            return Response({'error': 'Aşama bulunamadı.'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_interaction(request):
    session_id = request.headers.get('X-Session-ID', 'unknown')
    event_type = request.data.get('event_type', 'unknown')
    metadata = {k: v for k, v in request.data.items() if k != 'event_type'}
    log_event(request.user, session_id, event_type, metadata)
    return Response({'status': 'logged'})