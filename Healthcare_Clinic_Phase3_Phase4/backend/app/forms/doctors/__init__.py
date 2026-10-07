from ..common import *


class DoctorForm(FlaskForm):
    full_name = StringField("Họ tên", validators=[InputRequired(), Length(max=100)])
    phone = StringField("Điện thoại", validators=[InputRequired(), Length(max=15)])
    email = StringField("Email", validators=[InputRequired(), Length(max=100)])
    license_number = StringField("Giấy phép bác sĩ", validators=[InputRequired(), Length(max=50)])
    submit = SubmitField("Lưu thông tin bác sĩ")
