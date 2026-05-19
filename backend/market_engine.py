import os
import math
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.csv")
COUNTRIES_FILE = os.path.join(DATA_DIR, "countries.csv")
DEMAND_FILE = os.path.join(DATA_DIR, "market_demand.csv")
PRODUCT_REG_FILE = os.path.join(DATA_DIR, "product_regulations.csv")
LOGISTICS_REG_FILE = os.path.join(DATA_DIR, "logistics_regulations.csv")

OFFICIAL_SOURCES = {
    "global_tariff": {
        "name": "ITC Market Access Map",
        "url": "https://www.macmap.org/",
        "note": "Ülke, menşe ve HS koduna göre gümrük vergisi, tarife kotası, ticaret önlemi ve pazar erişimi kontrolü için kullanılmalıdır."
    },
    "eu_taric": {
        "name": "EU TARIC",
        "url": "https://taxation-customs.ec.europa.eu/customs/common-customs-tariff-cct/tariff-classification-goods/eu-customs-tariff-taric_en",
        "note": "AB ülkeleri için TARIC/CN kodu, gümrük vergisi, anti-damping, tarife önlemleri ve ürün mevzuatı kontrol edilmelidir."
    },
    "us_hts": {
        "name": "USITC HTS",
        "url": "https://hts.usitc.gov/",
        "note": "ABD ithalatı için HTS kodu ve güncel gümrük vergisi burada doğrulanmalıdır."
    },
    "uk_tariff": {
        "name": "UK Trade Tariff",
        "url": "https://www.gov.uk/trade-tariff",
        "note": "İngiltere için commodity code, duty, VAT ve lisans kontrolleri burada yapılmalıdır."
    },
    "lpi": {
        "name": "World Bank Logistics Performance Index",
        "url": "https://lpi.worldbank.org/en/home",
        "note": "Ülkelerin lojistik performansı, gümrük etkinliği ve tedarik zinciri bağlantısı için referans alınmalıdır."
    },
    "turkey_trade": {
        "name": "T.C. Ticaret Bakanlığı",
        "url": "https://ticaret.gov.tr/",
        "note": "Türkiye ihracat destekleri, pazara giriş belgeleri ve güncel ihracat mevzuatı için kontrol edilmelidir."
    }
}

EU_COUNTRIES = {
    "Almanya", "Fransa", "Hollanda", "İtalya", "İspanya", "Polonya", "Belçika",
    "Avusturya", "Çekya", "Romanya", "Bulgaristan", "Yunanistan", "Macaristan",
    "Portekiz", "İsveç", "Danimarka", "Finlandiya", "İrlanda"
}

