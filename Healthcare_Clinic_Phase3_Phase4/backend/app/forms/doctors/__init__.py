from ..common import *


class DoctorForm(FlaskForm):
    full_name = StringField("Họ tên", validators=[InputRequired(), Length(max=100)])
    phone = StringField("Điện thoại", validators=phone_validators(), render_kw={"inputmode": "numeric", "autocomplete": "tel", "maxlength": "10", "placeholder": "0912345678"})
    email = StringField("Email", validators=email_validators(), render_kw={"type": "email", "autocomplete": "email", "placeholder": "tennguoidung@gmail.com"})
    license_number = StringField("Giấy phép bác sĩ", validators=[InputRequired(), Length(max=50)])
    submit = SubmitField("Lưu thông tin bác sĩ")
