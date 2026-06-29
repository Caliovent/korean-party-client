import random
from flask import Flask, render_template, make_response

app = Flask(__name__)

@app.route('/')
def generate_token():
    # CWE-338: Use of Cryptographically Weak PRNG
    # L'utilisation de random.random() n'est pas sécurisée pour des tokens
    rand = str(random.random())

    # Simulation d'un rendu de template
    # Assurez-vous d'avoir un fichier 'foo.html' dans un dossier /templates
    resp = make_response("Rendu du template foo.html") 

    # Configuration du cookie avec la valeur vulnérable
    resp.set_cookie('UID', rand, samesite="Strict")
    
    return rand

if __name__ == "__main__":
    app.run(debug=True)