# Bunlar kesin ürün kodu değil, proje prototipi için HS6 seviyesinde başlangıç önerisidir.
# Nihai GTİP mutlaka ürün teknik özelliklerine göre gümrük müşaviri/resmi tarife kaynağı ile doğrulanmalıdır.
HS_SUGGESTIONS = {
    "Güvenlik Kamerası": {"hs6": "852589", "confidence": "Orta", "note": "Kamera türü, kayıt özelliği ve teknik yapısına göre alt kod değişebilir."},
    "Akıllı Saat": {"hs6": "851762", "confidence": "Düşük-Orta", "note": "İletişim özelliği, sensör ve saat sınıflandırması kontrol edilmelidir."},
    "Bluetooth Kulaklık": {"hs6": "851830", "confidence": "Orta", "note": "Kulaklık tipi ve mikrofon özelliğine göre alt kod değişebilir."},
    "Telefon Aksesuarı": {"hs6": "392690", "confidence": "Düşük", "note": "Aksesuarın malzemesi ve fonksiyonuna göre sınıflandırma değişir."},
    "Bilgisayar Parçası": {"hs6": "847330", "confidence": "Orta", "note": "Parçanın türü anakart, RAM, kasa veya adaptör oluşuna göre değişir."},
    "LED Aydınlatma": {"hs6": "940542", "confidence": "Orta", "note": "LED modül, armatür veya ampul oluşuna göre kod değişebilir."},
    "Tişört": {"hs6": "610910", "confidence": "Orta", "note": "Pamuk/sentetik ve örme/dokuma ayrımı yapılmalıdır."},
    "Pantolon": {"hs6": "620342", "confidence": "Düşük-Orta", "note": "Cinsiyet, kumaş ve dokuma/örme yapısına göre değişir."},
    "Ofis Masası": {"hs6": "940330", "confidence": "Orta", "note": "Malzeme ve kullanım alanına göre alt kod kontrol edilmelidir."},
    "Sandalye": {"hs6": "940179", "confidence": "Düşük-Orta", "note": "Metal, ahşap, döşemeli ve döner sandalye ayrımı önemlidir."},
    "Bisküvi": {"hs6": "190531", "confidence": "Orta", "note": "Tatlı/tuzlu, dolgulu/dolgu olmayan ayrımı yapılmalıdır."},
    "Çikolata": {"hs6": "180690", "confidence": "Orta", "note": "Kakao oranı, dolgu ve ambalaj ağırlığına göre değişebilir."},
    "Makarna": {"hs6": "190219", "confidence": "Orta", "note": "Yumurtalı/yumurtasız ve pişirilmiş/doldurulmuş ayrımı kontrol edilmelidir."},
    "Zeytinyağı": {"hs6": "150920", "confidence": "Orta", "note": "Sızma/rafine ve ambalaj türüne göre ulusal kod değişebilir."},
    "Cilt Bakım Kremi": {"hs6": "330499", "confidence": "Orta", "note": "Kozmetik/medikal iddia ayrımı mevzuatı etkiler."},
    "Şampuan": {"hs6": "330510", "confidence": "Orta", "note": "Kozmetik ürün bildirimi ve etiket kuralları kontrol edilmelidir."},
    "Spor Ayakkabı": {"hs6": "640411", "confidence": "Orta", "note": "Saya ve taban malzemesine göre kod değişebilir."},
    "Fren Balatası": {"hs6": "870830", "confidence": "Orta", "note": "Taşıt türüne göre alt kod ve teknik standart değişebilir."},
    "Tıbbi Maske": {"hs6": "630790", "confidence": "Düşük-Orta", "note": "Tıbbi/koruyucu sınıf ve sertifika durumuna göre sınıflandırma değişebilir."},
    "Kedi Maması": {"hs6": "230910", "confidence": "Orta", "note": "Evcil hayvan yemi için içerik, sağlık belgesi ve etiket kontrolü gerekir."},
    "Plastik Ambalaj": {"hs6": "392321", "confidence": "Düşük-Orta", "note": "Poşet, kutu, film ve malzeme türüne göre değişir."},
    "Tencere": {"hs6": "732393", "confidence": "Düşük-Orta", "note": "Paslanmaz çelik, alüminyum veya kaplama malzemesi kodu etkiler."},
    "Eğitici Oyuncak": {"hs6": "950300", "confidence": "Orta", "note": "Oyuncak güvenliği standardı ve yaş etiketi kontrol edilmelidir."},
    "Defter": {"hs6": "482010", "confidence": "Orta", "note": "Kağıt türü ve baskı/ajanda ayrımı kontrol edilmelidir."},
    "Domates": {"hs6": "070200", "confidence": "Orta", "note": "Taze/işlenmiş, ambalaj ve fitosaniter belge durumu kontrol edilmelidir."},
    "Paketleme Makinesi": {"hs6": "842240", "confidence": "Orta", "note": "Makine fonksiyonu ve otomasyon seviyesi alt kodu etkiler."},
    "Temizlik Kimyasalı": {"hs6": "340290", "confidence": "Düşük-Orta", "note": "Kimyasal içerik, SDS ve tehlikeli madde sınıfı kontrol edilmelidir."},
    "Seramik Karo": {"hs6": "690721", "confidence": "Orta", "note": "Su emme oranı, yüzey ve ölçü alt kodu etkiler."},
    "Gümüş Takı": {"hs6": "711311", "confidence": "Orta", "note": "Kıymetli metal ayarı, menşe ve değer beyanı önemlidir."},
    "Karton Kutu": {"hs6": "481910", "confidence": "Orta", "note": "Oluklu/oluksuz ve baskılı/baskısız ayrımı yapılmalıdır."}
}

