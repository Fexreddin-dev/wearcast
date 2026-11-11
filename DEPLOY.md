# WearCast-ı internetdə yayımlamaq (investor versiyası)

Bu versiyada bütün kombinlər əvvəlcədən hazırlanıb. Sayt işləyəndə Fal.ai-də pul xərclənmir.
Lazım olanlar: GitHub hesabı, Netlify və ya Vercel hesabı, `full/.env.local` faylındakı açarlar.

## Hansını seçək?
- **Netlify (tövsiyə):** pulsuz planda kommersiya istifadəsinə icazə var. Next.js-i özü tanıyır.
- **Vercel:** Next.js üçün ən rahatıdır, amma pulsuz "Hobby" planı yalnız şəxsi və **qeyri-kommersiya** istifadəsi üçündür. Startap/investor demosu üçün Pro plan ($20/ay) lazım olar.
- Sonra öz domenin və VPS-in olanda köçmək asandır (`next build` + `next start`).

## 1. Kodu GitHub-a qoy (bir dəfə)
1. github.com-da yeni **private** repo yarat, məsələn `wearcast`.
2. Layihə qovluğunda (`WearCast/`) terminalda:
   ```bash
   git remote add origin https://github.com/<istifadəçi-adın>/wearcast.git
   ```
   ```bash
   git push -u origin phase4b
   ```
   `.env.local` git-ə düşmür (bu düzgündür, açarlar gizli qalır).

## 2. Netlify
1. app.netlify.com → **Add new site → Import an existing project → GitHub** → `wearcast` reposunu seç.
2. Ayarlar:
   - **Base directory:** `full`
   - **Build command:** `npm run build`
   - **Publish directory:** `full/.next`
   - Branch: `phase4b` (və ya `main`-ə birləşdirsən, `main`)
3. **Environment variables** bölməsinə `full/.env.local`-dakı açarları bir-bir əlavə et (dəyərləri oradan kopyala):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ADMIN_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `FAL_KEY`, `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`,
   `NEXT_PUBLIC_LAUNCH_DISCOUNT`, `PAYMENT_PROVIDER`.
   - `NEXT_PUBLIC_SITE_URL` = Netlify-ın verdiyi ünvan, məsələn `https://wearcast.netlify.app`.
   - `NEXT_PUBLIC_PROTOTYPE` yazmasan da olar (default olaraq demo rejimi açıqdır).
4. **Deploy site**. 2–4 dəqiqəyə ünvan hazır olur.

## 3. Vercel (seçsən)
1. vercel.com → **Add New → Project** → GitHub reposunu seç.
2. **Root Directory:** `full`. Framework özü "Next.js" seçilir.
3. Environment Variables: yuxarıdakı siyahının eynisi.
4. **Deploy**.

## 4. Supabase-də ünvanı göstər (məcburidir, yoxsa giriş işləmir)
supabase.com → layihə → **Authentication → URL Configuration**:
- **Site URL:** `https://wearcast.netlify.app` (öz ünvanın)
- **Redirect URLs:** `https://wearcast.netlify.app/**` əlavə et (localhost-u silmə, lokal iş üçün lazımdır).

## 5. Yoxla
1. Ünvanı aç, ana səhifəni aşağı sürüşdür: Features, About və Support görünməlidir.
2. Qeydiyyatdan keç, e-poçtu təsdiqlə, daxil ol.
3. Wardrobe: sağda Günün kombini → **KOMBİNİ GEYİN** → model geyinir (1–2 saniyə). **Başqa kombin** → növbəti kombin. **Şkafıma əlavə et** → solda "Dəstlərim"də görünür, oradan yenidən geyindirmək pulsuzdur.
4. İnvestora giriş vermək üçün: o qeydiyyatdan keçir, sən **Admin** səhifəsində onun e-poçtunu yazıb "giriş ver" edirsən. Əslində demo rejimində adi hesab da hər şeyi görür. Admin girişi yalnız limitsiz hesab üçündür.

## Öz domenin olanda
Netlify/Vercel-də **Domains → Add domain**, sonra domen satıcısında onların verdiyi DNS qeydlərini yaz. Supabase-də 4-cü addımı yeni domenlə təkrarla və `NEXT_PUBLIC_SITE_URL`-i dəyiş.

## Gələcəkdə tam versiyaya qayıtmaq
`NEXT_PUBLIC_PROTOTYPE=false` et və yenidən deploy et: canlı geyindirmə, avatar studiyası, öz geyimini yükləmə və kreditlər qayıdır. Bunlar pul xərclədiyi üçün Fal balansı və planlar (Phase 5) hazır olmalıdır.
