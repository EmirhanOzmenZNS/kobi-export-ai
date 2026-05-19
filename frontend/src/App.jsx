import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  Coins,
  Edit3,
  FileText,
  FileDown,
  Gauge,
  Globe2,
  Landmark,
  LineChart,
  Loader2,
  Lock,
  MapPinned,
  PackageSearch,
  Route,
  Save,
  Settings,
  ShieldCheck,
  Ship,
  TrendingUp,
  Unlock
} from "lucide-react";
import "./App.css";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
const API_URL = "https://kobi-export-ai.onrender.com";

const defaultConfig = {
  brand: {
    text: "KOBİ Export AI",
    fontSize: 22,
    color: "#172554",
    x: 0,
    y: 0
  },
  theme: {
    primary: "#1d4ed8",
    secondary: "#0f766e",
    bg: "#f3f6fb",
    card: "#ffffff",
    radius: 26
  },
  hero: {
    title: "KOBİ’ler İçin İhracat Analiz, Mevzuat ve Lojistik Platformu",
    text: "Ürün pazar analizi, ürün bazlı vergi-gümrük-lojistik bilgisi ve lojistik maliyet hesaplama ayrı paneller halinde çalışır.",
    image: "",
    titleSize: 44,
    textSize: 17,
    x: 0,
    y: 0,
    height: 360
  },
  stats: [
    { label: "Ülke", value: "50" },
    { label: "Ana kategori", value: "20" },
    { label: "Alt kategori", value: "200" },
    { label: "Veri satırı", value: "10.000" }
  ],
  buttons: {
    height: 52,
    radius: 15,
    fontSize: 15
  },
  panels: [
    {
      id: "analysis",
      title: "1. Ürün Seçimi ve Pazar Analizi",
      text: "Bu panel en uygun ihracat ülkelerini bulur.",
      visible: true,
      x: 0,
      y: 0,
      width: 100
    },
    {
      id: "regulation",
      title: "2. Ürün Bazlı Vergi, Gümrük ve Lojistik Bilgi Paneli",
      text: "Bu panel bağımsız ülke + ana kategori + alt kategori seçimiyle mevzuat gösterir.",
      visible: true,
      x: 0,
      y: 0,
      width: 100
    },
    {
      id: "cost",
      title: "3. Lojistik Maliyet Hesaplama",
      text: "Ülke, taşıma yolu, yük tipi ve kg seçilerek tahmini maliyet hesaplanır.",
      visible: true,
      x: 0,
      y: 0,
      width: 100
    }
  ]
};

function loadLocalConfig() {
  try {
    return JSON.parse(localStorage.getItem("visual_ui_config")) || defaultConfig;
  } catch {
    return defaultConfig;
  }
}

function saveLocalConfig(config) {
  localStorage.setItem("visual_ui_config", JSON.stringify(config));
}

