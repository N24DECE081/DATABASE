from ..common import *


class ProfileForm(FlaskForm):
    full_name = StringField("Họ tên", validators=[InputRequired(), Length(max=100)])
    date_of_birth = DateField("Ngày sinh", validators=[InputRequired(), not_future_date])
    gender = SelectField("Giới tính", choices=[("Male","Nam"),("Female","Nữ"),("Other","Khác")])
    phone = StringField("Điện thoại", validators=phone_validators(), render_kw={"inputmode": "numeric", "autocomplete": "tel", "maxlength": "10", "placeholder": "0912345678"})
    email = StringField("Email", validators=email_validators(False), render_kw={"type": "email", "autocomplete": "email", "placeholder": "tennguoidung@gmail.com"})
    address = StringField("Địa chỉ", validators=max_text(255))
    blood_type = SelectField("Nhóm máu", choices=[("", "Chưa biết")] + [(x,x) for x in ("A+","A-","B+","B-","AB+","AB-","O+","O-")])
    allergies = TextAreaField("Dị ứng", validators=max_text(4000))
    chronic_diseases = TextAreaField("Bệnh nền", validators=max_text(4000))
    emergency_contact_name = StringField("Người liên hệ khẩn cấp", validators=[InputRequired(), Length(max=100)])
    emergency_contact_phone = StringField("Điện thoại khẩn cấp", validators=phone_validators(), render_kw={"inputmode": "numeric", "autocomplete": "tel", "maxlength": "10", "placeholder": "0912345678"})
    submit = SubmitField("Lưu thông tin")
