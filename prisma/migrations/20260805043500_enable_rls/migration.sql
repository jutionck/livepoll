-- Enable Row Level Security (RLS) on all public schema tables
-- Fixes Supabase Security Advisor warnings: RLS Disabled in Public

ALTER TABLE "public"."testimonials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;
