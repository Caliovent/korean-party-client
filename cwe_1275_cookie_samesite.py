from flask import Flask, make_response

app = Flask(__name__)

@app.route('/')
def index():
    resp = make_response("Hello")
    # CWE-1275: Sensitive Cookie Without 'SameSite' Attribute
    resp.set_cookie('sessionid', 'abc123', samesite=None)
    return resp
