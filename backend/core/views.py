from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from .models import Task, Device, TaskNode, Tenant, UserProfile, TaskAssignment, TaskDependency, TaskAttachment, Notification, Comment
from .serializers import TaskSerializer, DeviceSerializer, TaskNodeSerializer, UserSerializer, TaskDependencySerializer, TaskAttachmentSerializer, UserRegistrationSerializer, NotificationSerializer, CommentSerializer
from .logging_utils import log_event
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from datetime import timedelta
import calendar
import csv
import hashlib
import os
from django.http import HttpResponse
from rest_framework.permissions import IsAdminUser
from .models import ActivityLog

class UserViewSet(viewsets.ReadOnlyModelViewSet):
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
        
@method_decorator(csrf_exempt, name='dispatch')
class TaskNodeViewSet(viewsets.ModelViewSet):
    queryset = TaskNode.objects.all()
    serializer_class = TaskNodeSerializer

class TaskDependencyViewSet(viewsets.ModelViewSet):
    queryset = TaskDependency.objects.all()
    serializer_class = TaskDependencySerializer

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

    # --- Konum Kaydetme Fonksiyonu ---
    @action(detail=True, methods=['post'])
    def update_position(self, request, pk=None):
        try:
            task = self.get_object()
            
            # Gelen veriyi güvenli hale getir (String gelirse sayıya çevir)
            try:
                raw_x = request.data.get('x', 0)
                raw_y = request.data.get('y', 0)
                
                # "Hub'a Göre Konum" ondalıklı olabilir, yuvarlıyoruz
                x = float(raw_x) 
                y = float(raw_y)
            except (ValueError, TypeError):
                return Response({'error': 'Koordinatlar sayı olmalıdır!'}, status=400)

            # Debug Logu: Backend'in ne anladığını görelim
            print(f"🛰️ HUB RELATIVE UPDATE: Task {task.id} -> X:{x} / Y:{y}")

            # Node varsa getir, yoksa OLUŞTUR
            node, created = TaskNode.objects.get_or_create(
                task=task,
                user=request.user,
                defaults={'position_x': x, 'position_y': y}
            )

            # Her durumda güncelle (Created olsa bile, belki default 0,0 geldi ama biz x,y istiyoruz)
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
            
            # 1. SENARYO: 1 SAAT KALA
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

            # 2. SENARYO: SÜRESİ DOLANLAR
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
        log_event(self.request.user, session_id, 'task_created', {'task_id': task.id})

        for assignment in task.assignments.all():
            user = assignment.user
            if user == self.request.user: continue
            
            user_settings = getattr(user, 'profile', None) and user.profile.notification_settings
            if not user_settings or user_settings.get('assignment', True):
                Notification.objects.create(
                    user=user,
                    task=task,
                    title="Yeni Görev",
                    message=f"{self.request.user.profile.display_name or self.request.user.username} sana '{task.title}' görevini atadı.",
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
                    message=f"{request.user.username}, '{task.title}' görevine yeni bir dosya ekledi.",
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
            
            # Research Logging
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
                        message=f"{user.profile.display_name or user.username}, '{task.title}' görevindeki payını tamamladı.",
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

    @action(detail=False, methods=['post'])
    @authentication_classes([])
    @permission_classes([AllowAny])
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

        device, _ = Device.objects.get_or_create(hwid=hwid, defaults={'name': f"{username}-PC", 'tenant': user_tenant, 'is_approved': True})

        if device.tenant != user_tenant: 
            return Response({'error': 'Bu bilgisayar başka bir şirkete kilitlenmiş!'}, status=403)
        if not device.is_approved: 
            return Response({'status': 'pending', 'message': 'Cihaz onayı bekleniyor.'})

        token, _ = Token.objects.get_or_create(user=user)
        return Response({'status': 'approved', 'tenant_name': user_tenant.name, 'user': username, 'token': token.key})

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
        return Response({'status': 'Hepsi okundu'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'status': 'Okundu'})
    
    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        Notification.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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

        # Research Logging
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
                    message=f"{self.request.user.username}, '{task.title}' görevine yorum yaptı.",
                    notification_type="comment",
                    task=task
                )

@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_activity_logs(request):
    # 1. Prepare Response for User
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="activity_logs.csv"'

    # 2. Prepare Local File Save
    # Root of the project (backend/)
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    export_dir = os.path.join(backend_root, 'research_exports')
    
    if not os.path.exists(export_dir):
        os.makedirs(export_dir)
    
    timestamp = timezone.now().strftime('%Y-%m-%d_%H-%M')
    filename = f"export_{timestamp}.csv"
    local_path = os.path.join(export_dir, filename)

    # 3. Write CSV to both targets
    with open(local_path, 'w', newline='', encoding='utf-8') as f:
        # We'll use two writers: one for the response, one for the local file
        writer_res = csv.writer(response)
        writer_file = csv.writer(f)
        
        headers = [
            'session_id', 'event_type', 'group_code', 'task_id', 
            'word_count', 'char_count', 'hour_of_day', 'day_of_week', 
            'created_at', 'anonymous_user_id'
        ]
        writer_res.writerow(headers)
        writer_file.writerow(headers)

        logs = ActivityLog.objects.all().order_by('-created_at')
        for log in logs:
            anon_user_id = ""
            group_code = "N/A"
            
            if log.user:
                # 1. Anonymous ID
                hash_obj = hashlib.sha256(str(log.user.id).encode())
                anon_user_id = hash_obj.hexdigest()[0:16]
                
                # 2. Group Code
                try:
                    if hasattr(log.user, 'profile') and log.user.profile.tenant:
                        group_code = log.user.profile.tenant.tenant_id
                except:
                    pass
            
            # 3. Flatten Metadata
            meta = log.metadata if isinstance(log.metadata, dict) else {}
            task_id = meta.get('task_id', '')
            word_count = meta.get('word_count', '')
            char_count = meta.get('char_count', '')

            # 4. Temporal Data
            hour_of_day = log.created_at.hour
            day_of_week = log.created_at.strftime('%A')
            
            row = [
                log.session_id,
                log.event_type,
                group_code,
                task_id,
                word_count,
                char_count,
                hour_of_day,
                day_of_week,
                log.created_at.isoformat(),
                anon_user_id
            ]
            writer_res.writerow(row)
            writer_file.writerow(row)

    return response
