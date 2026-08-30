export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  full_name: string;
  bio: string | null;
  bio_long?: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  website_url?: string | null;
  avatar_initial: string;
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: number;
  user_id: string | null;
  content: string;
  post_type: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  image_url: string | null;
  video_url: string | null;
  video_path: string | null;
  video_mime_type: string | null;
  video_byte_size: number | null;
  media_status: string;
  upload_started_at: string | null;
  upload_completed_at: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_error: string | null;
  processing_progress: number | null;
  media_duration_ms: number | null;
  media_width: number | null;
  media_height: number | null;
  media_fps: number | null;
  media_codec: string | null;
  media_bitrate: number | null;
  media_file_size: number | null;
  media_aspect_ratio: string | null;
  thumbnail_path: string | null;
  media_pipeline: Record<string, unknown>;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  created_at: string;
};

export type PostLikeRow = {
  post_id: number;
  user_id: string;
  created_at: string;
};

export type PostCommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  body: string;
  created_at: string;
};

export type PostSaveRow = {
  user_id: string;
  post_id: number;
  created_at: string;
};

export type PostShareRow = {
  post_id: number;
  viewer_key: string;
  user_id: string | null;
  last_shared_at: string;
};

export type PostViewRow = {
  post_id: number;
  viewer_key: string;
  last_viewed_at: string;
};

export type ConversationRow = {
  id: string;
  kind: "direct" | "group" | "channel" | "phone";
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  metadata: Record<string, unknown>;
};

export type ConversationParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: "member" | "admin" | "owner";
  joined_at: string;
  last_read_at: string | null;
  last_read_message_id: string | null;
  unread_count: number;
  is_muted: boolean;
  muted_until: string | null;
  is_archived: boolean;
  typing_at: string | null;
};

