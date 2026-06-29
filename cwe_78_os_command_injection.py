import os

def run():
    user_input = input("Enter command: ")
    os.system(user_input)  # CWE-78: OS Command Injection

if __name__ == "__main__":
    run()
