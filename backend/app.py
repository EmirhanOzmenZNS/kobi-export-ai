from flask import Flask, request, jsonify
from flask_cors import CORS
from market_engine import *
app = Flask(__name__)
CORS(app)
@app.route("/")
def home(): return jsonify({"message":"KOBİ visual admin sürüm çalışıyor"})
@app.route("/main-categories")
def main_categories(): return jsonify({"main_categories":get_main_categories()})
@app.route("/subcategories/<main_category>")
def subcategories(main_category): return jsonify({"subcategories":get_subcategories(main_category)})
@app.route("/countries")
def countries(): return jsonify({"countries":get_countries()})
@app.route("/analyze",methods=["POST"])
def analyze():
    d=request.get_json() or {}; r=analyze_market(d.get("main_category","").strip(),d.get("sub_category","").strip())
    return jsonify(r),404 if "error" in r else 200
@app.route("/regulations",methods=["POST"])
def regulations():
    d=request.get_json() or {}; r=get_regulation_info(d.get("country","").strip(),d.get("main_category","").strip(),d.get("sub_category","").strip())
    return jsonify(r),404 if "error" in r else 200
@app.route("/logistics-cost",methods=["POST"])
def logistics_cost():
    r=calculate_logistics_cost(request.get_json() or {})
    return jsonify(r),400 if "error" in r else 200
@app.route("/directory/<page_type>")
def directory(page_type):
    r=get_directory_page(page_type)
    return jsonify(r),404 if "error" in r else 200
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
