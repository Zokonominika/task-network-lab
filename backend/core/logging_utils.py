from .models import ActivityLog

def log_event(user, session_id, event_type, metadata=None):
    """
    Logs an event to the ActivityLog model silently.
    """
    if metadata is None:
        metadata = {}
    
    try:
        # Ensure user is authenticated or None
        if user and not user.is_authenticated:
            user = None
            
        ActivityLog.objects.create(
            user=user,
            session_id=session_id,
            event_type=event_type,
            metadata=metadata
        )
    except Exception as e:
        # Silent failure as per requirements
        print(f"Logging failed: {e}")
