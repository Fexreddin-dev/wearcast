import type { Locale } from "./config";

const en = {
  brand: "WearCast",
  tagline: "Your Weather. Your Wardrobe. Your Style.",
  nav: { home: "Home", wardrobe: "WARDROBE", avatar: "AVATAR", outfits: "OUTFITS", settings: "Settings", signIn: "Sign in", signUp: "Create account", signOut: "Sign out" },
  auth: {
    loginTitle: "Welcome back",
    signupTitle: "Create your account",
    email: "Email",
    password: "Password",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    checkEmail: "Check your inbox to confirm your email, then sign in.",
    genericError: "Something went wrong. Please try again.",
    invalid: "Please enter a valid email and a password of at least 8 characters.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    wrongCredentials: "Incorrect email or password.",
    notConfirmed: "Please confirm your email first. Check your inbox.",
    exists: "This email already has an account. Please sign in.",
    rateLimit: "Too many attempts. Please wait a while and try again.",
    weak: "Please choose a stronger password.",
    network: "We could not reach the server. Check your connection and try again.",
  },
  theme: { toLight: "Switch to light mode", toDark: "Switch to dark mode" },
  admin: { title: "Admin", forbidden: "You do not have access to this page.", unlimitedNote: "This account has no credit, plan or daily limits.", openStudio: "Open Wardrobe", users: "Users", spent: "Fal spent", cap: "Spending cap for customers", remaining: "Left before the cap", capReached: "The cap is reached: customers cannot dress new looks until you raise it.", capHelp: "A safety brake for your Fal balance. It counts all Fal spending since the start (including tests). When the total reaches this amount, customers get a resting message instead of a new try-on; saved looks still open. Unlimited accounts are never stopped. Set it to what is spent so far plus the amount you allow.", share: "Share access", shareHelp: "The person must already have a confirmed account. They get this page and unlimited use, and their spending comes from your Fal balance.", emailPlaceholder: "Their account email", grant: "Give access", revoke: "Remove", nobody: "No one else has access yet.", notFound: "No account with this email. Ask them to sign up first.", invalidEmail: "Please enter a valid email.", granted: "Access given.", save: "Save" },
  hero: { scroll: "Scroll", morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
  wardrobe: {"credits":"Credits","maxLayers":"You can wear up to 6 pieces at once.","showSamples":"Show samples","closet":"Wardrobe","addItem":"Add Item","slots":"items","demo":"Sample","soon":"Dressing for this category is coming soon.","empty":"Nothing here yet. Add your first piece.","cat":{"all":"All","jackets-coats":"Jackets & Coats","shirts-tops":"Shirts & Tops","pants-skirts":"Pants & Skirts","dresses":"Dresses","hijab-headwear":"Hijab & Headwear","shoes":"Shoes","accessories":"Accessories"},"add":{"title":"Add a piece","front":"Front","side":"Side","back":"Back","photoHint":"Front photo is required. JPG, PNG or WebP, up to 10 MB.","name":"Name (optional)","category":"Category","material":"Material","size":"Size","fit":"Fit","slim":"Slim","regular":"Regular","oversize":"Oversize","cotton":"Cotton","denim":"Denim","leather":"Leather","silk":"Silk","wool":"Wool","linen":"Linen","save":"Hang it up","saving":"Preparing your piece...","cancel":"Cancel"},"podium":{"curating":"Curating your look...","drag":"Drag to rotate","loupe":"Magnifier","layers":"Active Layers","noLayers":"Choose a piece from your wardrobe","reset":"Reset","remove":"Remove","dressView":"Dress this angle","avatar":"Choose a model"},"weather":{"title":"TODAY'S WEATHER","morning":"Morning","afternoon":"Afternoon","evening":"Evening","wind":"m/s","rain":"rain","change":"Change city","save":"Save","unavailable":"Weather is unavailable right now."},"look":{"title":"DAILY CURATED LOOK","get":"GET THE LOOK","shuffle":"Shuffle","save":"Save Look","needItems":"Add at least two pieces and your daily look will appear here."},"toast":{"ready":"Your look is ready.","dressed":"Your look is ready. 1 credit used.","dressedMany":"Your look is ready. {n} credits used.","cached":"Your look is ready. No credit used.","added":"Added to your wardrobe.","removed":"Removed from your wardrobe.","saved":"Look saved.","city":"City updated."},"errors":{"daily_limit":"You've reached today's limit. It renews at midnight.","view_failed":"This angle could not be prepared. Please try again.","unauthorized":"Please sign in to use this.","invalid":"Please check the details and try again.","plan_inactive":"Your plan has ended. Renew it to continue.","wardrobe_full":"Your wardrobe is full on this plan.","no_credits":"You have no credits left.","busy":"This look is already being prepared.","budget":"The studio is resting. Please try again later.","failed":"Something went wrong. Your credit was returned.","city_not_found":"City not found.","too_few_items":"Add at least two pieces first.","shuffle_limit":"That's all the shuffles for today."}},
};

export type Dictionary = typeof en;

const az: Dictionary = {
  brand: "WearCast",
  tagline: "Your Weather. Your Wardrobe. Your Style.",
  nav: { home: "Ana səhifə", wardrobe: "WARDROBE", avatar: "AVATAR", outfits: "OUTFITS", settings: "Parametrlər", signIn: "Daxil ol", signUp: "Hesab yarat", signOut: "Çıxış" },
  auth: {
    loginTitle: "Xoş gəlmisiniz",
    signupTitle: "Hesabınızı yaradın",
    email: "E-poçt",
    password: "Parol",
    submitLogin: "Daxil ol",
    submitSignup: "Hesab yarat",
    noAccount: "Hələ hesabınız yoxdur?",
    haveAccount: "Artıq hesabınız var?",
    checkEmail: "E-poçtunuzu təsdiqləmək üçün gələnlər qutusuna baxın, sonra daxil olun.",
    genericError: "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    invalid: "Düzgün e-poçt və ən azı 8 simvolluq parol daxil edin.",
    showPassword: "Parolu göstər",
    hidePassword: "Parolu gizlət",
    wrongCredentials: "E-poçt və ya parol yanlışdır.",
    notConfirmed: "Əvvəl e-poçtunuzu təsdiqləyin. Gələnlər qutusuna baxın.",
    exists: "Bu e-poçtla artıq hesab var. Daxil olun.",
    rateLimit: "Çox cəhd edildi. Bir az gözləyib yenidən cəhd edin.",
    weak: "Daha güclü parol seçin.",
    network: "Serverə qoşulmaq alınmadı. İnterneti yoxlayıb yenidən cəhd edin.",
  },
  theme: { toLight: "İşıqlı rejimə keç", toDark: "Tünd rejimə keç" },
  admin: { title: "Admin", forbidden: "Bu səhifəyə girişiniz yoxdur.", unlimitedNote: "Bu hesabda kredit, plan və gündəlik limit yoxdur.", openStudio: "Qarderobu aç", users: "İstifadəçilər", spent: "Fal xərci", cap: "Müştərilər üçün xərc tavanı", remaining: "Tavana qədər qalan", capReached: "Tavan dolub: müştərilər yeni geyindirmə edə bilmir, qaldırana qədər.", capHelp: "Fal balansın üçün təhlükəsizlik əyləci. Əvvəldən bəri bütün Fal xərcini (sınaqlar daxil) sayır. Cəmi bu məbləğə çatanda müştərilər yeni geyindirmə əvəzinə \"studiya dincəlir\" yazısını görür; saxlanmış kombinlər açılır. Limitsiz hesablar heç vaxt dayanmır. İndiyə qədərki xərcə icazə verdiyin məbləği əlavə edib yaz.", share: "Girişi paylaş", shareHelp: "Həmin şəxsin təsdiqlənmiş hesabı olmalıdır. O, bu səhifəni və limitsiz istifadəni alır, xərci isə sənin Fal balansından çıxır.", emailPlaceholder: "Onun hesab e-poçtu", grant: "Giriş ver", revoke: "Sil", nobody: "Hələ heç kimə giriş verilməyib.", notFound: "Bu e-poçtla hesab yoxdur. Əvvəl qeydiyyatdan keçsin.", invalidEmail: "Düzgün e-poçt yazın.", granted: "Giriş verildi.", save: "Yadda saxla" },
  hero: { scroll: "Aşağı sürüşdürün", morning: "Səhər", afternoon: "Gündüz", evening: "Axşam" },
  wardrobe: {"credits":"Kredit","maxLayers":"Eyni anda ən çoxu 6 geyim geyinmək olar.","showSamples":"Nümunələri göstər","closet":"Qarderob","addItem":"Geyim əlavə et","slots":"geyim","demo":"Nümunə","soon":"Bu kateqoriya üçün geyindirmə tezliklə əlavə olunacaq.","empty":"Burada hələ heç nə yoxdur. İlk geyimini əlavə et.","cat":{"all":"Hamısı","jackets-coats":"Pencək və palto","shirts-tops":"Köynək və üst","pants-skirts":"Şalvar və ətək","dresses":"Don","hijab-headwear":"Hicab və baş geyimi","shoes":"Ayaqqabı","accessories":"Aksesuar"},"add":{"title":"Geyim əlavə et","front":"Ön","side":"Yan","back":"Arxa","photoHint":"Ön şəkil məcburidir. JPG, PNG və ya WebP, ən çoxu 10 MB.","name":"Ad (istəyə bağlı)","category":"Kateqoriya","material":"Material","size":"Ölçü","fit":"Kəsim","slim":"Dar","regular":"Normal","oversize":"Bol","cotton":"Pambıq","denim":"Cins","leather":"Dəri","silk":"İpək","wool":"Yun","linen":"Kətan","save":"Asılqana as","saving":"Geyimin hazırlanır...","cancel":"Ləğv et"},"podium":{"curating":"Kombinin hazırlanır...","drag":"Çevirmək üçün sürüşdür","loupe":"Böyüdücü","layers":"Əynimdəkilər","noLayers":"Qarderobdan geyim seç","reset":"Sıfırla","remove":"Çıxar","dressView":"Bu bucaqda geyindir","avatar":"Model seç"},"weather":{"title":"BU GÜNÜN HAVASI","morning":"Səhər","afternoon":"Gündüz","evening":"Axşam","wind":"m/s","rain":"yağış","change":"Şəhəri dəyiş","save":"Yadda saxla","unavailable":"Hava məlumatı hazırda əlçatan deyil."},"look":{"title":"GÜNÜN KOMBİNİ","get":"KOMBİNİ GEYİN","shuffle":"Qarışdır","save":"Yadda saxla","needItems":"Ən azı iki geyim əlavə et, günün kombini burada görünəcək."},"toast":{"ready":"Kombinin hazırdır.","dressed":"Kombinin hazırdır. 1 kredit istifadə olundu.","dressedMany":"Kombinin hazırdır. {n} kredit istifadə olundu.","cached":"Kombinin hazırdır. Kredit çıxılmadı.","added":"Qarderoba əlavə olundu.","removed":"Qarderobdan silindi.","saved":"Kombin yadda saxlanıldı.","city":"Şəhər yeniləndi."},"errors":{"daily_limit":"Bu günlük limitə çatdın. Gecə yarısı yenilənir.","view_failed":"Bu bucaq hazırlana bilmədi. Yenidən cəhd edin.","unauthorized":"Bunun üçün daxil olun.","invalid":"Məlumatları yoxlayıb yenidən cəhd edin.","plan_inactive":"Planın bitib. Davam etmək üçün yenilə.","wardrobe_full":"Bu planda qarderobun doludur.","no_credits":"Kreditin qalmayıb.","busy":"Bu kombin artıq hazırlanır.","budget":"Studiya hazırda dincəlir. Sonra yenidən cəhd edin.","failed":"Xəta baş verdi. Kreditin geri qaytarıldı.","city_not_found":"Şəhər tapılmadı.","too_few_items":"Əvvəl ən azı iki geyim əlavə et.","shuffle_limit":"Bu günlük qarışdırma limiti bitdi."}},
};

const tr: Dictionary = {
  brand: "WearCast",
  tagline: "Your Weather. Your Wardrobe. Your Style.",
  nav: { home: "Ana sayfa", wardrobe: "WARDROBE", avatar: "AVATAR", outfits: "OUTFITS", settings: "Ayarlar", signIn: "Giriş yap", signUp: "Hesap oluştur", signOut: "Çıkış" },
  auth: {
    loginTitle: "Tekrar hoş geldiniz",
    signupTitle: "Hesabınızı oluşturun",
    email: "E-posta",
    password: "Şifre",
    submitLogin: "Giriş yap",
    submitSignup: "Hesap oluştur",
    noAccount: "Henüz hesabınız yok mu?",
    haveAccount: "Zaten hesabınız var mı?",
    checkEmail: "E-postanızı doğrulamak için gelen kutunuza bakın, ardından giriş yapın.",
    genericError: "Bir hata oluştu. Lütfen tekrar deneyin.",
    invalid: "Geçerli bir e-posta ve en az 8 karakterlik bir şifre girin.",
    showPassword: "Şifreyi göster",
    hidePassword: "Şifreyi gizle",
    wrongCredentials: "E-posta veya şifre yanlış.",
    notConfirmed: "Önce e-postanızı doğrulayın. Gelen kutunuza bakın.",
    exists: "Bu e-postayla zaten bir hesap var. Giriş yapın.",
    rateLimit: "Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.",
    weak: "Daha güçlü bir şifre seçin.",
    network: "Sunucuya bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
  },
  theme: { toLight: "Açık moda geç", toDark: "Koyu moda geç" },
  admin: { title: "Yönetim", forbidden: "Bu sayfaya erişiminiz yok.", unlimitedNote: "Bu hesapta kredi, plan ve günlük limit yok.", openStudio: "Gardırobu aç", users: "Kullanıcılar", spent: "Fal harcaması", cap: "Müşteriler için harcama tavanı", remaining: "Tavana kalan", capReached: "Tavan doldu: siz yükseltene kadar müşteriler yeni giydirme yapamaz.", capHelp: "Fal bakiyen için güvenlik freni. Baştan beri tüm Fal harcamasını (testler dahil) sayar. Toplam bu tutara ulaşınca müşteriler yeni giydirme yerine \"stüdyo dinleniyor\" mesajını görür; kayıtlı kombinler açılır. Limitsiz hesaplar asla durmaz. Şimdiye kadarki harcamaya izin verdiğin tutarı ekleyip yaz.", share: "Erişimi paylaş", shareHelp: "Kişinin onaylı bir hesabı olmalı. Bu sayfayı ve limitsiz kullanımı alır, harcaması senin Fal bakiyenden düşer.", emailPlaceholder: "Hesap e-postası", grant: "Erişim ver", revoke: "Kaldır", nobody: "Henüz kimseye erişim verilmedi.", notFound: "Bu e-postayla hesap yok. Önce kayıt olsun.", invalidEmail: "Geçerli bir e-posta girin.", granted: "Erişim verildi.", save: "Kaydet" },
  hero: { scroll: "Aşağı kaydırın", morning: "Sabah", afternoon: "Öğleden sonra", evening: "Akşam" },
  wardrobe: {"credits":"Kredi","maxLayers":"Aynı anda en fazla 6 parça giyilebilir.","showSamples":"Örnekleri göster","closet":"Gardırop","addItem":"Parça ekle","slots":"parça","demo":"Örnek","soon":"Bu kategori için giydirme yakında geliyor.","empty":"Burada henüz bir şey yok. İlk parçanı ekle.","cat":{"all":"Tümü","jackets-coats":"Ceket ve mont","shirts-tops":"Gömlek ve üst","pants-skirts":"Pantolon ve etek","dresses":"Elbise","hijab-headwear":"Başörtüsü ve şapka","shoes":"Ayakkabı","accessories":"Aksesuar"},"add":{"title":"Parça ekle","front":"Ön","side":"Yan","back":"Arka","photoHint":"Ön fotoğraf zorunludur. JPG, PNG veya WebP, en fazla 10 MB.","name":"Ad (isteğe bağlı)","category":"Kategori","material":"Malzeme","size":"Beden","fit":"Kesim","slim":"Dar","regular":"Normal","oversize":"Bol","cotton":"Pamuk","denim":"Kot","leather":"Deri","silk":"İpek","wool":"Yün","linen":"Keten","save":"Askıya as","saving":"Parçan hazırlanıyor...","cancel":"Vazgeç"},"podium":{"curating":"Kombinin hazırlanıyor...","drag":"Döndürmek için sürükle","loupe":"Büyüteç","layers":"Üzerimdekiler","noLayers":"Gardıroptan bir parça seç","reset":"Sıfırla","remove":"Çıkar","dressView":"Bu açıda giydir","avatar":"Model seç"},"weather":{"title":"BUGÜNÜN HAVASI","morning":"Sabah","afternoon":"Öğleden sonra","evening":"Akşam","wind":"m/s","rain":"yağış","change":"Şehri değiştir","save":"Kaydet","unavailable":"Hava bilgisi şu anda alınamıyor."},"look":{"title":"GÜNÜN KOMBİNİ","get":"KOMBİNİ GİY","shuffle":"Karıştır","save":"Kaydet","needItems":"En az iki parça ekle, günün kombini burada görünecek."},"toast":{"ready":"Kombinin hazır.","dressed":"Kombinin hazır. 1 kredi kullanıldı.","dressedMany":"Kombinin hazır. {n} kredi kullanıldı.","cached":"Kombinin hazır. Kredi kullanılmadı.","added":"Gardıroba eklendi.","removed":"Gardıroptan silindi.","saved":"Kombin kaydedildi.","city":"Şehir güncellendi."},"errors":{"daily_limit":"Bugünlük limite ulaştın. Gece yarısı yenilenir.","view_failed":"Bu açı hazırlanamadı. Lütfen tekrar deneyin.","unauthorized":"Bunun için giriş yapın.","invalid":"Bilgileri kontrol edip tekrar deneyin.","plan_inactive":"Planın sona erdi. Devam etmek için yenile.","wardrobe_full":"Bu planda gardırobun dolu.","no_credits":"Kredin kalmadı.","busy":"Bu kombin zaten hazırlanıyor.","budget":"Stüdyo şu anda dinleniyor. Daha sonra tekrar deneyin.","failed":"Bir hata oluştu. Kredin iade edildi.","city_not_found":"Şehir bulunamadı.","too_few_items":"Önce en az iki parça ekle.","shuffle_limit":"Bugünlük karıştırma hakkın bitti."}},
};

const dictionaries: Record<Locale, Dictionary> = { en, az, tr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