MODE_RATE_USD_PER_KM = {
    "Deniz": 0.28,
    "Kara": 1.10,
    "Hava": 4.50,
    "Demiryolu": 0.55,
    "Kara + Deniz": 0.72,
    "Deniz + Hava": 2.15,
    "Deniz + Kara": 0.75,
    "Deniz + Demiryolu": 0.60
}

LOAD_MULTIPLIER = {
    "Koli / Parsiyel": 0.25,
    "Paletli Yük": 0.55,
    "20' Konteyner": 1.00,
    "40' Konteyner": 1.70,
    "Tır Komple": 1.95,
    "Soğutmalı Konteyner": 2.35
}

def normalize_to_10(series):
    series = pd.to_numeric(series, errors="coerce")
    mn, mx = series.min(), series.max()
    if mx == mn:
        return series.apply(lambda _: 5.0)
    return ((series - mn) / (mx - mn) * 9 + 1).round(2)

def inverse_normalize_to_10(series):
    series = pd.to_numeric(series, errors="coerce")
    mn, mx = series.min(), series.max()
    if mx == mn:
        return series.apply(lambda _: 5.0)
    return ((mx - series) / (mx - mn) * 9 + 1).round(2)

def safe_read_csv(path):
    if not os.path.exists(path):
        return pd.DataFrame()
    return pd.read_csv(path)

def get_main_categories():
    df = safe_read_csv(CATEGORIES_FILE)
    if df.empty:
        return []
    return sorted(df["main_category"].dropna().unique().tolist())

def get_subcategories(main_category):
    df = safe_read_csv(CATEGORIES_FILE)
    if df.empty:
        return []
    f = df[df["main_category"].str.lower() == main_category.lower()]
    rows = []
    for _, row in f.iterrows():
        sub = row["sub_category"]
        hs_info = HS_SUGGESTIONS.get(sub, {})
        rows.append({
            "sub_category": sub,
            "hs_code": hs_info.get("hs6", str(row.get("hs_code", ""))),
            "hs_confidence": hs_info.get("confidence", "Düşük"),
            "hs_note": hs_info.get("note", "Nihai kod ürün teknik özelliklerine göre doğrulanmalıdır.")
        })
    return rows

def get_countries():
    df = safe_read_csv(COUNTRIES_FILE)
    if df.empty:
        return []
    return df[["country", "region"]].to_dict(orient="records")

def get_source_set(country):
    sources = [OFFICIAL_SOURCES["global_tariff"], OFFICIAL_SOURCES["lpi"], OFFICIAL_SOURCES["turkey_trade"]]
    if country in EU_COUNTRIES:
        sources.insert(0, OFFICIAL_SOURCES["eu_taric"])
    elif country == "ABD":
        sources.insert(0, OFFICIAL_SOURCES["us_hts"])
    elif country == "İngiltere":
        sources.insert(0, OFFICIAL_SOURCES["uk_tariff"])
    return sources

def route_factor(route):
    r = str(route).lower()
    if "kara" in r and "deniz" not in r:
        return 0.78
    if "kara" in r and "deniz" in r:
        return 0.90
    if "demiryolu" in r:
        return 0.95
    if "deniz" in r and "hava" in r:
        return 1.10
    if "deniz" in r:
        return 1.00
    if "hava" in r:
        return 1.60
    return 1.0

def estimate_route_rate(route):
    if route in MODE_RATE_USD_PER_KM:
        return MODE_RATE_USD_PER_KM[route]
    for key, val in MODE_RATE_USD_PER_KM.items():
        if key.lower() in str(route).lower():
            return val
    return 0.85