export default function App() {
  const [page, setPage] = useState("home");
  const [admin, setAdmin] = useState(sessionStorage.getItem("admin_ok") === "1");
  const [login, setLogin] = useState({ u: "", p: "" });
  const [config, setConfig] = useState(loadLocalConfig());
  const [selected, setSelected] = useState(null);

  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [regSubCategories, setRegSubCategories] = useState([]);
  const [countries, setCountries] = useState([]);

  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const [regCountry, setRegCountry] = useState("");
  const [regMain, setRegMain] = useState("");
  const [regSub, setRegSub] = useState("");
  const [regulation, setRegulation] = useState(null);
  const [regLoading, setRegLoading] = useState(false);

  const [costForm, setCostForm] = useState({
    country: "",
    route_type: "Deniz",
    container_type: "20' Konteyner",
    weight_kg: "1000"
  });
  const [cost, setCost] = useState(null);

  const [directory, setDirectory] = useState(null);
  const [dirLoading, setDirLoading] = useState(false);

  const best = useMemo(() => analysis?.results?.[0] || null, [analysis]);

  const panelMap = {
    analysis: PanelAnalysis,
    regulation: PanelReg,
    cost: PanelCost
  };

  useEffect(() => {
    loadFirebaseConfig();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--blue", config.theme.primary);
    document.documentElement.style.setProperty("--green", config.theme.secondary);
    document.documentElement.style.setProperty("--bg", config.theme.bg);
    document.documentElement.style.setProperty("--card", config.theme.card);
    document.documentElement.style.setProperty("--radius", config.theme.radius + "px");
    document.documentElement.style.setProperty("--button-height", config.buttons.height + "px");
    document.documentElement.style.setProperty("--button-radius", config.buttons.radius + "px");
    document.documentElement.style.setProperty("--button-font", config.buttons.fontSize + "px");
    saveLocalConfig(config);
  }, [config]);

  useEffect(() => {
    fetch(`${API_URL}/main-categories`)
      .then((r) => r.json())
      .then((d) => setMainCategories(d.main_categories || []))
      .catch(() => setMainCategories([]));

    fetch(`${API_URL}/countries`)
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!mainCategory) {
      setSubCategories([]);
      setSubCategory("");
      return;
    }

    fetch(`${API_URL}/subcategories/${encodeURIComponent(mainCategory)}`)
      .then((r) => r.json())
      .then((d) => {
        setSubCategories(d.subcategories || []);
        setSubCategory("");
      })
      .catch(() => setSubCategories([]));
  }, [mainCategory]);

  useEffect(() => {
    if (!regMain) {
      setRegSubCategories([]);
      setRegSub("");
      return;
    }

    fetch(`${API_URL}/subcategories/${encodeURIComponent(regMain)}`)
      .then((r) => r.json())
      .then((d) => {
        setRegSubCategories(d.subcategories || []);
        setRegSub("");
      })
      .catch(() => setRegSubCategories([]));
  }, [regMain]);

  async function loadFirebaseConfig() {
    try {
      const ref = doc(db, "settings", "main");
      const snap = await getDoc(ref);

      if (snap.exists() && snap.data().config) {
        setConfig(snap.data().config);
        saveLocalConfig(snap.data().config);
      }
    } catch (error) {
      console.log("Firebase config okunamadı:", error);
    }
  }

  async function saveFirebaseConfig(newConfig) {
    try {
      await setDoc(doc(db, "settings", "main"), {
        config: newConfig,
        updatedAt: new Date().toISOString()
      });

      saveLocalConfig(newConfig);
      alert("Kaydedildi. Artık herkes bu tasarımı görebilir.");
    } catch (error) {
      console.error(error);
      alert("Firebase kaydı sırasında hata oluştu.");
    }
  }

  function loginAdmin() {
    if (login.u === "admin" && login.p === "0000") {
      setAdmin(true);
      sessionStorage.setItem("admin_ok", "1");
      setPage("admin");
    } else {
      alert("Kullanıcı adı veya şifre hatalı");
    }
  }

  function logoutAdmin() {
    setAdmin(false);
    sessionStorage.removeItem("admin_ok");
    setPage("home");
  }

  async function analyze() {
    if (!mainCategory || !subCategory) {
      alert("Ana kategori ve alt kategori seç.");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const r = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main_category: mainCategory, sub_category: subCategory })
      });

      setAnalysis(await r.json());
    } catch {
      setAnalysis({ error: "Backend bağlantısı kurulamadı." });
    }

    setLoading(false);
  }

  async function readReg() {
    if (!regCountry || !regMain || !regSub) {
      alert("Ülke, ana kategori ve alt kategori seç.");
      return;
    }

    setRegLoading(true);
    setRegulation(null);

    try {
      const r = await fetch(`${API_URL}/regulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: regCountry,
          main_category: regMain,
          sub_category: regSub
        })
      });

      setRegulation(await r.json());
    } catch {
      setRegulation({ error: "Backend bağlantısı kurulamadı." });
    }

    setRegLoading(false);
  }

  async function calcCost() {
    setCost(null);

    try {
      const r = await fetch(`${API_URL}/logistics-cost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(costForm)
      });

      setCost(await r.json());
    } catch {
      setCost({ error: "Backend bağlantısı kurulamadı." });
    }
  }

  async function openDir(t) {
    setPage(t);
    setDirectory(null);
    setDirLoading(true);

    try {
      const r = await fetch(`${API_URL}/directory/${t}`);
      setDirectory(await r.json());
    } catch {
      setDirectory({ items: [] });
    }

    setDirLoading(false);
  }

  async function downloadReportPdf() {
    if (!analysis || analysis.error) {
      alert("Önce ürün analizi yapmalısın.");
      return;
    }

    const reportElement = document.querySelector(".report-area");

    if (!reportElement) {
      alert("Rapor alanı bulunamadı.");
      return;
    }

    const downloadBox = document.querySelector(".download-report-box");
    const oldDisplay = downloadBox ? downloadBox.style.display : "";

    if (downloadBox) {
      downloadBox.style.display = "none";
    }

    document.body.classList.add("pdf-exporting");

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `ihracat-analiz-raporu-${analysis.sub_category || "urun"}`
        .replaceAll(" ", "-")
        .replaceAll("/", "-")
        .toLowerCase();

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error(error);
      alert("PDF oluşturulurken hata oluştu.");
    } finally {
      document.body.classList.remove("pdf-exporting");

      if (downloadBox) {
        downloadBox.style.display = oldDisplay;
      }
    }
  }

  const panelProps = {
    mainCategories,
    subCategories,
    countries,
    mainCategory,
    setMainCategory,
    subCategory,
    setSubCategory,
    analyze,
    loading,
    regCountry,
    setRegCountry,
    regMain,
    setRegMain,
    regSub,
    setRegSub,
    regSubCategories,
    readReg,
    regLoading,
    regulation,
    costForm,
    setCostForm,
    calcCost,
    cost,
    config,
    selected,
    setSelected,
    admin
  };

  return (
    <div className={admin && page === "admin" ? "page edit-mode" : "page"}>
      <nav className="nav nav-clean">
        <div
          className="brand"
          onClick={() => admin && setSelected("brand")}
          style={{
            fontSize: config.brand.fontSize,
            color: config.brand.color,
            transform: `translate(${config.brand.x}px,${config.brand.y}px)`
          }}
        >
          <Globe2 /> {config.brand.text}
        </div>

        <div className="links nav-center">
          <button onClick={() => setPage("home")}>Ana Sayfa</button>
          <button onClick={() => openDir("mevzuatlar")}>
            <FileText /> Mevzuatlar
          </button>
          <button onClick={() => openDir("gumruk")}>
            <Landmark /> Gümrük
          </button>
          <button onClick={() => openDir("vergiler")}>
            <Coins /> Vergiler
          </button>
        </div>

        <button
          className="admin-top-button"
          onClick={() => (admin ? setPage("admin") : setPage("login"))}
        >
          <Settings /> Admin
        </button>
      </nav>

      {page === "login" ? (
        <Login login={login} setLogin={setLogin} loginAdmin={loginAdmin} />
      ) : page === "admin" && admin ? (
        <VisualEditor
          config={config}
          setConfig={setConfig}
          selected={selected}
          setSelected={setSelected}
          setPage={setPage}
          saveFirebaseConfig={saveFirebaseConfig}
          logoutAdmin={logoutAdmin}
        />
      ) : page === "home" ? (
        <main>
          <Hero config={config} setSelected={setSelected} admin={admin} />

          {config.panels
            .filter((p) => p.visible)
            .map((p) => {
              const C = panelMap[p.id];
              return C ? <C key={p.id} panel={p} {...panelProps} /> : null;
            })}

          {analysis && !analysis.error && <Results a={analysis} best={best} downloadReportPdf={downloadReportPdf} />}
          {analysis?.error && <div className="error">{analysis.error}</div>}
        </main>
      ) : (
        <Directory page={page} data={directory} loading={dirLoading} setPage={setPage} />
      )}
    </div>
  );
}

