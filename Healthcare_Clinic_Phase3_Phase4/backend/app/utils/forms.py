"""Extract only explicitly allowed form fields; never pass CSRF or submit to domain code."""
def data_for(form, names):
    values = {}
    for name in names.split():
        value = getattr(form, name).data
        if isinstance(value, str):
            value = value.strip()
        values[name] = value
    return values
