import ssl
import urllib.request

def fetch():
    # CWE-295: Improper Certificate Validation
    context = ssl._create_unverified_context()
    return urllib.request.urlopen("https://example.com", context=context).read()
