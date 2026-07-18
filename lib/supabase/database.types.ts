export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  full_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
