export type UserStatus = 'online' | 'busy' | 'away' | 'offline';

export interface UserData { 
    id: number; 
    username: string; 
    first_name: string; 
    last_name: string;
    display_name?: string; 
    rank?: number;
    department?: string;
    title?: string;
    gender?: string;
    status?: UserStatus;
    avatar_id?: number;
    // Settings için gereken ek alanlar
    bio?: string;
    email?: string;
    phone?: string;
    accent_color?: string;
    background_style?: string;
    privacy_settings?: {
        [key: string]: boolean | undefined; 
        email?: boolean;
        phone?: boolean;
    };
    notification_settings?: NotificationSettingsType;
}

export interface NotificationSettingsType {
    assignment: boolean;
    task_complete: boolean;
    file_upload: boolean;
    comments: boolean;
    deadline: boolean;
}

export interface Assignment { id: number; user: UserData; is_completed: boolean; is_read: boolean; is_failed?: boolean; completed_at?: string; }

export interface Attachment { id: number; file: string; file_type: 'instruction' | 'delivery'; uploaded_by: UserData; created_at: string; }

export interface TaskData {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'urgent';
  due_date: string | null;
  created_by: UserData;
  assignments: Assignment[];
  attachments: Attachment[];
  node_data: { id: number; position_x: number; position_y: number; is_pinned?: boolean;} | null;
}

export interface DependencyData { id: number; source_task: number; target_task: number; }

export interface NotificationData {
    id: number;
    title: string;
    message: string;
    notification_type: string;
    task: number | null;
    is_read: boolean;
    created_at: string;
}

export interface CommentData {
    id: number;
    user_username: string;
    user_display_name: string;
    content: string;
    created_at: string;
    is_me: boolean;
}

// İstatistik verisi için tip
export interface UserStatsData {
    totalCreated: number; 
    totalAssigned: number; 
    totalCompleted: number; 
    totalFailed: number; 
    weeklyData: number[]; 
    monthlyData: number[]; 
}