from Crypto.Cipher import DES

def encrypt(data: bytes) -> bytes:
    # CWE-326: Inadequate Encryption Strength (DES)
    cipher = DES.new(b'8bytekey', DES.MODE_ECB)
    return cipher.encrypt(data)
