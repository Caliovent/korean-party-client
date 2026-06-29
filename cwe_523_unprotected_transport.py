import requests

def send_credentials():
    # CWE-523: Unprotected Transport of Credentials
    res1 = requests.post("http://example.com/login", auth=("admin", "secret"))
    
    res2 = requests.post(
        "https://example.com/login", 
        auth=("admin", "secret"), 
        verify=False  # CWE-295: Improper Certificate Validation
    )
    
    return res1