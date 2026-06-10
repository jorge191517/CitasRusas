-- VELOURA DATABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Enable Row Level Security on all tables

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Photo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- 1. Profiles Policies
-- ===================================================
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON "Profile" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON "Profile" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own profile"
  ON "Profile" FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ===================================================
-- 2. Photos Policies
-- ===================================================
CREATE POLICY "Photos are viewable by authenticated users"
  ON "Photo" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own photos"
  ON "Photo" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own photos"
  ON "Photo" FOR DELETE
  TO authenticated
  USING (auth.uid()::text = "userId");

-- ===================================================
-- 3. Likes Policies
-- ===================================================
CREATE POLICY "Users can view likes they sent or received"
  ON "Like" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");

CREATE POLICY "Users can send likes as themselves"
  ON "Like" FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = "senderId");

CREATE POLICY "Users can update their own likes"
  ON "Like" FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "senderId");

-- ===================================================
-- 4. Matches Policies
-- ===================================================
CREATE POLICY "Users can view matches they are part of"
  ON "Match" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "user1Id" OR auth.uid()::text = "user2Id");

-- ===================================================
-- 5. Conversations & Participants Policies
-- ===================================================
CREATE POLICY "Users can view conversation participants they are part of"
  ON "ConversationParticipant" FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view conversations they participate in"
  ON "Conversation" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Conversation".id
      AND "ConversationParticipant"."userId" = auth.uid()::text
    )
  );

-- ===================================================
-- 6. Messages Policies
-- ===================================================
CREATE POLICY "Users can view messages in their conversations"
  ON "Message" FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Message"."conversationId"
      AND "ConversationParticipant"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON "Message" FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = "senderId" AND
    EXISTS (
      SELECT 1 FROM "ConversationParticipant"
      WHERE "ConversationParticipant"."conversationId" = "Message"."conversationId"
      AND "ConversationParticipant"."userId" = auth.uid()::text
    )
  );
