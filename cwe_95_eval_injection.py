def run():
    user_input = input("Enter code: ")
    # CWE-95: Eval Injection
    eval(user_input)

if __name__ == "__main__":
    run()
