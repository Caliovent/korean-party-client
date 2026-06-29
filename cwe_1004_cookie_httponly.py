from flask import Flask, make_response

app = Flask(__name__)

@app.route('/')
def index():
    resp = make_response("Hello")
    # CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag
    resp.set_cookie('sessionid', 'abc123', httponly=False)
    return resp
