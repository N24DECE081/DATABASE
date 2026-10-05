"""Resource filters; callers supply internal aliases, never request identifiers."""
def appointment_filter(user, alias="a"):
    if alias not in ("a", "v"):
        raise ValueError("Unsupported SQL alias")
    if user.role == "PATIENT":
        return f"{alias}.patient_id IN (SELECT patient_id FROM patient WHERE user_id = %s)", (user.user_id,)
    if user.role == "DOCTOR":
        return f"{alias}.doctor_id IN (SELECT doctor_id FROM doctor WHERE user_id = %s)", (user.user_id,)
    if user.role == "ADMIN":
        return "1=1", ()
    raise ValueError("Unknown baseline role")