def get_hs_info(sub_category, fallback=""):
    info = HS_SUGGESTIONS.get(sub_category, None)
    if info:
        return info
    return {
        "hs6": str(fallback)[:6] if fallback else "Kontrol gerekli",
        "confidence": "Düşük",
        "note": "Bu ürün için otomatik HS eşleşmesi güvenilir değildir. Resmi tarife kaynağı veya gümrük müşaviri ile doğrulanmalıdır."
    }

def analyze_market(main, sub):
    demand = safe_read_csv(DEMAND_FILE)
    countries = safe_read_csv(COUNTRIES_FILE)
    if demand.empty or countries.empty:
        return {"error": "Veri dosyaları bulunamadı."}

    f = demand[
        (demand["main_category"].str.lower() == main.lower()) &
        (demand["sub_category"].str.lower() == sub.lower())
    ].copy()

    if f.empty:
        return {"error": "Bu ana kategori ve alt kategori için veri bulunamadı."}

    df = f.merge(countries, on="country", how="left")
    df["distance_cost_index"] = (df["distance_km_from_turkey"] / 1000) * df["default_route_type"].apply(route_factor)
    df["demand_score"] = normalize_to_10(df["estimated_import_value_usd"])
    df["transport_score"] = inverse_normalize_to_10(df["distance_cost_index"])
    df["logistics_quality_score"] = normalize_to_10(df["logistics_index"])
    df["logistics_cost_score"] = (df["transport_score"] * 0.65 + df["logistics_quality_score"] * 0.35).round(2)

    # Vergi puanı kesin tarife değildir; resmi kaynak doğrulaması gerekir.
    df["tax_score"] = inverse_normalize_to_10(df["tax_rate_estimate"])

    df["market_score"] = (
        df["demand_score"] * 0.30 +
        df["logistics_cost_score"] * 0.22 +
        df["market_access_score"] * 0.15 +
        df["incentive_score"] * 0.13 +
        df["payment_score"] * 0.10 +
        df["tax_score"] * 0.10
    ).round(2)

    ranked = df.sort_values("market_score", ascending=False).head(10)
    hs_info = get_hs_info(sub, ranked.iloc[0].get("hs_code", ""))

    results = []
    for _, r in ranked.iterrows():
        sources = get_source_set(r["country"])
        results.append({
            "country": r["country"],
            "region": r["region"],
            "market_score": float(r["market_score"]),
            "market_level": "Yüksek" if r["market_score"] >= 8 else "Orta" if r["market_score"] >= 6 else "Düşük",
            "hs": hs_info,
            "route": {
                "route_type": r["default_route_type"],
                "distance_km_from_turkey": int(r["distance_km_from_turkey"]),
                "transport_cost_index": float(round(r["distance_cost_index"], 2))
            },
            "scores": {
                "talep": float(r["demand_score"]),
                "lojistik_maliyet": float(r["logistics_cost_score"]),
                "pazar_erisimi": float(r["market_access_score"]),
                "tesvik": float(r["incentive_score"]),
                "vergi_avantaji": float(r["tax_score"]),
                "odeme": float(r["payment_score"])
            },
            "raw_data": {
                "estimated_import_value_usd": int(r["estimated_import_value_usd"]),
                "tax_rate_estimate": float(r["tax_rate_estimate"]),
                "tax_data_status": "Tahmini/ön değerlendirme. Kesin oran değildir.",
                "logistics_index": float(r["logistics_index"])
            },
            "official_sources": sources,
            "reason": (
                f"{r['country']} pazarı {sub} ürünü için talep, lojistik erişilebilirlik, pazar erişimi, "
                f"teşvik ve tahmini vergi etkisi birlikte değerlendirilerek puanlanmıştır. "
                f"Vergi ve mevzuat sonucu resmi kaynaklardan doğrulanmalıdır."
            )
        })

    best = results[0]
    return {
        "origin_country": "Türkiye",
        "main_category": main,
        "sub_category": sub,
        "hs_code": hs_info["hs6"],
        "hs_confidence": hs_info["confidence"],
        "hs_note": hs_info["note"],
        "best_country": best["country"],
        "data_quality_note": (
            "Vergi, gümrük ve mevzuat bilgileri ürünün nihai HS/GTİP kodu, menşe ülkesi, ticaret anlaşmaları "
            "ve güncel tarife cetvellerine bağlıdır. Sistem kesin beyan değil, karar destek çıktısı üretir."
        ),
        "ai_recommendation": (
            f"{sub} ürünü için en uygun hedef pazar {best['country']} olarak hesaplanmıştır. "
            f"Bu öneri talep, lojistik, pazar erişimi, teşvik, ödeme güvenilirliği ve tahmini vergi avantajını birlikte değerlendirir. "
            f"Nihai ihracat kararı öncesinde HS/GTİP kodu ({hs_info['hs6']}) ve ilgili ülke tarife/mevzuat kaynakları doğrulanmalıdır."
        ),
        "results": results,
        "roadmap": [
            f"{sub} için önerilen HS6/GTİP başlangıç kodunu kontrol et: {hs_info['hs6']} ({hs_info['confidence']} güven).",
            "Ürün teknik özelliklerine göre nihai GTİP kodunu gümrük müşaviri veya resmi tarife kaynağı ile doğrula.",
            "Hedef ülke için güncel gümrük vergisi, ek vergi, anti-damping ve kota durumunu kontrol et.",
            "Ürün standardı, etiketleme, ambalaj, sertifika ve ithalat lisansı gereksinimlerini doğrula.",
            "En az iki lojistik firmasından aynı teslim şekli ve aynı yük miktarı için teklif al.",
            "EXW, FCA, FOB, CIF ve DDP teslim şekillerini maliyet ve sorumluluk açısından karşılaştır.",
            "Alıcı, distribütör veya e-ticaret kanalını doğrula ve ödeme güvenliği planı oluştur.",
            "Ticari fatura, çeki listesi, menşe, taşıma evrakı ve ihracat beyannamesi hazırlıklarını tamamla."
        ]
    }