export type MessageReactionRow = {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type MessageHideRow = {
  message_id: string;
  user_id: string;
  hidden_at: string;
};

export type DirectConversationPairRow = {
  user_low: string;
  user_high: string;
  conversation_id: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  message_type:
    | "text"
    | "image"
    | "video"
    | "file"
    | "audio"
    | "system"
    | "call";
  reply_to_message_id: string | null;
  forwarded_from_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_for: "sender" | "everyone" | null;
  client_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type MessageAttachmentRow = {
  id: string;
  message_id: string;
  kind: "image" | "video" | "file" | "audio";
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WatchSignalRow = {
  id: number;
  post_id: number;
  creator_id: string | null;
  user_id: string | null;
  viewer_key: string;
  session_id: string;
  surface: "discover" | "watch";
  watch_duration_ms: number;
  watch_percent: number;
  completed: boolean;
  rewatch_count: number;
  liked: boolean;
  saved: boolean;
  shared: boolean;
  commented: boolean;
  follow_after_watch: boolean;
  skipped_early: boolean;
  ml_features: Record<string, unknown>;
  model_version: string;
  created_at: string;
  updated_at: string;
};

export type UserInterestProfileRow = {
  user_id: string;
  tag_weights: Record<string, unknown>;
  creator_affinity: Record<string, unknown>;
  signal_counts: Record<string, unknown>;
  avg_watch_percent: number;
  completion_rate: number;
  skip_rate: number;
  positive_engagement_rate: number;
  total_signals: number;
  freshness_score: number;
  ml_features: Record<string, unknown>;
  model_version: string;
  last_computed_at: string;
  created_at: string;
  updated_at: string;
};

export type CreatorQualitySignalRow = {
  creator_id: string;
  video_count: number;
  total_watches: number;
  avg_watch_percent: number;
  completion_rate: number;
  rewatch_rate: number;
  like_rate: number;
  save_rate: number;
  share_rate: number;
  comment_rate: number;
  follow_rate: number;
  skip_rate: number;
  quality_score: number;
  ml_features: Record<string, unknown>;
  model_version: string;
  last_computed_at: string;
  created_at: string;
  updated_at: string;
};

export type VideoQualitySignalRow = {
  post_id: number;
  creator_id: string | null;
  total_watches: number;
  avg_watch_percent: number;
  avg_watch_duration_ms: number;
  completion_rate: number;
  rewatch_rate: number;
  like_rate: number;
  save_rate: number;
  share_rate: number;
  comment_rate: number;
  follow_rate: number;
  skip_rate: number;
  quality_score: number;
  ml_features: Record<string, unknown>;
  model_version: string;
  last_computed_at: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          full_name: string;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          avatar_initial?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          full_name?: string;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          avatar_initial?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: {
          id?: number;
          user_id: string;
          content?: string;
          post_type: string;
          author_name: string;
          author_username: string;
          author_avatar: string;
          image_url?: string | null;
          video_url?: string | null;
          video_path?: string | null;
          video_mime_type?: string | null;
          video_byte_size?: number | null;
          media_status?: string;
          upload_started_at?: string | null;
          upload_completed_at?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          processing_error?: string | null;
          processing_progress?: number | null;
          media_duration_ms?: number | null;
          media_width?: number | null;
          media_height?: number | null;
          media_fps?: number | null;
          media_codec?: string | null;
          media_bitrate?: number | null;
          media_file_size?: number | null;
          media_aspect_ratio?: string | null;
          thumbnail_path?: string | null;
          media_pipeline?: Record<string, unknown>;
          likes?: number;
          comments?: number;
          shares?: number;
          saves?: number;
          views?: number;
          created_at?: string;
        };
        Update: {
          content?: string;
          post_type?: string;
          author_name?: string;
          author_username?: string;
          author_avatar?: string;
          image_url?: string | null;
          video_url?: string | null;
          video_path?: string | null;
          video_mime_type?: string | null;
          video_byte_size?: number | null;
          media_status?: string;
          upload_started_at?: string | null;
          upload_completed_at?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          processing_error?: string | null;
          processing_progress?: number | null;
          media_duration_ms?: number | null;
          media_width?: number | null;
          media_height?: number | null;
          media_fps?: number | null;
          media_codec?: string | null;
          media_bitrate?: number | null;
          media_file_size?: number | null;
          media_aspect_ratio?: string | null;
          thumbnail_path?: string | null;
          media_pipeline?: Record<string, unknown>;
          likes?: number;
          comments?: number;
          shares?: number;
          saves?: number;
          views?: number;
        };
        Relationships: [];
      };
      post_likes: {
        Row: PostLikeRow;
        Insert: {
          post_id: number;
          user_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      post_comments: {
        Row: PostCommentRow;
        Insert: {
          id?: number;
          post_id: number;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      post_saves: {
        Row: PostSaveRow;
        Insert: {
          user_id: string;
          post_id: number;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      post_shares: {
        Row: PostShareRow;
        Insert: {
          post_id: number;
          viewer_key: string;
          user_id?: string | null;
          last_shared_at?: string;
        };
        Update: {
          user_id?: string | null;
          last_shared_at?: string;
        };
        Relationships: [];
      };
      post_views: {
        Row: PostViewRow;
        Insert: {
          post_id: number;
          viewer_key: string;
          last_viewed_at?: string;
        };
        Update: {
          last_viewed_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: ConversationRow;
        Insert: {
          id?: string;
          kind?: ConversationRow["kind"];
          title?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          title?: string | null;
          updated_at?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      conversation_participants: {
        Row: ConversationParticipantRow;
        Insert: {
          conversation_id: string;
          user_id: string;
          role?: ConversationParticipantRow["role"];
          joined_at?: string;
          last_read_at?: string | null;
          last_read_message_id?: string | null;
          unread_count?: number;
          is_muted?: boolean;
          muted_until?: string | null;
          is_archived?: boolean;
          typing_at?: string | null;
        };
        Update: {
          role?: ConversationParticipantRow["role"];
          last_read_at?: string | null;
          last_read_message_id?: string | null;
          unread_count?: number;
          is_muted?: boolean;
          muted_until?: string | null;
          is_archived?: boolean;
          typing_at?: string | null;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: MessageReactionRow;
        Insert: {
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      message_hides: {
        Row: MessageHideRow;
        Insert: {
          message_id: string;
          user_id: string;
          hidden_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      direct_conversation_pairs: {
        Row: DirectConversationPairRow;
        Insert: {
          user_low: string;
          user_high: string;
          conversation_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          body?: string | null;
          message_type?: MessageRow["message_type"];
          reply_to_message_id?: string | null;
          forwarded_from_message_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          deleted_for?: MessageRow["deleted_for"];
          client_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          body?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          deleted_for?: MessageRow["deleted_for"];
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: MessageAttachmentRow;
        Insert: {
          id?: string;
          message_id: string;
          kind: MessageAttachmentRow["kind"];
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          byte_size?: number | null;
          duration_ms?: number | null;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          metadata?: Record<string, unknown>;
          sort_order?: number;
        };
        Relationships: [];
      };
      watch_signals: {
        Row: WatchSignalRow;
        Insert: {
          post_id: number;
          creator_id?: string | null;
          user_id?: string | null;
          viewer_key: string;
          session_id: string;
          surface?: WatchSignalRow["surface"];
          watch_duration_ms?: number;
          watch_percent?: number;
          completed?: boolean;
          rewatch_count?: number;
          liked?: boolean;
          saved?: boolean;
          shared?: boolean;
          commented?: boolean;
          follow_after_watch?: boolean;
          skipped_early?: boolean;
          ml_features?: Record<string, unknown>;
          model_version?: string;
        };
        Update: {
          watch_duration_ms?: number;
          watch_percent?: number;
          completed?: boolean;
          rewatch_count?: number;
          liked?: boolean;
          saved?: boolean;
          shared?: boolean;
          commented?: boolean;
          follow_after_watch?: boolean;
          skipped_early?: boolean;
          ml_features?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_interest_profiles: {
        Row: UserInterestProfileRow;
        Insert: {
          user_id: string;
          tag_weights?: Record<string, unknown>;
          creator_affinity?: Record<string, unknown>;
          signal_counts?: Record<string, unknown>;
          avg_watch_percent?: number;
          completion_rate?: number;
          skip_rate?: number;
          positive_engagement_rate?: number;
          total_signals?: number;
          freshness_score?: number;
          ml_features?: Record<string, unknown>;
          model_version?: string;
        };
        Update: {
          tag_weights?: Record<string, unknown>;
          creator_affinity?: Record<string, unknown>;
          signal_counts?: Record<string, unknown>;
          avg_watch_percent?: number;
          completion_rate?: number;
          skip_rate?: number;
          positive_engagement_rate?: number;
          total_signals?: number;
          freshness_score?: number;
          ml_features?: Record<string, unknown>;
          model_version?: string;
          last_computed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_quality_signals: {
        Row: CreatorQualitySignalRow;
        Insert: {
          creator_id: string;
          video_count?: number;
          total_watches?: number;
          avg_watch_percent?: number;
          completion_rate?: number;
          rewatch_rate?: number;
          like_rate?: number;
          save_rate?: number;
          share_rate?: number;
          comment_rate?: number;
          follow_rate?: number;
          skip_rate?: number;
          quality_score?: number;
          ml_features?: Record<string, unknown>;
          model_version?: string;
        };
        Update: {
          video_count?: number;
          total_watches?: number;
          avg_watch_percent?: number;
          completion_rate?: number;
          rewatch_rate?: number;
          like_rate?: number;
          save_rate?: number;
          share_rate?: number;
          comment_rate?: number;
          follow_rate?: number;
          skip_rate?: number;
          quality_score?: number;
          ml_features?: Record<string, unknown>;
          model_version?: string;
          last_computed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      video_quality_signals: {
        Row: VideoQualitySignalRow;
        Insert: {
          post_id: number;
          creator_id?: string | null;
          total_watches?: number;
          avg_watch_percent?: number;
          avg_watch_duration_ms?: number;
          completion_rate?: number;
          rewatch_rate?: number;
          like_rate?: number;
          save_rate?: number;
          share_rate?: number;
          comment_rate?: number;
          follow_rate?: number;
          skip_rate?: number;
          quality_score?: number;
          ml_features?: Record<string, unknown>;
          model_version?: string;
        };
        Update: {
          creator_id?: string | null;
          total_watches?: number;
          avg_watch_percent?: number;
          avg_watch_duration_ms?: number;
          completion_rate?: number;
          rewatch_rate?: number;
          like_rate?: number;
          save_rate?: number;
          share_rate?: number;
          comment_rate?: number;
          follow_rate?: number;
          skip_rate?: number;
          quality_score?: number;
          ml_features?: Record<string, unknown>;
          model_version?: string;
          last_computed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      toggle_post_like: {
        Args: { p_post_id: number };
        Returns: { liked: boolean; likes: number };
      };
      toggle_post_save: {
        Args: { p_post_id: number };
        Returns: { saved: boolean; saves: number };
      };
      record_post_share: {
        Args: { p_post_id: number; p_viewer_key?: string | null };
        Returns: { counted: boolean; shares: number };
      };
      record_post_view: {
        Args: { p_post_id: number; p_viewer_key?: string | null };
        Returns: { counted: boolean; views: number };
      };
      record_watch_signal: {
        Args: {
          p_post_id: number;
          p_session_id: string;
          p_viewer_key?: string | null;
          p_surface?: string;
          p_watch_duration_ms?: number;
          p_watch_percent?: number;
          p_completed?: boolean;
          p_rewatch_count?: number;
          p_liked?: boolean;
          p_saved?: boolean;
          p_shared?: boolean;
          p_commented?: boolean;
          p_follow_after_watch?: boolean;
          p_skipped_early?: boolean | null;
        };
        Returns: Record<string, unknown>;
      };
      resolve_interaction_viewer_key: {
        Args: { p_viewer_key: string };
        Returns: string;
      };
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string };
        Returns: string;
      };
      mark_conversation_read: {
        Args: {
          p_conversation_id: string;
          p_message_id?: string | null;
        };
        Returns: undefined;
      };
      set_conversation_typing: {
        Args: {
          p_conversation_id: string;
          p_is_typing?: boolean;
        };
        Returns: undefined;
      };
      list_conversation_messages: {
        Args: {
          p_conversation_id: string;
          p_limit?: number;
          p_before_created_at?: string | null;
          p_before_id?: string | null;
        };
        Returns: MessageRow[];
      };
      list_conversation_peers: {
        Args: { p_conversation_ids: string[] };
        Returns: Array<{
          conversation_id: string;
          user_id: string;
          role: string;
          typing_at: string | null;
          last_read_at: string | null;
        }>;
      };
      is_conversation_participant: {
        Args: { p_conversation_id: string };
        Returns: boolean;
      };
      set_conversation_mute: {
        Args: { p_conversation_id: string; p_mute_option: string };
        Returns: undefined;
      };
      hide_message_for_me: {
        Args: { p_message_id: string };
        Returns: undefined;
      };
      edit_own_text_message: {
        Args: { p_message_id: string; p_body: string };
        Returns: MessageRow;
      };
      soft_delete_message_for_everyone: {
        Args: { p_message_id: string };
        Returns: MessageRow;
      };
      toggle_message_reaction: {
        Args: { p_message_id: string; p_emoji: string };
        Returns: {
          messageId: string;
          emoji: string;
          removed: boolean;
          userId: string;
        };
      };
      list_message_reactions: {
        Args: {
          p_conversation_id: string;
          p_message_ids?: string[] | null;
        };
        Returns: Array<{
          message_id: string;
          emoji: string;
          count: number;
          reacted_by_me: boolean;
        }>;
      };
      is_conversation_muted_for_user: {
        Args: {
          p_conversation_id: string;
          p_user_id?: string;
        };
        Returns: boolean;
      };
      discover_user_by_username: {
        Args: { p_username: string };
        Returns: Array<{
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>;
      };
      discover_user_by_email: {
        Args: { p_email: string };
        Returns: Array<{
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>;
      };
      discover_user_by_phone: {
        Args: { p_phone: string };
        Returns: Array<{
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }>;
      };
      get_own_communication_privacy: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          find_by_phone: string;
          find_by_email: string;
          who_can_message: string;
          who_can_call: string;
          read_receipts_enabled: boolean;
          last_seen_visible: string;
        };
      };
      set_own_communication_privacy: {
        Args: {
          p_find_by_phone?: string | null;
          p_find_by_email?: string | null;
          p_who_can_message?: string | null;
          p_who_can_call?: string | null;
          p_read_receipts_enabled?: boolean | null;
          p_last_seen_visible?: string | null;
        };
        Returns: {
          user_id: string;
          find_by_phone: string;
          find_by_email: string;
          who_can_message: string;
          who_can_call: string;
          read_receipts_enabled: boolean;
          last_seen_visible: string;
        };
      };
      get_own_phone_identity: {
        Args: Record<string, never>;
        Returns: Array<{
          phone_e164: string;
          phone_country_code: string;
          phone_verified_at: string | null;
          created_at: string;
        }>;
      };
      bind_own_phone: {
        Args: { p_phone_e164: string; p_country_code: string };
        Returns: Array<{
          phone_e164: string;
          phone_country_code: string;
          phone_verified_at: string | null;
        }>;
      };
      unbind_own_phone: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_own_contact_sync_state: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          permission_granted_at: string | null;
          sync_enabled: boolean;
          last_sync_at: string | null;
          revoked_at: string | null;
        };
      };
      set_own_contact_sync_permission: {
        Args: { p_granted: boolean };
        Returns: {
          user_id: string;
          permission_granted_at: string | null;
          sync_enabled: boolean;
          last_sync_at: string | null;
          revoked_at: string | null;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
