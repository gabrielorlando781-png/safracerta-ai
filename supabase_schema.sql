-- SafraCerta.ai Supabase Schema Setup

-- 1. PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT,
    farm_name TEXT,
    total_area NUMERIC,
    location TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_metadata->>'full_name', new.email), 
    'https://i.pravatar.cc/150?u=' || new.id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. PLOTS Table
CREATE TABLE IF NOT EXISTS public.plots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    culture TEXT,
    area NUMERIC,
    status TEXT DEFAULT 'Em Desenvolvimento',
    health NUMERIC DEFAULT 1.0,
    production NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plots" ON public.plots
    FOR ALL USING (auth.uid() = user_id);

-- 3. MACHINERY Table
CREATE TABLE IF NOT EXISTS public.machinery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    model TEXT,
    year INTEGER,
    hours NUMERIC DEFAULT 0,
    photo_url TEXT
);

ALTER TABLE public.machinery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own machinery" ON public.machinery
    FOR ALL USING (auth.uid() = user_id);

-- 4. ACTIVITIES Table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES public.machinery(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT, -- revenue, expense, info
    category TEXT,
    value NUMERIC DEFAULT 0,
    notes TEXT
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activities" ON public.activities
    FOR ALL USING (auth.uid() = user_id);

-- 5. PESTS (MIP) Table
CREATE TABLE IF NOT EXISTS public.pests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
    question TEXT,
    image_url TEXT,
    report TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pest records" ON public.pests
    FOR ALL USING (auth.uid() = user_id);