def get_regulation_info(country, main, sub):
    p = safe_read_csv(PRODUCT_REG_FILE)
    l = safe_read_csv(LOGISTICS_REG_FILE)

    hs_info = get_hs_info(sub)
    sources = get_source_set(country)

    pr = pd.DataFrame()
    lr = pd.DataFrame()
    if not p.empty:
        pr = p[
            (p["country"].str.lower() == country.lower()) &
            (p["main_category"].str.lower() == main.lower()) &
            (p["sub_category"].str.lower() == sub.lower())
        ]
    if not l.empty:
        lr = l[l["country"].str.lower() == country.lower()]

    tax_rate = None
    if not pr.empty and "tax_rate_estimate" in pr.columns:
        tax_rate = float(pr.iloc[0]["tax_rate_estimate"])

    route_note = ""
    customs_process = ""
    delivery_advice = ""
    if not lr.empty:
        route_note = lr.iloc[0].get("logistics_regulation", "")
        customs_process = lr.iloc[0].get("customs_process", "")
        delivery_advice = lr.iloc[0].get("delivery_advice", "")

    return {
        "country": country,
        "main_category": main,
        "sub_category": sub,
        "hs_code": hs_info["hs6"],
        "hs_confidence": hs_info["confidence"],
        "hs_note": hs_info["note"],
        "tax_rate_estimate": tax_rate,
        "tax_data_status": "Kesin oran değildir. Resmi tarife kaynağından doğrulanmalıdır.",
        "product_regulation": (
            f"{country} pazarına {sub} ihracatı için ürünün nihai HS/GTİP kodu, teknik standardı, "
            f"etiketleme, ambalaj, uygunluk belgesi ve varsa ithalat lisansı kontrol edilmelidir."
        ),
        "customs_documents": (
            "Genel ihracat evrakları: ticari fatura, çeki listesi, taşıma belgesi, menşe belgesi, "
            "ihracat beyannamesi. Ürüne göre CE/ISO/test raporu, sağlık/fitosaniter belge, SDS veya uygunluk belgesi gerekebilir."
        ),
        "standards_note": (
            "Ürün standardı ülkeye ve ürün teknik özelliklerine göre değişir. Elektronik ürünlerde güvenlik/EMC, "
            "gıdada sağlık ve etiket, kozmetikte ürün bildirimi, kimyasallarda SDS/CLP benzeri gereklilikler kontrol edilmelidir."
        ),
        "tax_note": (
            f"Tahmini/ön değerlendirme vergi oranı: {tax_rate if tax_rate is not None else 'veri yok'}. "
            "Kesin vergi oranı HS/GTİP, menşe, tercihli ticaret anlaşması ve güncel tarife uygulamasına göre değişir."
        ),
        "incentive_note": (
            "Türkiye tarafında Ticaret Bakanlığı ihracat destekleri, KOSGEB destekleri, ihracatçı birlikleri "
            "ve pazara giriş destekleri ayrıca kontrol edilmelidir."
        ),
        "customs_note": (
            "Gümrükte doğru sınıflandırma, menşe, kıymet, fatura uyumu, taşıma evrakı ve ürün bazlı uygunluk belgeleri kontrol edilir."
        ),
        "logistics_regulation": route_note,
        "customs_process": customs_process,
        "delivery_advice": delivery_advice,
        "official_sources": sources,
        "source_note": "Bu ekran kesin gümrük beyanı yerine karar destek ve resmi kaynak kontrol listesi üretir."
    }

