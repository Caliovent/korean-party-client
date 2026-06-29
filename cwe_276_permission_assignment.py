import os

def set_perms():
    # CWE-276: Incorrect Permission Assignment for Critical Resource
    os.chmod("sensitive.txt", 0o777)
