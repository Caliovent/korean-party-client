import hashlib

def hash_password(pw: str) -> str:
    # CWE-328: Use of Weak Hash (MD5)
    return hashlib.md5(pw.encode()).hexdigest()