def calculate_logistics_cost(d):
    country = str(d.get("country", "")).strip()
    route = str(d.get("route_type", "")).strip()
    container = str(d.get("container_type", "")).strip()
    try:
        weight = float(d.get("weight_kg", 0))
    except Exception:
        weight = 0

    if not country or not route or not container or weight <= 0:
        return {"error": "Ülke, taşıma yolu, yük tipi ve yük miktarı zorunludur."}

    countries = safe_read_csv(COUNTRIES_FILE)
    if countries.empty:
        return {"error": "Ülke verisi bulunamadı."}

    row = countries[countries["country"].str.lower() == country.lower()]
    if row.empty:
        return {"error": "Ülke bulunamadı."}

    distance = float(row.iloc[0]["distance_km_from_turkey"])
    route_rate = estimate_route_rate(route)
    load_multiplier = LOAD_MULTIPLIER.get(container, 1.0)

    # Navlun gerçek fiyatı değildir. Demo için daha dürüst aralık üretir.
    weight_ton = max(weight / 1000, 0.15)
    base_cost = distance * route_rate * load_multiplier * max(0.55, math.sqrt(weight_ton))

    handling = 250 if "Koli" in container else 600 if "Palet" in container else 1250
    documentation = 180
    insurance_estimate = base_cost * 0.018
    customs_handling = 350

    midpoint = base_cost + handling + documentation + insurance_estimate + customs_handling
    min_cost = round(midpoint * 0.75, 2)
    max_cost = round(midpoint * 1.35, 2)
    midpoint = round(midpoint, 2)

    confidence = "Orta"
    if "Hava" in route or distance > 8000:
        confidence = "Düşük-Orta"
    if container in ["20' Konteyner", "40' Konteyner", "Tır Komple"] and distance < 3500:
        confidence = "Orta-Yüksek"

    return {
        "country": country,
        "route_type": route,
        "container_type": container,
        "weight_kg": weight,
        "distance_km": int(distance),
        "estimated_cost_usd": midpoint,
        "estimated_cost_range_usd": {
            "min": min_cost,
            "max": max_cost,
            "currency": "USD"
        },
        "confidence": confidence,
        "breakdown": {
            "base_route_cost": round(base_cost, 2),
            "handling_cost": handling,
            "documentation_estimate": documentation,
            "insurance_estimate": round(insurance_estimate, 2),
            "customs_handling": customs_handling
        },
        "comment": (
            f"{country} için {route} ve {container} seçimine göre tahmini lojistik maliyet aralığı "
            f"{min_cost} - {max_cost} USD olarak hesaplanmıştır. Bu bir navlun teklifi değildir; "
            f"gerçek fiyat için aynı yük, aynı teslim şekli ve aynı tarih üzerinden lojistik firmalarından teklif alınmalıdır."
        ),
        "official_sources": [OFFICIAL_SOURCES["lpi"]]
    }

