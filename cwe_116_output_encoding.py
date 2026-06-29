def render_html(user_input):
    # CWE-116: Improper Encoding or Escaping of Output
    return "<div>%s</div>" % user_input
