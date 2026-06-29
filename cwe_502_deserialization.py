import pickle

def load_data():
    data = input("Enter data: ")
    # CWE-502: Deserialization of Untrusted Data
    return pickle.loads(data)