function Login({ login, setLogin, loginAdmin }) {
  return (
    <section className="login">
      <Lock size={44} />
      <h1>Admin Girişi</h1>
      <p>Arayüz düzenleme paneline girmek için giriş yap.</p>

      <input
        placeholder="Kullanıcı adı"
        value={login.u}
        onChange={(e) => setLogin({ ...login, u: e.target.value })}
      />

      <input
        placeholder="Şifre"
        type="password"
        value={login.p}
        onChange={(e) => setLogin({ ...login, p: e.target.value })}
      />

      <button onClick={loginAdmin}>
        <Unlock /> Giriş Yap
      </button>

      <small>Kullanıcı adı: admin / Şifre: 0000</small>
    </section>
  );
}

function Hero({ config, setSelected, admin }) {
  return (
    <section
      className="hero clickable"
      onClick={() => admin && setSelected("hero")}
      style={{
        minHeight: config.hero.height,
        transform: `translate(${config.hero.x}px,${config.hero.y}px)`
      }}
    >
      <div>
        <h1 style={{ fontSize: config.hero.titleSize }}>{config.hero.title}</h1>
        <p style={{ fontSize: config.hero.textSize }}>{config.hero.text}</p>

        <div className="stats">
          {config.stats.map((s, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                admin && setSelected("stats");
              }}
            >
              <b>{s.value}</b>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="hero-card">
        {config.hero.image ? (
          <img src={config.hero.image} alt="Kapak görseli" />
        ) : (
          <>
            <Brain />
            <h3>Karar Motoru</h3>
            <p>Talep, lojistik, vergi, teşvik ve ödeme skorları birlikte değerlendirilir.</p>
          </>
        )}
      </div>
    </section>
  );
}

function VisualEditor({
  config,
  setConfig,
  selected,
  setSelected,
  setPage,
  saveFirebaseConfig,
  logoutAdmin
}) {
  const update = (path, val) => {
    const c = structuredClone(config);
    let o = c;

    for (let i = 0; i < path.length - 1; i++) {
      o = o[path[i]];
    }

    o[path.at(-1)] = val;
    setConfig(c);
  };

  const reset = () => {
    localStorage.removeItem("visual_ui_config");
    setConfig(defaultConfig);
  };

  return (
    <section className="editor">
      <div className="editor-top">
        <div>
          <h1>Görsel Arayüz Editörü</h1>
          <p>Ön taraftaki öğeye tıkla, sağdaki panelden yazı, renk, boyut ve konum değiştir.</p>
        </div>

        <div className="editor-actions">
          <button onClick={() => setPage("home")}>
            <Edit3 /> Ön Yüzü Düzenle
          </button>
          <button className="danger" onClick={logoutAdmin}>
            Çıkış
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <div className="canvas-preview">
          <Hero config={config} setSelected={setSelected} admin={true} />

          {config.panels.map((p, i) => (
            <div
              className="preview-panel"
              key={p.id}
              onClick={() => setSelected("panel-" + i)}
              style={{
                transform: `translate(${p.x}px,${p.y}px)`,
                width: p.width + "%"
              }}
            >
              <h2>{p.title}</h2>
              <p>{p.text}</p>
              <button>Örnek Buton</button>
            </div>
          ))}
        </div>

        <div className="inspector">
          <h2>Seçili Alan: {selected || "Yok"}</h2>

          <CommonControls config={config} update={update} />

          {selected === "brand" && (
            <>
              <label>
                Marka
                <input
                  value={config.brand.text}
                  onChange={(e) => update(["brand", "text"], e.target.value)}
                />
              </label>

              <label>
                Font boyutu
                <input
                  type="number"
                  value={config.brand.fontSize}
                  onChange={(e) => update(["brand", "fontSize"], Number(e.target.value))}
                />
              </label>

              <label>
                Renk
                <input
                  type="color"
                  value={config.brand.color}
                  onChange={(e) => update(["brand", "color"], e.target.value)}
                />
              </label>

              <MoveControls obj={config.brand} update={(k, v) => update(["brand", k], v)} />
            </>
          )}

          {selected === "hero" && (
            <>
              <label>
                Başlık
                <textarea
                  value={config.hero.title}
                  onChange={(e) => update(["hero", "title"], e.target.value)}
                />
              </label>

              <label>
                Açıklama
                <textarea
                  value={config.hero.text}
                  onChange={(e) => update(["hero", "text"], e.target.value)}
                />
              </label>

              <label>
                Görsel URL
                <input
                  value={config.hero.image}
                  onChange={(e) => update(["hero", "image"], e.target.value)}
                />
              </label>

              <label>
                Başlık boyutu
                <input
                  type="number"
                  value={config.hero.titleSize}
                  onChange={(e) => update(["hero", "titleSize"], Number(e.target.value))}
                />
              </label>

              <label>
                Yazı boyutu
                <input
                  type="number"
                  value={config.hero.textSize}
                  onChange={(e) => update(["hero", "textSize"], Number(e.target.value))}
                />
              </label>

              <label>
                Yükseklik
                <input
                  type="number"
                  value={config.hero.height}
                  onChange={(e) => update(["hero", "height"], Number(e.target.value))}
                />
              </label>

              <MoveControls obj={config.hero} update={(k, v) => update(["hero", k], v)} />
            </>
          )}

          {selected === "stats" &&
            config.stats.map((s, i) => (
              <div className="mini-editor" key={i}>
                <input
                  value={s.value}
                  onChange={(e) => update(["stats", i, "value"], e.target.value)}
                />
                <input
                  value={s.label}
                  onChange={(e) => update(["stats", i, "label"], e.target.value)}
                />
              </div>
            ))}

          {selected?.startsWith("panel-") && (
            <PanelInspect
              p={config.panels[Number(selected.split("-")[1])]}
              i={Number(selected.split("-")[1])}
              update={update}
            />
          )}

          <DataManagementBox />

          <button onClick={() => saveFirebaseConfig(config)}>
            <Save /> Kaydet ve Yayınla
          </button>

          <button className="danger" onClick={reset}>
            Sıfırla
          </button>
        </div>
      </div>
    </section>
  );
}


function DataManagementBox() {
  return (
    <div className="data-management-box">
      <h3>Veri Yönetimi Modülü</h3>
      <p>
        Bu alan canlı sistemde ülke, kategori, mevzuat, teşvik ve lojistik verilerinin
        Firebase üzerinden yönetilebilmesi için ayrıldı.
      </p>
      <ul>
        <li>Ülke verisi düzenleme</li>
        <li>Kategori / alt kategori güncelleme</li>
        <li>Vergi ve gümrük notları düzenleme</li>
        <li>Lojistik rota ve maliyet açıklaması yönetimi</li>
      </ul>
      <small>
        Bir sonraki adımda bu alanı gerçek tablo düzenleme ekranına çevireceğiz.
      </small>
    </div>
  );
}

function CommonControls({ config, update }) {
  return (
    <div className="common">
      <h3>Genel Tasarım</h3>

      <label>
        Ana renk
        <input
          type="color"
          value={config.theme.primary}
          onChange={(e) => update(["theme", "primary"], e.target.value)}
        />
      </label>

      <label>
        İkinci renk
        <input
          type="color"
          value={config.theme.secondary}
          onChange={(e) => update(["theme", "secondary"], e.target.value)}
        />
      </label>

      <label>
        Arka plan
        <input
          type="color"
          value={config.theme.bg}
          onChange={(e) => update(["theme", "bg"], e.target.value)}
        />
      </label>

      <label>
        Kart rengi
        <input
          type="color"
          value={config.theme.card}
          onChange={(e) => update(["theme", "card"], e.target.value)}
        />
      </label>

      <label>
        Köşe yuvarlaklığı
        <input
          type="number"
          value={config.theme.radius}
          onChange={(e) => update(["theme", "radius"], Number(e.target.value))}
        />
      </label>

      <label>
        Buton yüksekliği
        <input
          type="number"
          value={config.buttons.height}
          onChange={(e) => update(["buttons", "height"], Number(e.target.value))}
        />
      </label>

      <label>
        Buton köşe
        <input
          type="number"
          value={config.buttons.radius}
          onChange={(e) => update(["buttons", "radius"], Number(e.target.value))}
        />
      </label>

      <label>
        Buton fontu
        <input
          type="number"
          value={config.buttons.fontSize}
          onChange={(e) => update(["buttons", "fontSize"], Number(e.target.value))}
        />
      </label>
    </div>
  );
}

function MoveControls({ obj, update }) {
  return (
    <div className="move">
      <label>
        X
        <input
          type="range"
          min="-120"
          max="120"
          value={obj.x || 0}
          onChange={(e) => update("x", Number(e.target.value))}
        />
      </label>

      <label>
        Y
        <input
          type="range"
          min="-120"
          max="120"
          value={obj.y || 0}
          onChange={(e) => update("y", Number(e.target.value))}
        />
      </label>
    </div>
  );
}

function PanelInspect({ p, i, update }) {
  if (!p) return null;

  return (
    <>
      <label>
        Başlık
        <textarea
          value={p.title}
          onChange={(e) => update(["panels", i, "title"], e.target.value)}
        />
      </label>

      <label>
        Açıklama
        <textarea
          value={p.text}
          onChange={(e) => update(["panels", i, "text"], e.target.value)}
        />
      </label>

      <label>
        Görünsün
        <input
          type="checkbox"
          checked={p.visible}
          onChange={(e) => update(["panels", i, "visible"], e.target.checked)}
        />
      </label>

      <label>
        Genişlik %
        <input
          type="range"
          min="50"
          max="100"
          value={p.width}
          onChange={(e) => update(["panels", i, "width"], Number(e.target.value))}
        />
      </label>

      <MoveControls obj={p} update={(k, v) => update(["panels", i, k], v)} />
    </>
  );
}

function PanelAnalysis(p) {
  return (
    <section
      className="panel clickable"
      onClick={() => p.admin && p.setSelected("panel-0")}
      style={{
        transform: `translate(${p.panel.x}px,${p.panel.y}px)`,
        width: p.panel.width + "%"
      }}
    >
      <Title icon={<PackageSearch />} title={p.panel.title} text={p.panel.text} />

      <div className="form">
        <Select
          label="Ana Kategori"
          value={p.mainCategory}
          setValue={p.setMainCategory}
          options={p.mainCategories}
        />

        <Select
          label="Alt Kategori"
          value={p.subCategory}
          setValue={p.setSubCategory}
          options={p.subCategories.map((x) => x.sub_category)}
          disabled={!p.mainCategory}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            p.analyze();
          }}
          disabled={p.loading}
        >
          {p.loading ? <Loader2 className="spin" /> : <BarChart3 />} Analiz Et
        </button>
      </div>
    </section>
  );
}

