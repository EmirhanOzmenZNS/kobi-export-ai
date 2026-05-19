
import os, pandas as pd
BASE_DIR=os.path.dirname(os.path.abspath(__file__)); DATA_DIR=os.path.join(BASE_DIR,"data")
CATEGORIES_FILE=os.path.join(DATA_DIR,"categories.csv"); COUNTRIES_FILE=os.path.join(DATA_DIR,"countries.csv"); DEMAND_FILE=os.path.join(DATA_DIR,"market_demand.csv"); PRODUCT_REG_FILE=os.path.join(DATA_DIR,"product_regulations.csv"); LOGISTICS_REG_FILE=os.path.join(DATA_DIR,"logistics_regulations.csv")
def norm(s):
    s=pd.to_numeric(s,errors="coerce"); mn=s.min(); mx=s.max()
    return s.apply(lambda _:5.0) if mx==mn else ((s-mn)/(mx-mn)*9+1).round(2)
def inv(s):
    s=pd.to_numeric(s,errors="coerce"); mn=s.min(); mx=s.max()
    return s.apply(lambda _:5.0) if mx==mn else ((mx-s)/(mx-mn)*9+1).round(2)
def get_main_categories(): return sorted(pd.read_csv(CATEGORIES_FILE)["main_category"].dropna().unique().tolist())
def get_subcategories(m):
    df=pd.read_csv(CATEGORIES_FILE); f=df[df["main_category"].str.lower()==m.lower()]
    return f[["sub_category","hs_code"]].to_dict(orient="records")
def get_countries(): return pd.read_csv(COUNTRIES_FILE)[["country","region"]].to_dict(orient="records")
def rf(route):
    r=str(route).lower()
    if "kara" in r and "deniz" not in r: return .78
    if "kara" in r and "deniz" in r: return .9
    if "deniz" in r and "hava" in r: return 1.1
    if "deniz" in r: return 1
    if "hava" in r: return 1.6
    return 1
def rp(route):
    r=str(route).lower()
    if "kara" in r: return 1.2
    if "deniz" in r: return .42
    if "demiryolu" in r: return .6
    if "hava" in r: return 4.7
    return 1
def cm(t): return {"Koli / Parsiyel":.35,"Paletli Yük":.65,"20' Konteyner":1,"40' Konteyner":1.75,"Tır Komple":2.1,"Soğutmalı Konteyner":2.35}.get(t,1)
def analyze_market(m,s):
    d=pd.read_csv(DEMAND_FILE); c=pd.read_csv(COUNTRIES_FILE)
    f=d[(d["main_category"].str.lower()==m.lower())&(d["sub_category"].str.lower()==s.lower())].copy()
    if f.empty: return {"error":"Bu ana kategori ve alt kategori için veri bulunamadı."}
    df=f.merge(c,on="country",how="left")
    df["distance_cost_index"]=(df["distance_km_from_turkey"]/1000)*df["default_route_type"].apply(rf)
    df["demand_score"]=norm(df["estimated_import_value_usd"]); df["transport_score"]=inv(df["distance_cost_index"]); df["logistics_quality_score"]=norm(df["logistics_index"])
    df["logistics_cost_score"]=(df["transport_score"]*.65+df["logistics_quality_score"]*.35).round(2); df["tax_score"]=inv(df["tax_rate_estimate"])
    df["market_score"]=(df["demand_score"]*.3+df["logistics_cost_score"]*.22+df["market_access_score"]*.15+df["incentive_score"]*.13+df["payment_score"]*.1+df["tax_score"]*.1).round(2)
    ranked=df.sort_values("market_score",ascending=False).head(10); results=[]
    for _,r in ranked.iterrows():
        results.append({"country":r["country"],"region":r["region"],"market_score":float(r["market_score"]),"market_level":"Yüksek" if r["market_score"]>=8 else "Orta" if r["market_score"]>=6 else "Düşük","route":{"route_type":r["default_route_type"],"distance_km_from_turkey":int(r["distance_km_from_turkey"]), "transport_cost_index":float(round(r["distance_cost_index"],2))},"scores":{"talep":float(r["demand_score"]),"lojistik_maliyet":float(r["logistics_cost_score"]),"pazar_erisimi":float(r["market_access_score"]),"tesvik":float(r["incentive_score"]),"vergi_avantaji":float(r["tax_score"]),"odeme":float(r["payment_score"])},"raw_data":{"estimated_import_value_usd":int(r["estimated_import_value_usd"]),"tax_rate_estimate":float(r["tax_rate_estimate"]),"logistics_index":float(r["logistics_index"])},"reason":f"{r['country']} pazarı {s} ürünü için ithalat potansiyeli, lojistik rota ve vergi oranı birlikte değerlendirilerek puanlanmıştır."})
    best=results[0]; hs=str(ranked.iloc[0]["hs_code"])
    return {"origin_country":"Türkiye","main_category":m,"sub_category":s,"hs_code":hs,"best_country":best["country"],"ai_recommendation":f"{s} ürünü için en uygun hedef pazar {best['country']} olarak hesaplanmıştır. Sistem talep, lojistik, vergi, teşvik ve ödeme güvenilirliğini birlikte değerlendirir.","results":results,"roadmap":[f"{s} için HS/GTİP kodunu doğrula: {hs}.","Hedef ülke talep ve rakip fiyatlarını incele.","Gümrük vergisi ve ürün mevzuatını kontrol et.","Lojistik teklifleri karşılaştır.","Alıcı listesi oluştur ve teklif sürecini başlat."]}
