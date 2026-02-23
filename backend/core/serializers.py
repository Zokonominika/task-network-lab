from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notification, Tenant, Device, Task, TaskNode, TaskDependency, TaskAssignment, TaskAttachment, UserProfile, Comment
from django.utils import timezone
from datetime import timedelta

# --- 1. USER SERIALIZERS ---

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'display_name', 'avatar_id', 'title', 'department', 'gender', 'rank', 'current_status', 'last_activity',
            'bio', 'phone', 'accent_color', 'background_style', 'privacy_settings', 'notification_settings'
        ]

class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    avatar_id = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'display_name', 'rank', 'department', 'avatar_id', 'title', 'status', 'profile']

    def get_display_name(self, obj):
        if hasattr(obj, 'profile'):
            suffix = "Bey" if obj.profile.gender == 'male' else "Hanım" if obj.profile.gender == 'female' else ""
            name = obj.first_name if obj.first_name else obj.username
            return f"{name} {suffix}".strip()
        return obj.username

    def get_rank(self, obj):
        return obj.profile.rank if hasattr(obj, 'profile') else 1

    def get_department(self, obj):
        if hasattr(obj, 'profile') and obj.profile.department:
            return obj.profile.department.name
        return "Genel"

    def get_avatar_id(self, obj):
        return obj.profile.avatar_id if hasattr(obj, 'profile') else 1
        
    def get_title(self, obj):
        return obj.profile.title if hasattr(obj, 'profile') else ''
    
    def get_status(self, obj):
        if not hasattr(obj, 'profile'):
            return 'offline'
        if obj.profile.current_status == 'offline':
            return 'offline'
        last_seen = obj.profile.last_activity
        if not last_seen or (timezone.now() - last_seen) > timedelta(seconds=30):
            return 'offline'
        return obj.profile.current_status

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                attr_name = str(attr)
                if attr_name in ['notification_settings', 'privacy_settings'] and isinstance(value, dict):
                    current_settings = getattr(profile, attr_name, {})
                    updated_settings = {**current_settings, **value}
                    setattr(profile, attr_name, updated_settings)
                else:
                    setattr(profile, attr_name, value)
            profile.save()

        return instance

# --- 2. ALT BİLEŞEN SERIALIZERS ---

class TaskAssignmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = TaskAssignment
        fields = ['id', 'user', 'is_completed', 'is_read', 'completed_at', 'is_failed']

class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    class Meta:
        model = TaskAttachment
        fields = ['id', 'file', 'file_type', 'uploaded_by', 'created_at']

class TaskNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskNode
        fields = ['id', 'task', 'user', 'position_x', 'position_y','is_pinned']

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = '__all__'

class TaskDependencySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDependency
        fields = ['id', 'source_task', 'target_task']

# --- 3. TASK SERIALIZER (Ana Serializer) ---

class TaskSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    
    node_data = serializers.SerializerMethodField()
    
    # Frontend'den ID listesi geliyor
    assignee_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False) 

    position_x = serializers.FloatField(write_only=True, required=False, default=0.0)
    position_y = serializers.FloatField(write_only=True, required=False, default=0.0)

    class Meta:
        model = Task
        fields = '__all__' 
        read_only_fields = [
            'created_by', 
            'status', 
            'assignments', 
            'attachments', 
            'node_data', 
            'warning_sent',
            'created_at', 
            'updated_at'
        ]

    def get_node_data(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            node = obj.nodes.filter(user=request.user).first()
            if node:
                # Sadece koordinat gönderiyoruz, grup bilgisi yok.
                return {
                    'id': node.id, 
                    'position_x': node.position_x, 
                    'position_y': node.position_y,
                    'is_pinned': node.is_pinned
                }
        return None
    
    def create(self, validated_data):
        assignee_ids = validated_data.pop('assignee_ids', [])
        request = self.context.get('request')

        # 2. KOORDİNATLARI AYIKLA
        pos_x = validated_data.pop('position_x', 0)
        pos_y = validated_data.pop('position_y', 0)

        task = Task.objects.create(**validated_data)
        
        # 1. Görevi Oluşturan İçin Node (get_or_create ile güvene alıyoruz)
        TaskNode.objects.get_or_create(
            task=task, 
            user=task.created_by, 
            defaults={
                'position_x': pos_x,
                'position_y': pos_y, 
                'is_pinned': False
            }
        )
        
        # 2. Atananlar İçin Döngü
        for user_id in assignee_ids:
            try:
                user = User.objects.get(id=user_id)
                # Kendisine zaten atandıysa tekrar Assignment oluşturma (Opsiyonel güvenlik)
                if user == task.created_by and not assignee_ids: 
                    continue 

                TaskAssignment.objects.create(task=task, user=user)
                
                # Işınlanma Koruması (Burada da get_or_create)
                TaskNode.objects.get_or_create(
                    task=task, 
                    user=user, 
                    defaults={'position_x': 0, 'position_y': 0}
                )
            except User.DoesNotExist:
                continue
        
        # 5. DOSYA YÜKLEME SORUNU ÇÖZÜMÜ:
        # Request içindeki dosyaları kontrol et ve kayde
        if request and request.FILES:
            # Frontend genelde 'files' veya 'attachments' adıyla gönderir.
            # Hepsini tarayalım.
            for file_key in request.FILES:
                # Bir key altında birden fazla dosya olabilir (getlist)
                files = request.FILES.getlist(file_key)
                for f in files:
                    TaskAttachment.objects.create(
                        task=task,
                        uploaded_by=task.created_by,
                        file=f,
                        file_type='instruction' # Oluşturulurken yüklenenler talimattır
                    )

        return task
    
# --- 4. DİĞER SERIALIZERS ---

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    title = serializers.CharField(write_only=True, required=False)
    gender = serializers.ChoiceField(choices=[('male', 'Erkek'), ('female', 'Kadın')], write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name', 'title', 'gender']

    def create(self, validated_data):
        title = validated_data.pop('title', '')
        gender = validated_data.pop('gender', '')
        raw_first_name = validated_data.get('first_name', '')
        raw_last_name = validated_data.get('last_name', '')
        formatted_first_name = raw_first_name.title() if raw_first_name else ''
        formatted_last_name = raw_last_name.title() if raw_last_name else ''

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=formatted_first_name,
            last_name=formatted_last_name
        )
        UserProfile.objects.create(user=user, title=title, gender=gender, tenant=None)
        return user

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'task', 'is_read', 'created_at']

class CommentSerializer(serializers.ModelSerializer):
    user_display_name = serializers.CharField(source='user.profile.display_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'task', 'user', 'user_username', 'user_display_name', 'content', 'created_at', 'is_me']
        read_only_fields = ['user', 'created_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.user == request.user
        return False