function PanelReg(p) {
  return (
    <section
      className="panel green clickable"
      onClick={() => p.admin && p.setSelected("panel-1")}
      style={{
        transform: `translate(${p.panel.x}px,${p.panel.y}px)`,
        width: p.panel.width + "%"
      }}
    >
      <Title icon={<BookOpen />} title={p.panel.title} text={p.panel.text} />

      <div className="form four">
        <Select
          label="Ülke"
          value={p.regCountry}
          setValue={p.setRegCountry}
          options={p.countries.map((x) => x.country)}
        />

        <Select
          label="Ana Kategori"
          value={p.regMain}
          setValue={p.setRegMain}
          options={p.mainCategories}
        />

        <Select
          label="Alt Kategori"
          value={p.regSub}
          setValue={p.setRegSub}
          options={p.regSubCategories.map((x) => x.sub_category)}
          disabled={!p.regMain}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            p.readReg();
          }}
          disabled={p.regLoading}
        >
          {p.regLoading ? <Loader2 className="spin" /> : <BookOpen />} Mevzuatı Göster
        </button>
      </div>

      {p.regulation && !p.regulation.error && <RegCards r={p.regulation} />}
      {p.regulation?.error && <div className="error">{p.regulation.error}</div>}
    </section>
  );
}

function PanelCost(p) {
  return (
    <section
      className="panel purple clickable"
      onClick={() => p.admin && p.setSelected("panel-2")}
      style={{
        transform: `translate(${p.panel.x}px,${p.panel.y}px)`,
        width: p.panel.width + "%"
      }}
    >
      <Title icon={<Calculator />} title={p.panel.title} text={p.panel.text} />

      <div className="form five">
        <Select
          label="Ülke"
          value={p.costForm.country}
          setValue={(v) => p.setCostForm({ ...p.costForm, country: v })}
          options={p.countries.map((x) => x.country)}
        />

        <Select
          label="Taşıma Yolu"
          value={p.costForm.route_type}
          setValue={(v) => p.setCostForm({ ...p.costForm, route_type: v })}
          options={["Deniz", "Kara", "Hava", "Demiryolu", "Kara + Deniz", "Deniz + Hava"]}
        />

        <Select
          label="Yük Tipi"
          value={p.costForm.container_type}
          setValue={(v) => p.setCostForm({ ...p.costForm, container_type: v })}
          options={[
            "Koli / Parsiyel",
            "Paletli Yük",
            "20' Konteyner",
            "40' Konteyner",
            "Tır Komple",
            "Soğutmalı Konteyner"
          ]}
        />

        <label>
          Yük KG
          <input
            value={p.costForm.weight_kg}
            onChange={(e) => p.setCostForm({ ...p.costForm, weight_kg: e.target.value })}
          />
        </label>

        <button
          onClick={(e) => {
            e.stopPropagation();
            p.calcCost();
          }}
        >
          <Calculator /> Hesapla
        </button>
      </div>

      {p.cost && <Cost c={p.cost} />}
    </section>
  );
}