def get_regulation_info(country,m,s):
    p=pd.read_csv(PRODUCT_REG_FILE); l=pd.read_csv(LOGISTICS_REG_FILE)
    pr=p[(p["country"].str.lower()==country.lower())&(p["main_category"].str.lower()==m.lower())&(p["sub_category"].str.lower()==s.lower())]; lr=l[l["country"].str.lower()==country.lower()]
    if pr.empty or lr.empty: return {"error":"Seçilen ülke/ürün için mevzuat bilgisi bulunamadı."}
    a=pr.iloc[0]; b=lr.iloc[0]
    return {"country":country,"main_category":m,"sub_category":s,"hs_code":str(a["hs_code"]),"tax_rate_estimate":float(a["tax_rate_estimate"]),"product_regulation":a["product_regulation"],"customs_documents":a["customs_documents"],"standards_note":a["standards_note"],"tax_note":a["tax_note"],"incentive_note":a["incentive_note"],"customs_note":a["customs_note"],"logistics_regulation":b["logistics_regulation"],"customs_process":b["customs_process"],"delivery_advice":b["delivery_advice"],"source_note":a["source_note"]}
def calculate_logistics_cost(d):
    country=str(d.get("country","")).strip(); route=str(d.get("route_type","")).strip(); cont=str(d.get("container_type","")).strip()
    try: weight=float(d.get("weight_kg",0))
    except: weight=0
    if not country or not route or not cont or weight<=0: return {"error":"Ülke, taşıma yolu, yük tipi ve yük miktarı zorunludur."}
    c=pd.read_csv(COUNTRIES_FILE); row=c[c["country"].str.lower()==country.lower()]
    if row.empty: return {"error":"Ülke bulunamadı."}
    distance=float(row.iloc[0]["distance_km_from_turkey"]); base=distance*rp(route)*cm(cont); wf=max(.4,weight/1000); handling=350 if "Koli" in cont else 800 if "Palet" in cont else 1600; insurance=base*.04; customs=450; total=round(base*wf+handling+insurance+customs,2)
    return {"country":country,"route_type":route,"container_type":cont,"weight_kg":weight,"distance_km":int(distance),"estimated_cost_usd":total,"breakdown":{"base_route_cost":round(base,2),"weight_factor":round(wf,2),"handling_cost":handling,"insurance_estimate":round(insurance,2),"customs_handling":customs},"comment":f"{country} için {route} ve {cont} seçimine göre yaklaşık maliyet {total} USD olarak hesaplanmıştır."}
def get_directory_page(t):
    p=pd.read_csv(PRODUCT_REG_FILE); l=pd.read_csv(LOGISTICS_REG_FILE); t=str(t).lower()
    if t=="vergiler": return {"title":"Ürün Bazlı Vergiler","items":p[["country","main_category","sub_category","hs_code","tax_rate_estimate","tax_note"]].head(1000).to_dict(orient="records")}
    if t=="tesvikler": return {"title":"Teşvikler","items":p[["country","main_category","sub_category","incentive_note"]].head(1000).to_dict(orient="records")}
    if t=="gumruk": return {"title":"Gümrük","items":p[["country","main_category","sub_category","customs_documents","customs_note"]].head(1000).to_dict(orient="records")}
    if t=="lojistik": return {"title":"Lojistik","items":l.head(200).to_dict(orient="records")}
    if t=="mevzuatlar": return {"title":"Mevzuatlar","items":p[["country","main_category","sub_category","product_regulation","standards_note"]].head(1000).to_dict(orient="records")}
    return {"error":"Sayfa türü bulunamadı."}
