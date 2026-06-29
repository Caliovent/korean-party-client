from flask import Flask, make_response

app = Flask(__name__)

@app.route('/')
def index():
    resp = make_response("Hello")
    # CWE-614: Sensitive Cookie Without 'Secure' Attribute
    resp.set_cookie('sessionid', 'abc123')
    return resp
