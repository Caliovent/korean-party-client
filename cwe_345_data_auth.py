import jwt

def decode_token(encoded: str, key: str):
    # CWE-345 & CWE-347 (Improper Verification of Crypto Signature)
    decoded_unsafe = jwt.decode(encoded, key, options={"verify_signature": False})
    
    decoded_none = jwt.decode(encoded, algorithms=["none", "HS256"])
    
    return decoded_unsafe