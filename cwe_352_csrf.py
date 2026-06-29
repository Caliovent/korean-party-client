from flask import Flask, request

app = Flask(__name__)

@app.route('/transfer', methods=['POST'])
def transfer():
    # CWE-352: CSRF - no CSRF token validation
    amount = request.form.get('amount')
    return f"Transferred {amount}"
