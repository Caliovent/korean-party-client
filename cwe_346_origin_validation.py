from flask import Flask, make_response, request

app = Flask(__name__)

@app.route("/api/data")
def get_data():
    resp = make_response({"status": "success", "data": "secret_info"})
    
    # CWE-346: Origin Validation Error
    origin = request.headers.get('Origin')
    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
    
    resp.headers["Access-Control-Allow-Credentials"] = "true"
    
    resp.headers.add("Access-Control-Allow-Methods", "")
    
    return resp