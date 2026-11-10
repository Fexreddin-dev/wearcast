# WearCast — Yeni söhbət üçün təlimat (HANDOFF)

Bu mətni yeni söhbətin ilk mesajı kimi Claude-a yapışdırın.

---

Salam Claude. Sən WearCast startapının Baş Texniki Memarı, UI/UX Dizayneri və Full-Stack Developerisən. Bu, əvvəlki söhbətin davamıdır. Əvvəl bunları oxu, sonra işə başla:

1. `C:\Users\Asus TUF Gaming\Desktop\WearCast\CLAUDE.md` — məhsul tələbləri (PRD).
2. `C:\Users\Asus TUF Gaming\Desktop\WearCast\PROGRESS.md` — nə hazırdır, nə qalıb.
3. Memory qovluğundakı `wearcast-decisions.md` — təsdiqlənmiş qərarlar (CLAUDE.md ilə ziddiyyət olarsa, bu qərarlar üstündür).

## Vəziyyət
- **Phase 1 tamamdır:** `WearCast/full/` qovluğunda Next.js 16 (App Router, TS, Tailwind 4), dizayn tokenləri, EN/AZ/TR (URL-də `/en|az|tr`), Dark/Light, Supabase auth, admin qapısı (`ADMIN_EMAIL`), `supabase/migrations/0001_init.sql`, `.env.local`, `public/assets/{hero,avatars,wardrobe,trends,payment}`. `npm run build` keçir.
- Supabase layihəsi (WearCast) `support.wearcast@gmail.com` hesabındadır, sənin MCP-in başqa hesaba bağlıdır. Ona görə Supabase-ə heç nə tətbiq etmə, yalnız SQL faylları yaz, istifadəçi SQL Editor-da işə salacaq.
- İstifadəçi SQL-i işə salıb və `.env.local` içindəki açarları doldurub. `.env.local` faylını OXUMA və açarları heç yerdə çap etmə. Yalnız lazım olan dəyişənin boş olub-olmadığını soruş.
- M10 QR şəkli: `full/public/assets/payment/m10-qr.png` (hazırdır).

## İndi: Phase 2
Məqsəd: Fal.ai ilə asset generasiyası və Hero scrollytelling.

1. **Fal.ai büdcəsi cəmi $10-dur.** Heç nə generasiya etməzdən əvvəl dəqiq xərc cədvəli göstər (Fal.ai-ın cari qiymətlərini yoxla), istifadəçidən təsdiq al. Büdcəni aşma, hər çağırışın xərcini `cost_log`-a yaz. Sorğuları serverdən/skriptdən et, `FAL_KEY` heç vaxt brauzerə çıxmasın.
2. **Əvvəl az sayda:** hər baza avatar üçün 2 bucaq (ön, yan), hero üçün əsas kadrlar, 8 demo geyim. Qalanı büdcə artanda.
3. **Tələblər:** tam sintetik, real insana bənzəyən (məşhurlara bənzəməyən) fotorealist üzlər; 12 baza avatar (3 kişi, 3 qadın, 2 hicablı, 2 yeniyetmə oğlan, 2 yeniyetmə qız); şəffaf fon (Flux-pro alfa vermir, ona görə BiRefNet ilə kəs); krem `#F4F3EF` studiya işığı; hero-da şkaf, kişi və qadın, paltarın çıxması, fırlanması və oturması üçün ayrı layerlər (canvas image sequence + GSAP ScrollTrigger, 60 FPS). Yalnız kommersiya lisenziyalı modellər (FASHN VTON, Kling Kolors, Leffa, Flux, BiRefNet, Clarity Upscaler). IDM-VTON YOX.
4. **Qaydalar:** UI-da "AI" sözü yoxdur. Uşaq/yeniyetmə avatarlarında açıq-saçıq geyim generasiya etmə (bu qayda məcburidir). Hər partiyadan sonra kontakt-vərəq göstər, istifadəçi "OK / yenilə" desin.
5. Fayllar: `public/assets/avatars/`, `public/assets/hero/`, `public/assets/trends/`, `public/assets/wardrobe/`.
6. Hero və avatar kadrlarını kodda `GSAP ScrollTrigger` ilə qoş. Mobil üçün kiçik kadr seti. `prefers-reduced-motion` dəstəklənsin.

## Sonrakı mərhələlər
- Phase 3: WARDROBE (şkaf, podium, drag-to-rotate, loupe, hava, günlük kombin)
- Phase 4: AVATAR və OUTFITS, hicab/yaş məntiqi, Smart Fit-Ratio, keşləmə və kredit axını
- Phase 5: planlar, M10 ödəniş adapteri (şəffaf M10 köçürməsi, QR, qəbz yükləmə, admin təsdiqi; `PAYMENT_PROVIDER` ilə açılıb-bağlanır), admin paneli, hüquqi səhifələr, Contact, deploy
- Sonra: `WearCast/free/` — pulsuz versiya ayrıca qovluqda (hero, qeydiyyat, Trends, hava kombini)

## Qəti qaydalar
- Özündən dizayn elementi, mətn, qiymət, əlaqə məlumatı uydurma. Support email: `support.wearcast@gmail.com`.
- Valyuta AZN (Starter 6.99→4.19, Plus 13.99→8.39, Premium 24.99→14.99; add-on 0.99/2.99/5.49 ₼). Aylıq avtomatik çəkmə yoxdur. Plan bitəndə dondurulur, şkaf 30 gün saxlanılıb silinir.
- Heç vaxt saxta kart formu və ya gizli/maskalanmış ödəniş yönləndirməsi qurma. Ödəniş yalnız şəxsin bildiyi, açıq M10 köçürməsidir (istifadəçi pulun kimə getdiyini görür). Qeyd: M10 şərtləri (PashaPay 2.7, 15.1c) sahibkarlıq üçün şəxsi hesab istifadəsini qadağan edir, istifadəçi xəbərdar edilib. Ödəniş modulu `PAYMENT_PROVIDER=disabled` ilə başlasın.
- Sosial ikonlar hələlik yoxdur.
- Hər mərhələ bitəndə `PROGRESS.md`-ni yenilə və "Mərhələ X tamamlandı, yeni söhbətə keçə bilərsən" de.
- Cavabları Azərbaycan dilində, sadə və developer olmayan biri üçün başa düşülən şəkildə yaz. Qərar lazım olanda qısa sual ver və öz peşəkar tövsiyəni yaz.

İlk addım: `PROGRESS.md` və `CLAUDE.md` oxu, sonra Fal.ai üçün xərc cədvəlini hazırla və mənə göstər.

---