function Title({ icon, title, text }) {
  return (
    <div className="title">
      {icon}
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Select({ label, value, setValue, options, disabled }) {
  return (
    <label>
      {label}
      <select
        value={value}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">Seçiniz</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function RegCards({ r }) {
  return (
    <div className="grid2">
      <div className="card">
        <h3>Vergi ve Ürün Mevzuatı</h3>
        <p>
          <b>HS:</b> {r.hs_code}
        </p>
        <p>
          <b>Tahmini vergi:</b> %{r.tax_rate_estimate}
        </p>
        <p>{r.product_regulation}</p>
        <p>{r.tax_note}</p>
      </div>

      <div className="card">
        <h3>Gümrük ve Lojistik</h3>
        <p>{r.customs_documents}</p>
        <p>{r.logistics_regulation}</p>
        <p>
          <b>Teşvik:</b> {r.incentive_note}
        </p>
      </div>

      <div className="note">{r.source_note}</div>
    </div>
  );
}

function Cost({ c }) {
  return c.error ? (
    <div className="error">{c.error}</div>
  ) : (
    <div className="cost">
      <h3>Tahmini Lojistik Maliyeti</h3>
      <div className="price">{Number(c.estimated_cost_usd).toLocaleString("tr-TR")} USD</div>
      <p>{c.comment}</p>

      <div className="mini">
        <span>
          Mesafe: <b>{c.distance_km} km</b>
        </span>
        <span>
          Rota: <b>{c.route_type}</b>
        </span>
        <span>
          Yük: <b>{c.weight_kg} kg</b>
        </span>
      </div>
    </div>
  );
}


const countryFlags = {
  Almanya: "🇩🇪",
  ABD: "🇺🇸",
  Fransa: "🇫🇷",
  İngiltere: "🇬🇧",
  Hollanda: "🇳🇱",
  İtalya: "🇮🇹",
  İspanya: "🇪🇸",
  Polonya: "🇵🇱",
  BAE: "🇦🇪",
  "Suudi Arabistan": "🇸🇦",
  Kanada: "🇨🇦",
  İsviçre: "🇨🇭",
  Japonya: "🇯🇵",
  Çin: "🇨🇳",
  "Güney Kore": "🇰🇷",
  Singapur: "🇸🇬",
  Avustralya: "🇦🇺",
  Belçika: "🇧🇪",
  Avusturya: "🇦🇹",
  Çekya: "🇨🇿",
  Romanya: "🇷🇴",
  Bulgaristan: "🇧🇬",
  Yunanistan: "🇬🇷",
  Macaristan: "🇭🇺",
  Portekiz: "🇵🇹"
};

function getFlag(country) {
  return countryFlags[country] || "🌍";
}

function getScoreLevel(score) {
  if (score >= 8) return "Yüksek Uygunluk";
  if (score >= 7) return "Güçlü Potansiyel";
  if (score >= 6) return "Orta Potansiyel";
  return "Dikkatli İncelenmeli";
}

function getRiskLevel(item) {
  const tax = Number(item?.raw_data?.tax_rate_estimate || 0);
  const distance = Number(item?.route?.distance_km_from_turkey || 0);

  if (tax < 6 && distance < 3000) return "Düşük Risk";
  if (tax < 8.5 && distance < 7000) return "Orta Risk";
  return "Yüksek Kontrol Gerektirir";
}

function DetailedAiComment({ a, best }) {
  if (!best) return null;

  const scores = best.scores || {};
  const risk = getRiskLevel(best);

  return (
    <div className="ai-detail-grid">
      <div className="ai-detail-card">
        <h3>Neden {best.country}?</h3>
        <p>
          {a.sub_category} ürünü için {best.country} pazarı, genel uygunluk skoru
          {best.market_score}/10 olduğu için sistem tarafından ilk sırada önerilmiştir.
          Bu skor; talep potansiyeli, lojistik erişilebilirlik, pazar erişimi, teşvik,
          vergi avantajı ve ödeme güvenilirliği göstergelerinin birlikte değerlendirilmesiyle oluşur.
        </p>
      </div>

      <div className="ai-detail-card">
        <h3>Güçlü Taraflar</h3>
        <p>
          Talep skoru {scores.talep}/10, lojistik skoru {scores.lojistik_maliyet}/10
          ve pazar erişimi {scores.pazar_erisimi}/10 olarak hesaplanmıştır. Bu değerler,
          ürünün hedef pazarda araştırmaya değer bir ticari potansiyele sahip olduğunu gösterir.
        </p>
      </div>

      <div className="ai-detail-card">
        <h3>Dikkat Edilmesi Gerekenler</h3>
        <p>
          Tahmini vergi oranı %{best.raw_data.tax_rate_estimate} ve rota tipi
          {best.route.route_type} olarak görünmektedir. Risk seviyesi: {risk}.
          Nihai karar öncesinde GTİP kodu, ürün standardı, ithalat vergisi ve lojistik teklifleri
          güncel resmi kaynaklardan kontrol edilmelidir.
        </p>
      </div>

      <div className="ai-detail-card">
        <h3>İlk Aksiyon Önerisi</h3>
        <p>
          İlk adımda {best.country} için rakip fiyatları, pazar yerleri, B2B alıcı listeleri
          ve ürün sertifikasyon şartları incelenmelidir. Ardından en az iki lojistik firmasından
          navlun teklifi alınarak maliyet doğrulaması yapılmalıdır.
        </p>
      </div>
    </div>
  );
}

function Results({ a, best, downloadReportPdf }) {
  const totalCountries = a.results?.length || 0;
  const topThree = a.results?.slice(0, 3) || [];
  const bestScorePercent = best ? Math.round(best.market_score * 10) : 0;

  return (
    <section className="report-area pro-results">
      <div className="analysis-header pro-analysis-header">
        <div>
          <span className="section-kicker">Analiz Sonucu</span>
          <h2>Ürün Pazarı İnceleme Dashboard’u</h2>
          <p>
            Seçilen ürün için en uygun hedef pazar, skor kırılımları, lojistik rota,
            vergi etkisi ve ihracat yol haritası ayrı bölümler halinde analiz edilmiştir.
          </p>
        </div>
      </div>

      {best && (
        <div className="best-market-hero">
          <div className="best-market-left">
            <span className="best-label">En uygun hedef pazar</span>
            <h2>
              <span>{getFlag(best.country)}</span> {best.country}
            </h2>
            <p>
              {a.main_category} / {a.sub_category} ürünü için sistemin önerdiği
              en güçlü ihracat pazarı.
            </p>
            <div className="best-tags">
              <span>{getScoreLevel(best.market_score)}</span>
              <span>{getRiskLevel(best)}</span>
              <span>{best.route.route_type}</span>
            </div>
          </div>

          <div className="score-ring-card">
            <div
              className="score-ring"
              style={{
                background: `conic-gradient(var(--blue) ${bestScorePercent}%, #e5e7eb ${bestScorePercent}% 100%)`
              }}
            >
              <div>
                <strong>{bestScorePercent}%</strong>
                <small>Uygunluk</small>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="metric-dashboard">
        <div className="metric-card">
          <TrendingUp />
          <p>Talep Skoru</p>
          <h3>{best?.scores?.talep}/10</h3>
          <small>Ürün talep potansiyeli</small>
        </div>

        <div className="metric-card">
          <Route />
          <p>Lojistik</p>
          <h3>{best?.scores?.lojistik_maliyet}/10</h3>
          <small>{best?.route?.distance_km_from_turkey} km / {best?.route?.route_type}</small>
        </div>

        <div className="metric-card">
          <Landmark />
          <p>Vergi Avantajı</p>
          <h3>{best?.scores?.vergi_avantaji}/10</h3>
          <small>Tahmini vergi: %{best?.raw_data?.tax_rate_estimate}</small>
        </div>

        <div className="metric-card">
          <ShieldCheck />
          <p>Risk Seviyesi</p>
          <h3>{best ? getRiskLevel(best) : "-"}</h3>
          <small>Vergi + mesafe + rota etkisi</small>
        </div>
      </div>

      <div className="result-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">01</span>
            <h2>Detaylı Yapay Zekâ Yorumu</h2>
            <p>
              Sistem yalnızca skor üretmez; skorun hangi nedenlerle oluştuğunu
              ve ihracatçı için ne anlama geldiğini açıklar.
            </p>
          </div>
        </div>

        <DetailedAiComment a={a} best={best} />
      </div>

      <div className="result-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">02</span>
            <h2>İlk 3 Hedef Pazar</h2>
          </div>
        </div>

        <div className="top-market-grid">
          {topThree.map((x, i) => (
            <div className="top-market-card pro-top-card" key={x.country}>
              <span>#{i + 1}</span>
              <h3>{getFlag(x.country)} {x.country}</h3>
              <p>{x.region}</p>
              <b>{x.market_score}/10</b>
              <small>{x.route.route_type} / {x.route.distance_km_from_turkey} km</small>
            </div>
          ))}
        </div>
      </div>

      <div className="result-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">03</span>
            <h2>Skor Kırılım Grafiği</h2>
            <p>En uygun ülkenin hangi başlıklarda güçlü olduğu aşağıda gösterilir.</p>
          </div>
        </div>

        {best && (
          <div className="score-chart">
            {Object.entries(best.scores).map(([key, value]) => (
              <div className="chart-row" key={key}>
                <span>{key.replaceAll("_", " ")}</span>
                <div>
                  <i style={{ width: `${value * 10}%` }} />
                </div>
                <b>{value}/10</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="result-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">04</span>
            <h2>Ülke Puan Detayları</h2>
            <p>Her ülkenin neden o puanı aldığı aşağıdaki kartlarda ayrı ayrı gösterilir.</p>
          </div>
        </div>

        <div className="country-grid clean-country-grid">
          {a.results.map((x, i) => (
            <Country key={x.country} x={x} i={i} />
          ))}
        </div>
      </div>

      <div className="result-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">05</span>
            <h2>{a.best_country} İçin Yol Haritası</h2>
          </div>
        </div>

        <div className="roadmap clean-roadmap">
          <ol>
            {a.roadmap.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="download-report-box">
        <div>
          <h2>Raporu inceledin mi?</h2>
          <p>
            Ülke puanlarını, hedef pazar özetini ve yol haritasını inceledikten sonra
            raporu PDF olarak indirebilirsin.
          </p>
        </div>

        <button onClick={downloadReportPdf}>
          <FileDown /> PDF Olarak İndir
        </button>
      </div>
    </section>
  );
}

function Country({ x, i }) {
  return (
    <div className="card pro-country-card">
      <div className="cardtop">
        <h3>
          #{i + 1} {getFlag(x.country)} {x.country}
        </h3>
        <b>{x.market_score}/10</b>
      </div>

      <div className="country-meta">
        <span>{x.region}</span>
        <span>{x.route.route_type}</span>
        <span>{x.route.distance_km_from_turkey} km</span>
      </div>

      {Object.entries(x.scores).map(([k, v]) => (
        <div className="score" key={k}>
          <span>
            {k.replaceAll("_", " ")}: {v}/10
          </span>
          <div>
            <i style={{ width: `${v * 10}%` }} />
          </div>
        </div>
      ))}

      <p>{x.reason}</p>
    </div>
  );
}

function Directory({ page, data, loading, setPage }) {
  return (
    <section className="directory">
      <button onClick={() => setPage("home")}>← Ana sayfaya dön</button>
      <h1>{page.toUpperCase()}</h1>

      {loading && <p>Yükleniyor...</p>}
      {data?.items && <Table rows={data.items} />}
    </section>
  );
}

function Table({ rows }) {
  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            {Object.keys(rows[0] || {}).map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((v, j) => (
                <td key={j}>{String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