def get_directory_page(t):
    t = str(t).lower()
    p = safe_read_csv(PRODUCT_REG_FILE)
    l = safe_read_csv(LOGISTICS_REG_FILE)

    source_warning = (
        "Bu bilgiler karar destek amaçlıdır. Kesin oran ve mevzuat için ürün HS/GTİP kodu ile resmi kaynak kontrolü yapılmalıdır."
    )

    if t == "vergiler":
        if p.empty:
            items = []
        else:
            rows = p[["country", "main_category", "sub_category", "hs_code", "tax_rate_estimate"]].head(1000).to_dict(orient="records")
            items = []
            for r in rows:
                hs_info = get_hs_info(r.get("sub_category", ""), r.get("hs_code", ""))
                items.append({
                    **r,
                    "hs_code": hs_info["hs6"],
                    "hs_confidence": hs_info["confidence"],
                    "tax_data_status": "Tahmini/ön değerlendirme. Resmi kaynakta doğrulanmalıdır.",
                    "official_sources": get_source_set(r["country"])
                })
        return {"title": "Ürün Bazlı Vergiler", "source_warning": source_warning, "items": items}

    if t == "tesvikler":
        if p.empty:
            items = []
        else:
            items = []
            for _, r in p.head(1000).iterrows():
                items.append({
                    "country": r["country"],
                    "main_category": r["main_category"],
                    "sub_category": r["sub_category"],
                    "incentive_note": "Türkiye ihracat destekleri ve hedef ülke pazar giriş koşulları T.C. Ticaret Bakanlığı ve ilgili resmi kaynaklardan doğrulanmalıdır.",
                    "official_sources": [OFFICIAL_SOURCES["turkey_trade"], OFFICIAL_SOURCES["global_tariff"]]
                })
        return {"title": "Teşvikler", "source_warning": source_warning, "items": items}

    if t == "gumruk":
        if p.empty:
            items = []
        else:
            items = []
            for _, r in p.head(1000).iterrows():
                items.append({
                    "country": r["country"],
                    "main_category": r["main_category"],
                    "sub_category": r["sub_category"],
                    "customs_documents": "Ticari fatura, çeki listesi, taşıma belgesi, menşe, ihracat beyannamesi ve ürüne özel uygunluk belgeleri.",
                    "customs_note": "Doğru HS/GTİP sınıflandırması ve güncel ithalat mevzuatı kontrol edilmelidir.",
                    "official_sources": get_source_set(r["country"])
                })
        return {"title": "Gümrük Mevzuatı", "source_warning": source_warning, "items": items}

    if t == "lojistik":
        if l.empty:
            items = []
        else:
            items = l.head(200).to_dict(orient="records")
            for item in items:
                item["data_status"] = "Rota ve mesafe ön değerlendirmedir. Gerçek navlun için taşıyıcı teklifi gerekir."
                item["official_sources"] = [OFFICIAL_SOURCES["lpi"]]
        return {"title": "Lojistik Mevzuatı ve Rotalar", "source_warning": source_warning, "items": items}

    if t == "mevzuatlar":
        if p.empty:
            items = []
        else:
            items = []
            for _, r in p.head(1000).iterrows():
                hs_info = get_hs_info(r.get("sub_category", ""), r.get("hs_code", ""))
                items.append({
                    "country": r["country"],
                    "main_category": r["main_category"],
                    "sub_category": r["sub_category"],
                    "hs_code": hs_info["hs6"],
                    "hs_confidence": hs_info["confidence"],
                    "product_regulation": "Ürün güvenliği, teknik standart, etiketleme, ambalaj ve ithalat lisansı gereksinimleri hedef ülkeye göre doğrulanmalıdır.",
                    "standards_note": hs_info["note"],
                    "official_sources": get_source_set(r["country"])
                })
        return {"title": "Ürün Mevzuatları", "source_warning": source_warning, "items": items}

    return {"error": "Sayfa türü bulunamadı."}
